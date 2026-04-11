'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Globe,
  HardDrive,
  Link2,
  MapPin,
  Monitor,
  Rocket,
  Server,
  ShieldCheck,
  Users,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting';
import { toast } from 'sonner';
import type { Domain, VPSPlan, Website } from '@/lib/types';

const STEPS = [
  { id: 1, label: 'Client', icon: Users },
  { id: 2, label: 'Target', icon: Link2 },
  { id: 3, label: 'Plan', icon: HardDrive },
  { id: 4, label: 'OS', icon: Monitor },
  { id: 5, label: 'Panel', icon: ShieldCheck },
  { id: 6, label: 'Billing', icon: Zap },
];

type TargetType = 'domain' | 'website';
type BillingCycle = 'monthly' | 'yearly';

type PanelId = 'bare-metal' | 'cpanel' | 'cyberpanel' | 'plesk' | 'hestiacp' | 'directadmin' | 'webmin';

type PanelOption = {
  id: PanelId;
  label: string;
  description: string;
  compatibleOs: string[];
};

const PLAN_SPECS_FALLBACK: Record<string, { cpu: number; ram: number; storage: number }> = {
  'KVM 1': { cpu: 1, ram: 4, storage: 50 },
  'KVM 2': { cpu: 2, ram: 8, storage: 100 },
  'KVM 4': { cpu: 4, ram: 16, storage: 200 },
  'KVM 8': { cpu: 8, ram: 32, storage: 400 },
};

const OS_OPTIONS = [
  { label: 'Ubuntu 22.04', icon: Globe, hint: 'Best for Plesk, HestiaCP, CyberPanel' },
  { label: 'Ubuntu 24.04', icon: Globe, hint: 'Modern Ubuntu baseline for panels and apps' },
  { label: 'Debian 12', icon: Server, hint: 'Stable base for Plesk and Webmin' },
  { label: 'AlmaLinux 8', icon: ShieldCheck, hint: 'Best fit for cPanel, CyberPanel, DirectAdmin' },
  { label: 'AlmaLinux 9', icon: ShieldCheck, hint: 'Current RHEL-compatible panel stack' },
  { label: 'CentOS 7', icon: Server, hint: 'Legacy panel stack, use only if required' },
];

const PANEL_LIBRARY: PanelOption[] = [
  { id: 'bare-metal', label: 'Bare Metal / No Panel', description: 'Plain VPS for custom stack, Docker, or manual setup', compatibleOs: ['Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'AlmaLinux 8', 'AlmaLinux 9', 'CentOS 7'] },
  { id: 'cyberpanel', label: 'CyberPanel', description: 'LiteSpeed-friendly panel for web/email workloads', compatibleOs: ['Ubuntu 22.04', 'Ubuntu 24.04', 'AlmaLinux 8', 'AlmaLinux 9'] },
  { id: 'cpanel', label: 'cPanel', description: 'Traditional hosting panel for AlmaLinux / cloud Linux', compatibleOs: ['AlmaLinux 8', 'AlmaLinux 9', 'CentOS 7'] },
  { id: 'plesk', label: 'Plesk', description: 'Flexible commercial panel for Linux deployments', compatibleOs: ['Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'AlmaLinux 8', 'AlmaLinux 9'] },
  { id: 'hestiacp', label: 'HestiaCP', description: 'Lightweight open-source control panel', compatibleOs: ['Ubuntu 22.04', 'Ubuntu 24.04'] },
  { id: 'directadmin', label: 'DirectAdmin', description: 'Fast and lightweight management panel', compatibleOs: ['Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'AlmaLinux 8', 'AlmaLinux 9', 'CentOS 7'] },
  { id: 'webmin', label: 'Webmin / Virtualmin', description: 'Advanced admin stack for custom server control', compatibleOs: ['Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12', 'AlmaLinux 8', 'AlmaLinux 9'] },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = current > step.id;
        const active = current === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                  done ? 'bg-primary border-primary text-primary-foreground' :
                  active ? 'border-primary text-primary bg-primary/10' :
                  'border-muted-foreground/30 text-muted-foreground/40',
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium text-center leading-tight hidden sm:block',
                  active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground/50',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mx-2 transition-colors',
                  current > step.id ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{msg}</p>;
}

function monthlyFromPlan(planName: string, plans: VPSPlan[]): number {
  return plans.find((plan) => plan.name === planName)?.price ?? 0;
}

function priceForCycle(monthly: number, cycle: BillingCycle): number {
  if (cycle === 'monthly') return Math.round(monthly * 100) / 100;
  return Math.round(monthly * 10 * 100) / 100;
}

function specsForPlan(planName: string, plans: VPSPlan[]) {
  const plan = plans.find((entry) => entry.name === planName);
  if (plan) return { cpu: plan.cpu, ram: plan.ram, storage: plan.storage };
  return PLAN_SPECS_FALLBACK[planName] ?? { cpu: 1, ram: 4, storage: 50 };
}

function getPanelOptions(os: string): PanelOption[] {
  return PANEL_LIBRARY.filter((panel) => panel.compatibleOs.includes(os));
}

function getDefaultPanel(os: string): PanelId {
  return getPanelOptions(os)[0]?.id ?? 'bare-metal';
}

function buildTargetLabel(targetType: TargetType, domain?: Domain, website?: Website) {
  if (targetType === 'domain') {
    return domain ? `${domain.name}${domain.tld}` : '';
  }
  return website ? `${website.name} (${website.domain})` : '';
}

function AddVpsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients = [], domains = [], websites = [], vpsPlans = [], addVPS, currentCompany } = useInvoiceData();
  const planOptions = useMemo(() => {
    if (vpsPlans.length > 0) return vpsPlans.map((plan) => plan.name);
    return Object.keys(PLAN_SPECS_FALLBACK);
  }, [vpsPlans]);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    clientId: '',
    name: '',
    targetType: 'domain' as TargetType,
    targetId: '',
    planName: planOptions[0] || 'KVM 1',
    billingCycle: 'monthly' as BillingCycle,
    location: 'Europe',
    os: 'Ubuntu 22.04',
    panel: getDefaultPanel('Ubuntu 22.04'),
    ip: '',
    price: '',
  });
  const [cpu, setCpu] = useState(1);
  const [ram, setRam] = useState(4);
  const [storage, setStorage] = useState(50);

  useEffect(() => {
    const cid = searchParams.get('clientId');
    if (!cid || !clients.some((c) => c.id === cid)) return;
    setForm((prev) => (prev.clientId === cid ? prev : { ...prev, clientId: cid, targetId: '' }));
  }, [searchParams, clients]);

  useEffect(() => {
    const nextPlan = planOptions.includes(form.planName) ? form.planName : planOptions[0] || 'KVM 1';
    const specs = specsForPlan(nextPlan, vpsPlans);
    const monthly = monthlyFromPlan(nextPlan, vpsPlans);

    setCpu(specs.cpu);
    setRam(specs.ram);
    setStorage(specs.storage);
    setForm((prev) => ({
      ...prev,
      planName: nextPlan,
      price: String(priceForCycle(monthly, prev.billingCycle)),
      panel: getPanelOptions(prev.os).some((panel) => panel.id === prev.panel) ? prev.panel : getDefaultPanel(prev.os),
    }));
  }, [planOptions, vpsPlans]);

  useEffect(() => {
    const panelOptions = getPanelOptions(form.os);
    if (!panelOptions.some((panel) => panel.id === form.panel)) {
      setForm((prev) => ({ ...prev, panel: getDefaultPanel(form.os) }));
    }
  }, [form.os, form.panel]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId],
  );

  const clientDomains = useMemo(
    () => domains.filter((domain) => !form.clientId || domain.clientId === form.clientId),
    [domains, form.clientId],
  );

  const clientWebsites = useMemo(
    () => websites.filter((website) => !form.clientId || website.clientId === form.clientId),
    [websites, form.clientId],
  );

  const selectedDomain = useMemo(
    () => clientDomains.find((domain) => domain.id === form.targetId) ?? null,
    [clientDomains, form.targetId],
  );

  const selectedWebsite = useMemo(
    () => clientWebsites.find((website) => website.id === form.targetId) ?? null,
    [clientWebsites, form.targetId],
  );

  const selectedPlan = useMemo(
    () => vpsPlans.find((plan) => plan.name === form.planName) ?? null,
    [form.planName, vpsPlans],
  );

  const targetLabel = buildTargetLabel(form.targetType, selectedDomain ?? undefined, selectedWebsite ?? undefined);
  const compatiblePanels = getPanelOptions(form.os);

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const selectPlan = (planName: string) => {
    const specs = specsForPlan(planName, vpsPlans);
    const monthly = monthlyFromPlan(planName, vpsPlans);
    setForm((prev) => ({ ...prev, planName, price: String(priceForCycle(monthly, prev.billingCycle)) }));
    setCpu(specs.cpu);
    setRam(specs.ram);
    setStorage(specs.storage);
  };

  const validate = (currentStep: number) => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.clientId) nextErrors.clientId = 'Please select a client';
      if (!form.name.trim()) nextErrors.name = 'VPS name is required';
    }

    if (currentStep === 2 && !form.targetId) {
      nextErrors.targetId = `Please select a ${form.targetType}`;
    }

    if (currentStep === 3 && !form.planName) {
      nextErrors.planName = 'Please select a VPS plan';
    }

    if (currentStep === 4 && !form.os) {
      nextErrors.os = 'Please choose an operating system';
    }

    if (currentStep === 5 && !form.panel) {
      nextErrors.panel = 'Please select a control panel';
    }

    if (currentStep === 6) {
      const parsedPrice = parseFloat(form.price.replace(',', '.'));
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        nextErrors.price = 'Please enter a valid price';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validate(step)) setStep((current) => Math.min(current + 1, 6));
  };

  const back = () => setStep((current) => Math.max(current - 1, 1));

  const submit = () => {
    if (!validate(6) || !selectedClient) return;

    setIsSubmitting(true);
    try {
      addVPS({
        name: form.name.trim(),
        clientId: form.clientId,
        planName: form.planName,
        cpu,
        ram,
        storage,
        price: parseFloat(form.price.replace(',', '.')),
        billingCycle: form.billingCycle,
        status: 'active',
        companyId: currentCompany.id,
        notes: [
          `TargetType: ${form.targetType}`,
          `Target: ${targetLabel || 'Unlinked'}`,
          `Panel: ${compatiblePanels.find((panel) => panel.id === form.panel)?.label || form.panel}`,
          `OS: ${form.os}`,
          `Location: ${form.location}`,
          form.ip.trim() ? `IP: ${form.ip.trim()}` : null,
        ].filter(Boolean).join('; '),
      });

      toast.success('VPS created successfully.');
      router.push('/dashboard/vps');
    } catch {
      toast.error('Failed to create VPS');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = STEPS.find((item) => item.id === step);

  return (
    <div className="space-y-6 pb-10">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/vps" className="hover:text-foreground transition-colors">
          VPS Overview
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Add VPS</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add VPS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deploy a VPS, attach it to a domain or website, and pick the panel that matches the server stack.
        </p>
      </div>

      <div className="space-y-6">
        <StepIndicator current={step} />

        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold">{currentStep?.label}</h2>
            <p className="text-muted-foreground text-sm mt-1">Step {step} of {STEPS.length}</p>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Select Client *</Label>
                <div className="mt-2 max-h-72 overflow-y-auto pr-1 space-y-2">
                  {clients.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No clients found. Create one first.</p>
                  )}
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => set('clientId', client.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        form.clientId === client.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                      </div>
                      {form.clientId === client.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
                <FieldError msg={errors.clientId} />
              </div>

              <div>
                <Label htmlFor="vps-name">VPS Name *</Label>
                <Input id="vps-name" className="mt-1.5" placeholder="e.g. production-vps-01" value={form.name} onChange={(event) => set('name', event.target.value)} />
                <FieldError msg={errors.name} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'domain', label: 'Domain' },
                  { id: 'website', label: 'Website' },
                ] as const).map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={form.targetType === item.id ? 'default' : 'outline'}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, targetType: item.id, targetId: '' }));
                      setErrors((prev) => ({ ...prev, targetId: '' }));
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {form.targetType === 'domain' && (
                  <>
                    {clientDomains.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No domains found for the selected client.</p>
                    )}
                    {clientDomains.map((domain) => (
                      <button
                        key={domain.id}
                        type="button"
                        onClick={() => set('targetId', domain.id)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                          form.targetId === domain.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                        )}
                      >
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{domain.name}{domain.tld}</p>
                          <p className="text-xs text-muted-foreground">Registrar: {domain.registrar}</p>
                        </div>
                        {form.targetId === domain.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                      </button>
                    ))}
                  </>
                )}

                {form.targetType === 'website' && (
                  <>
                    {clientWebsites.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No websites found for the selected client.</p>
                    )}
                    {clientWebsites.map((website) => (
                      <button
                        key={website.id}
                        type="button"
                        onClick={() => set('targetId', website.id)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                          form.targetId === website.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                        )}
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Monitor className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{website.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{website.domain} • {website.type}</p>
                        </div>
                        {form.targetId === website.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <FieldError msg={errors.targetId} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planOptions.map((planName) => {
                  const plan = vpsPlans.find((entry) => entry.name === planName);
                  const selected = form.planName === planName;
                  const monthly = plan ? plan.price : 0;
                  const specs = specsForPlan(planName, vpsPlans);
                  return (
                    <button
                      key={planName}
                      type="button"
                      onClick={() => selectPlan(planName)}
                      className={cn(
                        'rounded-xl border-2 p-4 text-left transition-all',
                        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm">{planName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{specs.cpu} vCPU • {specs.ram} GB RAM • {specs.storage} GB NVMe</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-lg text-primary leading-none">{formatCurrency(monthly)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">/mo</p>
                        </div>
                      </div>
                      {selected && <Badge className="mt-3">Selected</Badge>}
                    </button>
                  );
                })}
              </div>
              <FieldError msg={errors.planName} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {OS_OPTIONS.map((osOption) => {
                  const Icon = osOption.icon;
                  const selected = form.os === osOption.label;
                  return (
                    <button
                      key={osOption.label}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, os: osOption.label, panel: getDefaultPanel(osOption.label) }))}
                      className={cn(
                        'rounded-xl border-2 p-4 text-left transition-all',
                        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/40',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-sm">{osOption.label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{osOption.hint}</p>
                      {selected && <Badge className="mt-3">Selected</Badge>}
                    </button>
                  );
                })}
              </div>
              <FieldError msg={errors.os} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <Label>Control Panel *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {compatiblePanels.map((panel) => {
                    const selected = form.panel === panel.id;
                    return (
                      <button
                        key={panel.id}
                        type="button"
                        onClick={() => set('panel', panel.id)}
                        className={cn(
                          'rounded-xl border-2 p-4 text-left transition-all',
                          selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/40',
                        )}
                      >
                        <p className="font-semibold text-sm">{panel.label}</p>
                        <p className="text-xs text-muted-foreground mt-2">{panel.description}</p>
                        {selected && <Badge className="mt-3">Compatible</Badge>}
                      </button>
                    );
                  })}
                </div>
                <FieldError msg={errors.panel} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Select value={form.location} onValueChange={(value) => set('location', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe">Europe</SelectItem>
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="Asia">Asia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ip">Public IP</Label>
                  <Input
                    id="ip"
                    className="mt-1.5"
                    placeholder="Optional public IP"
                    value={form.ip}
                    onChange={(event) => set('ip', event.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div>
                <Label>Billing Cycle</Label>
                <Select
                  value={form.billingCycle}
                  onValueChange={(value) => {
                    const nextCycle = value as BillingCycle;
                    const monthly = monthlyFromPlan(form.planName, vpsPlans);
                    setForm((prev) => ({ ...prev, billingCycle: nextCycle, price: String(priceForCycle(monthly, nextCycle)) }));
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  className="mt-1.5"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => set('price', event.target.value)}
                />
                <FieldError msg={errors.price} />
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Client</span><span className="font-medium">{selectedClient?.name || '—'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Target</span><span className="font-medium">{targetLabel || '—'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Plan</span><span className="font-medium">{selectedPlan?.name || form.planName}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">OS</span><span className="font-medium">{form.os}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Panel</span><span className="font-medium">{compatiblePanels.find((panel) => panel.id === form.panel)?.label || form.panel}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">CPU / RAM / Storage</span><span className="font-medium">{cpu} vCPU / {ram} GB / {storage} GB</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Price</span><span className="font-medium">{formatCurrency(parseFloat(form.price || '0'))} / {form.billingCycle}</span></div>
              </div>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/60 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                The target and panel are stored with the VPS notes so they stay attached in the current data model.
              </div>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => step === 1 ? router.back() : back()} disabled={isSubmitting}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex gap-2">
            {step < 6 ? (
              <Button onClick={next}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create VPS'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddVpsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground text-sm text-center">Loading…</div>}>
      <AddVpsPageInner />
    </Suspense>
  );
}
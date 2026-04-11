'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor, Users, Globe, HardDrive, Server, Mail, CreditCard,
  CheckCircle2, ChevronRight, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatting';
import type { WebsiteBillingCycle } from '@/lib/types';
import { WEBSITE_TYPE_OPTIONS } from '@/lib/website-type-options';

function planPriceForCycle(
  plan: { price: { monthly: number; yearly: number } },
  cycle: WebsiteBillingCycle,
): number {
  if (cycle === 'yearly' || cycle === 'onetime') return plan.price.yearly;
  return plan.price.monthly;
}

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Website Info', icon: Monitor },
  { id: 2, label: 'Client', icon: Users },
  { id: 3, label: 'Domain', icon: Globe },
  { id: 4, label: 'Infrastructure', icon: HardDrive },
  { id: 5, label: 'Linked Email', icon: Mail },
  { id: 6, label: 'Plan & Billing', icon: CreditCard },
  { id: 7, label: 'Confirm', icon: CheckCircle2 },
];

// ─── Form Data ────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  domain: string;
  domainId: string; // Internal ID if linked
  type: 'wordpress' | 'node' | 'php' | 'html';
  clientId: string;
  infraType: 'hosting' | 'vps' | '';
  hostingId: string;
  vpsId: string;
  emailIds: string[];
  planName: string;
  price: string;
  billingCycle: WebsiteBillingCycle;
  status: 'active' | 'inactive' | 'suspended';
  storage: number;
  bandwidth: number;
  selectedCompanyId: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  domain: '',
  domainId: '',
  type: 'wordpress',
  clientId: '',
  infraType: '',
  hostingId: '',
  vpsId: '',
  emailIds: [],
  planName: 'Professional',
  price: '19.99',
  billingCycle: 'monthly',
  status: 'active',
  storage: 50,
  bandwidth: 100,
  selectedCompanyId: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                done ? 'bg-primary border-primary text-primary-foreground' :
                active ? 'border-primary text-primary bg-primary/10' :
                'border-muted-foreground/30 text-muted-foreground/40',
              )}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn(
                'text-[10px] font-medium text-center leading-tight hidden sm:block',
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground/50',
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-px flex-1 mx-2 transition-colors',
                current > step.id ? 'bg-primary' : 'bg-muted-foreground/20',
              )} />
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

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export interface CreateWebsiteWizardProps {
  initialType?: string;
  /** Pre-select client when opening from a client profile deep link. */
  initialClientId?: string;
}

export function CreateWebsiteWizard({ initialType, initialClientId }: CreateWebsiteWizardProps) {
  const router = useRouter();
  const { clients, domains = [], hosting, vps, emails, addWebsite, hostingPlans = [], cloudHostingPlans = [], allCompanies = [], currentCompany } = useInvoiceData();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    ...INITIAL_FORM,
    type: (initialType as any) || 'wordpress',
    selectedCompanyId: currentCompany?.id || ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'infra', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedCompanyId when currentCompany loads after initial render
  React.useEffect(() => {
    if (currentCompany?.id && !form.selectedCompanyId) {
      setForm(prev => ({ ...prev, selectedCompanyId: currentCompany.id }));
    }
  }, [currentCompany?.id]);

  React.useEffect(() => {
    if (!initialClientId) return;
    const cl = clients.find((c) => c.id === initialClientId);
    if (!cl) return;
    setForm((prev) => ({
      ...prev,
      clientId: initialClientId,
      selectedCompanyId: cl.companyId || prev.selectedCompanyId || currentCompany?.id || '',
    }));
  }, [initialClientId, clients, currentCompany?.id]);

  const allAvailablePlans = [...hostingPlans, ...cloudHostingPlans];

  const handlePlanSelect = (planId: string) => {
    const plan = allAvailablePlans.find(p => p.id === planId);
    if (plan) {
      const price = planPriceForCycle(plan, form.billingCycle);
      setForm(prev => ({
        ...prev,
        planName: plan.name,
        price: price.toString(),
        storage: parseInt(plan.resources.storage),
        bandwidth: parseInt(plan.resources.bandwidth) || prev.bandwidth
      }));
    }
  };

  const set = (key: keyof FormData, value: unknown) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (s: number): boolean => {
    const e: typeof errors = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = 'Website name is required';
      if (!form.selectedCompanyId && allCompanies.length > 0) e.selectedCompanyId = 'Please select a company';
    }
    if (s === 2) {
      if (!form.clientId) e.clientId = 'Please select a client';
    }
    if (s === 3) {
      // Domain is optional if they skip, but required if they want to next
      // However, we have a skip button.
      // If they click NEXT, we should check if domain is set OR if it's optional.
      // For now let's make it mandatory if you don't SKIP.
      if (!form.domain.trim()) e.domain = 'Domain is required or skip this step';
    }
    if (s === 4) {
      if (!form.infraType) e.infra = 'Please select infrastructure type';
      if (form.infraType === 'hosting' && !form.hostingId) e.hostingId = 'Please select a hosting account';
      if (form.infraType === 'vps' && !form.vpsId) e.vpsId = 'Please select a VPS';
    }
    if (s === 6) {
      if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
        e.price = 'Please enter a valid price';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, 7)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // ─── Submit ────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!validate(6)) return;
    setIsSubmitting(true);
    try {
      const owner = clients.find((c) => c.id === form.clientId);
      const result = await addWebsite({
        name: form.name.trim(),
        domain: form.domain.trim(),
        clientId: form.clientId,
        type: form.type,
        storage: form.storage,
        bandwidth: form.bandwidth,
        plan: {
          name: form.planName,
          price: parseFloat(form.price),
          billingCycle: form.billingCycle,
        },
        status: form.status,
        linkedDomain: form.domain.trim(),
        companyId: owner?.companyId || form.selectedCompanyId || currentCompany?.id || '',
        // Pass domain DB ID so InvoiceContext can auto-link after real website is created
        linkedDomainId: form.domainId || undefined,
      });

      if (result.success) {
        toast.success(`${form.name} has been created!`, {
          description: form.domainId ? 'Website added and linked to domain.' : 'Website added to portfolio.',
        });
        router.push('/dashboard/websites');
      }
      // Error toast is already shown inside addWebsite on failure
    } catch {
      toast.error('Failed to create website');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Filtered data per client ──────────────────────────────────────────────
  const clientDomains = form.clientId ? domains.filter((d: any) => d.clientId === form.clientId) : domains;
  // Infrastructure (hosting/VPS) is company-wide — show ALL accounts regardless of which client owns them.
  // The dropdown label shows the owning client so the user can distinguish between accounts.
  const clientHosting = hosting;
  const clientVPS = vps;
  const clientEmails = form.clientId ? emails.filter((e: any) => e.clientId === form.clientId) : emails;

  const handleDomainSelect = (dId: string) => {
    const d = clientDomains.find((x: any) => x.id === dId);
    if (d) {
      setForm(prev => ({
        ...prev,
        domainId: dId,
        domain: `${d.name}${d.tld}`
      }));
    } else {
      setForm(prev => ({ ...prev, domainId: '', domain: '' }));
    }
  };

  // ─── Step Renders ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // Step 1: Info
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Website Name *</Label>
                <Input id="name" placeholder="My Business Site" value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1.5" />
                <FieldError msg={errors.name} />
              </div>
              <div>
                <Label>Contracted Company (Internal)</Label>
                <Select value={form.selectedCompanyId} onValueChange={(v) => set('selectedCompanyId', v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Website Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1.5">
                {WEBSITE_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('type', t.value as FormData['type'])}
                    className={cn(
                      'rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all min-h-[100px]',
                      form.type === t.value
                        ? `${t.wizardCardClass} ring-2 shadow-md scale-105`
                        : 'border-border hover:border-muted-foreground/30 bg-card/40',
                    )}
                  >
                    <div className="h-10 w-10 flex items-center justify-center">
                      <img
                        src={t.iconSrc}
                        alt={t.label}
                        className={cn(
                          'h-8 w-8 object-contain transition-transform',
                          form.type === t.value ? 'scale-110' : 'opacity-70 group-hover:opacity-100',
                        )}
                      />
                    </div>
                    <span className="text-sm font-bold tracking-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="storage">Storage (GB)</Label>
                <Input id="storage" type="number" value={form.storage} onChange={(e) => set('storage', parseInt(e.target.value))} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="bandwidth">Bandwidth (GB)</Label>
                <Input id="bandwidth" type="number" value={form.bandwidth} onChange={(e) => set('bandwidth', parseInt(e.target.value))} className="mt-1.5" />
              </div>
            </div>
          </div>
        );

      // Step 2: Client
      case 2:
        return (
          <div className="space-y-4">
            <Label>Select Owner Client *</Label>
            <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
              {clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    set('clientId', c.id);
                    if (c.companyId) set('selectedCompanyId', c.companyId);
                    set('domainId', '');
                    set('domain', '');
                    set('hostingId', '');
                    set('vpsId', '');
                    set('emailIds', []);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    form.clientId === c.id ? 'border-primary bg-primary/5 ring-1' : 'border-border hover:bg-muted/30',
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  {form.clientId === c.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            <FieldError msg={errors.clientId} />
          </div>
        );

      // Step 3: Domain
      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Link an existing domain or enter one manually.</p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {clientDomains.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDomainSelect(d.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    form.domainId === d.id ? 'border-primary bg-primary/5 ring-1' : 'border-border hover:bg-muted/30',
                  )}
                >
                  <Globe className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{d.name}{d.tld}</p>
                    <p className="text-xs text-muted-foreground">{d.registrar} · {d.status}</p>
                  </div>
                  {form.domainId === d.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-border/50">
              <Label htmlFor="customDomain">Custom Domain (if not in context)</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customDomain"
                    placeholder="example.com"
                    value={form.domainId ? '' : form.domain}
                    onChange={(e) => {
                      setForm(prev => ({ ...prev, domainId: '', domain: e.target.value }));
                    }}
                    className="pl-9"
                    disabled={!!form.domainId}
                  />
                </div>
                {form.domainId && (
                   <Button variant="ghost" size="sm" onClick={() => set('domainId', '')}>Clear Selection</Button>
                )}
              </div>
            </div>
            <FieldError msg={errors.domain} />
          </div>
        );

      // Step 4: Infrastructure
      case 4:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set('infraType', 'hosting')}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-all',
                  form.infraType === 'hosting' ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <HardDrive className="h-6 w-6 mb-2 text-primary" />
                <p className="font-semibold text-sm">Hosting</p>
                <p className="text-xs text-muted-foreground">Shared/Cloud Account</p>
              </button>
              <button
                type="button"
                onClick={() => set('infraType', 'vps')}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-all',
                  form.infraType === 'vps' ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <Server className="h-6 w-6 mb-2 text-primary" />
                <p className="font-semibold text-sm">VPS</p>
                <p className="text-xs text-muted-foreground">Private Server</p>
              </button>
            </div>
            <FieldError msg={errors.infra} />

            {form.infraType === 'hosting' && (
              clientHosting.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No hosting accounts found. Please add a hosting account first.
                </p>
              ) : (
                <Select value={form.hostingId} onValueChange={(v) => {
                  set('hostingId', v);
                  const h = hosting.find(x => x.id === v);
                  if (h) {
                    const ownerName = clients.find((c: any) => c.id === h.clientId)?.name;
                    setForm(prev => ({
                      ...prev,
                      planName: h.planName,
                      price: (h.price ?? 0).toString(),
                      storage: parseInt(h.resources?.storage) || prev.storage,
                      bandwidth: parseInt(h.resources?.bandwidth) || prev.bandwidth,
                    }));
                    void ownerName;
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select Hosting Account" /></SelectTrigger>
                  <SelectContent>
                    {clientHosting.map(h => {
                      const ownerName = clients.find((c: any) => c.id === h.clientId)?.name;
                      return (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} ({h.planName}){ownerName ? ` — ${ownerName}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )
            )}

            {form.infraType === 'vps' && (
              clientVPS.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No VPS servers found. Please add a VPS first.
                </p>
              ) : (
                <Select value={form.vpsId} onValueChange={(v) => {
                  set('vpsId', v);
                  const srv = vps.find(x => x.id === v);
                  if (srv) {
                    setForm(prev => ({
                      ...prev,
                      planName: srv.planName,
                      price: (srv.price ?? 0).toString(),
                      storage: srv.storage || prev.storage,
                    }));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select VPS" /></SelectTrigger>
                  <SelectContent>
                    {clientVPS.map(v => {
                      const ownerName = clients.find((c: any) => c.id === v.clientId)?.name;
                      return (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.planName}){ownerName ? ` — ${ownerName}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )
            )}
          </div>
        );

      // Step 5: Services
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">Link Email Accounts (Optional)</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {clientEmails.length === 0 ? <p className="text-sm text-muted-foreground italic">No emails available for this client.</p> :
                clientEmails.map((e) => {
                  const s = form.emailIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        const updated = s ? form.emailIds.filter(id => id !== e.id) : [...form.emailIds, e.id];
                        set('emailIds', updated);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        s ? 'border-primary bg-primary/5 ring-1' : 'border-border',
                      )}
                    >
                      <Mail className={cn('h-4 w-4', s ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-sm font-medium">{e.name}@{e.domain}</span>
                      {s && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </button>
                  );
                })}
            </div>
          </div>
        );

      // Step 6: Billing
      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4">
              <Label className="text-primary font-bold mb-2 block">Choose from Available Plans (Bakat)</Label>
              <Select onValueChange={handlePlanSelect}>
                <SelectTrigger className="bg-white border-primary/20">
                  <SelectValue placeholder="Select a predefined plan..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 text-[10px] uppercase font-bold text-muted-foreground bg-muted/30 flex items-center gap-2">
                    <Monitor className="h-3 w-3" /> Shared Hosting
                  </div>
                  {hostingPlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(planPriceForCycle(p, form.billingCycle))}
                    </SelectItem>
                  ))}
                  <div className="p-2 text-[10px] uppercase font-bold text-muted-foreground bg-muted/30 mt-2 flex items-center gap-2">
                    <Server className="h-3 w-3" /> Cloud Hosting
                  </div>
                  {cloudHostingPlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(planPriceForCycle(p, form.billingCycle))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-2">Selecting a plan will automatically update the price and resources.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input value={form.planName} onChange={(e) => set('planName', e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Price *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} className="pl-7" />
                </div>
                <FieldError msg={errors.price} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Billing Cycle</Label>
                <Select
                  value={form.billingCycle}
                  onValueChange={(v: WebsiteBillingCycle) => {
                    set('billingCycle', v);
                    const activePlan = allAvailablePlans.find(p => p.name === form.planName);
                    if (activePlan) {
                      set('price', planPriceForCycle(activePlan, v).toString());
                    }
                  }}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="onetime">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Initial Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // Step 7: Confirmation
      case 7: {
        const client = clients.find(c => c.id === form.clientId);
        return (
          <div className="space-y-4">
            <div className="rounded-xl border divide-y">
              {[
                { label: 'Name', value: form.name },
                { label: 'Domain', value: form.domain },
                { label: 'Type', value: form.type.toUpperCase() },
                { label: 'Client', value: client?.name ?? '-' },
                { label: 'Storage', value: `${form.storage} GB` },
                {
                  label: 'Plan',
                  value:
                    form.billingCycle === 'onetime'
                      ? `${form.planName} (${formatCurrency(parseFloat(form.price))} one-time)`
                      : `${form.planName} (${formatCurrency(parseFloat(form.price))}/${form.billingCycle})`,
                },
                { label: 'Status', value: form.status.toUpperCase() },
              ].map(row => (
                <div key={row.label} className="flex px-4 py-2 text-sm">
                  <span className="w-24 text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  const currentStep = STEPS.find(s => s.id === step);

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />
      
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">{currentStep?.label}</h2>
        {renderStep()}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => (step === 1 ? router.back() : back())} disabled={isSubmitting}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex gap-2">
          {step < 7 ? (
            <>
              {[3, 5].includes(step) && (
                <Button 
                   variant="ghost" 
                   onClick={() => setStep((s) => s + 1)}
                   className="text-muted-foreground hover:text-foreground"
                >
                  Skip
                </Button>
              )}
              <Button onClick={next}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Website'}
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

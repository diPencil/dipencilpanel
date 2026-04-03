'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Smartphone, Users, Globe, HardDrive, Server, Mail, CreditCard,
  CheckCircle2, ChevronRight, ChevronLeft, Plus, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MobileApp } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'App Info', icon: Smartphone },
  { id: 2, label: 'Client', icon: Users },
  { id: 3, label: 'Domain', icon: Globe },
  { id: 4, label: 'Infrastructure', icon: HardDrive },
  { id: 5, label: 'Services', icon: Mail },
  { id: 6, label: 'Plan & Billing', icon: CreditCard },
  { id: 7, label: 'Confirm', icon: CheckCircle2 },
];

// ─── Form Data ────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  appType: string;
  framework: string;
  description: string;
  clientId: string;
  domainId: string;
  infraType: 'hosting' | 'vps' | '';
  hostingId: string;
  vpsId: string;
  emailIds: string[];
  plan: string;
  price: string;
  billingCycle: string;
  autoRenew: boolean;
  selectedCompanyId: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  appType: 'android',
  framework: 'native',
  description: '',
  clientId: '',
  domainId: '',
  infraType: '',
  hostingId: '',
  vpsId: '',
  emailIds: [],
  plan: 'basic',
  price: '',
  billingCycle: 'monthly',
  autoRenew: true,
  selectedCompanyId: '',
};

const PLAN_PRICES: Record<string, Record<string, number>> = {
  basic:      { monthly: 29, yearly: 290 },
  pro:        { monthly: 79, yearly: 790 },
  enterprise: { monthly: 199, yearly: 1990 },
};

const FRAMEWORK_CONFIRM_LABELS: Record<string, string> = {
  react_native: 'React Native',
  nodejs: 'Node.js',
};

function formatFrameworkLabel(key: string) {
  return FRAMEWORK_CONFIRM_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

export function CreateAppWizard() {
  const router = useRouter();
  const { clients, domains = [], hosting = [], vps = [], emails = [], addMobileApp, allCompanies = [], currentCompany } = useInvoiceData();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, selectedCompanyId: currentCompany?.id || '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'infra', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (key: keyof FormData, value: unknown) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  // Auto-populate price when plan/billingCycle changes
  const handlePlanChange = (plan: string) => {
    const suggested = PLAN_PRICES[plan]?.[form.billingCycle] ?? '';
    set('plan', plan);
    if (!form.price || Object.values(PLAN_PRICES).some(
      (p) => String(p[form.billingCycle]) === form.price
    )) {
      set('price', String(suggested));
    }
  };

  const handleBillingChange = (cycle: string) => {
    const suggested = PLAN_PRICES[form.plan]?.[cycle] ?? '';
    set('billingCycle', cycle);
    if (!form.price || Object.values(PLAN_PRICES).some(
      (p) => Object.values(p).includes(Number(form.price))
    )) {
      set('price', String(suggested));
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (s: number): boolean => {
    const e: typeof errors = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = 'App name is required';
      if (!form.appType) e.appType = 'App type is required';
      if (!form.selectedCompanyId) e.selectedCompanyId = 'Please select a company';
    }
    if (s === 2) {
      if (!form.clientId) e.clientId = 'Please select a client';
    }
    if (s === 4) {
      if (!form.infraType) e.infra = 'Please select hosting or VPS';
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

  const submit = () => {
    if (!validate(6)) return;
    setIsSubmitting(true);
    try {
      const appData: Omit<MobileApp, 'id' | 'createdAt' | 'updatedAt'> = {
        name: form.name.trim(),
        appType: form.appType as MobileApp['appType'],
        framework: form.framework as MobileApp['framework'],
        description: form.description.trim() || undefined,
        status: 'development',
        plan: form.plan as MobileApp['plan'],
        price: parseFloat(form.price),
        billingCycle: form.billingCycle as 'monthly' | 'yearly',
        autoRenew: form.autoRenew,
        clientId: form.clientId,
        companyId: form.selectedCompanyId,
        domainId: form.domainId || undefined,
        hostingId: form.infraType === 'hosting' ? form.hostingId || undefined : undefined,
        vpsId: form.infraType === 'vps' ? form.vpsId || undefined : undefined,
        emailIds: form.emailIds,
      };
      const created = addMobileApp(appData);
      if (!created) return;
      toast.success(`${form.name} has been created!`, {
        description: 'Subscription and invoice generated.',
      });
      router.push('/dashboard/mobile-apps');
    } catch {
      toast.error('Failed to create application');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Filtered data per client ──────────────────────────────────────────────
  const clientDomains = form.clientId ? domains.filter((d) => d.clientId === form.clientId) : domains;
  const clientHosting = form.clientId ? hosting.filter((h) => h.clientId === form.clientId) : hosting;
  const clientVPS = form.clientId ? vps.filter((v) => v.clientId === form.clientId) : vps;
  const clientEmails = form.clientId ? emails.filter((e) => e.clientId === form.clientId) : emails;

  // ─── Step Renders ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // Step 1: App Info
      case 1:
        return (
          <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">App Name *</Label>
              <Input id="name" placeholder="My Awesome App" value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1.5" />
              <FieldError msg={errors.name} />
            </div>
            <div>
              <Label htmlFor="company">Contracted Company (Internal)</Label>
              <Select
                value={form.selectedCompanyId}
                onValueChange={(v) => set('selectedCompanyId', v)}
              >
                <SelectTrigger id="company" className="mt-1.5 text-right flex-row-reverse gap-2">
                  <SelectValue placeholder="Select Company..." />
                </SelectTrigger>
                <SelectContent align="end">
                  {allCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-right flex-row-reverse">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.selectedCompanyId} />
            </div>
          </div>

            {/* Platform (App Type) */}
            <div>
              <Label>Platform *</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Which platform(s) will this app target?</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'android', label: 'Android', icon: '/android-icon-svgrepo-com.svg', color: 'border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
                  { value: 'ios', label: 'iOS', icon: '/apple-svgrepo-com.svg', color: 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
                  { value: 'windows', label: 'Windows', icon: '/windows-legacy-svgrepo-com.svg', color: 'border-sky-400 bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300' },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('appType', t.value)}
                    className={cn(
                      'rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all min-h-[100px]',
                      form.appType === t.value ? t.color + ' ring-2 ring-offset-1 shadow-md scale-105' : 'border-border hover:border-muted-foreground/30 bg-card/40',
                    )}
                  >
                    <div className="h-10 w-10 flex items-center justify-center">
                      <img src={t.icon} alt={t.label} className={cn("h-8 w-8 object-contain transition-transform", form.appType === t.value ? "scale-110" : "opacity-70 group-hover:opacity-100")} />
                    </div>
                    <span className="text-sm font-bold tracking-tight">{t.label}</span>
                  </button>
                ))}
              </div>
              <FieldError msg={errors.appType} />
            </div>

            {/* Framework / Language */}
            <div>
              <Label>Framework / Language</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Select the programming language or framework used</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: 'kotlin', label: 'Kotlin', color: 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
                  { value: 'swift', label: 'Swift', color: 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
                  { value: 'java', label: 'Java', color: 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
                  { value: 'flutter', label: 'Flutter', color: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300' },
                  { value: 'react_native', label: 'React Native', color: 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' },
                  { value: 'dart', label: 'Dart', color: 'border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
                  { value: 'python', label: 'Python', color: 'border-yellow-300 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200' },
                  { value: 'nodejs', label: 'Node.js', color: 'border-lime-300 bg-lime-50 text-lime-900 dark:bg-lime-900/20 dark:text-lime-200' },
                  { value: 'native', label: 'Native (Default)', color: 'border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300' },
                ].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => set('framework', f.value)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all text-left',
                      form.framework === f.value ? f.color + ' ring-2 ring-offset-1' : 'border-border hover:border-muted-foreground/50',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this app does..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>
          </div>
        );

      // Step 2: Client
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Select Client *</Label>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No clients found. Create one first.</p>
                )}
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { set('clientId', c.id); set('domainId', ''); set('hostingId', ''); set('vpsId', ''); set('emailIds', []); }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      form.clientId === c.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-muted-foreground/50',
                    )}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    {form.clientId === c.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
              <FieldError msg={errors.clientId} />
            </div>
          </div>
        );

      // Step 3: Domain
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Link an existing domain to this app, or skip this step.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => set('domainId', '')}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  !form.domainId ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                )}
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">No domain (skip)</p>
                  <p className="text-xs text-muted-foreground">You can link a domain later</p>
                </div>
                {!form.domainId && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
              </button>
              {clientDomains.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => set('domainId', d.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    form.domainId === d.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{d.name}{d.tld}</p>
                    <p className="text-xs text-muted-foreground capitalize">{d.status}</p>
                  </div>
                  {form.domainId === d.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        );

      // Step 4: Infrastructure
      case 4:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Choose the server infrastructure for this application.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { set('infraType', 'hosting'); set('vpsId', ''); }}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-all',
                  form.infraType === 'hosting'
                    ? 'border-primary bg-primary/5 ring-2 ring-offset-1'
                    : 'border-border hover:border-muted-foreground/50',
                )}
              >
                <HardDrive className="h-6 w-6 mb-2 text-primary" />
                <p className="font-semibold text-sm">Hosting</p>
                <p className="text-xs text-muted-foreground mt-0.5">Shared / Cloud Hosting</p>
              </button>
              <button
                type="button"
                onClick={() => { set('infraType', 'vps'); set('hostingId', ''); }}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-all',
                  form.infraType === 'vps'
                    ? 'border-primary bg-primary/5 ring-2 ring-offset-1'
                    : 'border-border hover:border-muted-foreground/50',
                )}
              >
                <Server className="h-6 w-6 mb-2 text-primary" />
                <p className="font-semibold text-sm">VPS</p>
                <p className="text-xs text-muted-foreground mt-0.5">Virtual Private Server</p>
              </button>
            </div>
            <FieldError msg={errors.infra} />

            {form.infraType === 'hosting' && (
              <div className="space-y-2">
                <Label>Select Hosting Account</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mt-1.5">
                  {clientHosting.length === 0 && <p className="text-sm text-muted-foreground">No hosting accounts for this client.</p>}
                  {clientHosting.map((h) => (
                    <button key={h.id} type="button" onClick={() => set('hostingId', h.id)}
                      className={cn('w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        form.hostingId === h.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                      )}>
                      <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.planName} · {h.type}</p>
                      </div>
                      {form.hostingId === h.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
                <FieldError msg={errors.hostingId} />
              </div>
            )}

            {form.infraType === 'vps' && (
              <div className="space-y-2">
                <Label>Select VPS</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mt-1.5">
                  {clientVPS.length === 0 && <p className="text-sm text-muted-foreground">No VPS for this client.</p>}
                  {clientVPS.map((v) => (
                    <button key={v.id} type="button" onClick={() => set('vpsId', v.id)}
                      className={cn('w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        form.vpsId === v.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                      )}>
                      <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.planName} · {v.cpu}vCPU / {v.ram}GB RAM</p>
                      </div>
                      {form.vpsId === v.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
                <FieldError msg={errors.vpsId} />
              </div>
            )}
          </div>
        );

      // Step 5: Services
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select email accounts to link to this app.</p>
            {clientEmails.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No email accounts for this client.</p>
                <p className="text-xs text-muted-foreground mt-1">You can add emails later from the Email section.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {clientEmails.map((e) => {
                  const selected = form.emailIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        const updated = selected
                          ? form.emailIds.filter((id) => id !== e.id)
                          : [...form.emailIds, e.id];
                        set('emailIds', updated);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/50',
                      )}
                    >
                      <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                        selected ? 'bg-primary/10' : 'bg-muted')}>
                        <Mail className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{e.name}@{e.domain}</p>
                        <p className="text-xs text-muted-foreground">{e.storage}GB storage</p>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      // Step 6: Plan & Billing
      case 6:
        return (
          <div className="space-y-5">
            <div>
              <Label>Plan</Label>
              <div className="grid grid-cols-3 gap-3 mt-1.5">
                {[
                  { value: 'basic', label: 'Basic', color: 'border-slate-400', desc: 'Starter' },
                  { value: 'pro', label: 'Pro', color: 'border-blue-500', desc: 'Popular' },
                  { value: 'enterprise', label: 'Enterprise', color: 'border-violet-500', desc: 'Full power' },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePlanChange(p.value)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-all',
                      form.plan === p.value
                        ? p.color + ' ring-2 ring-offset-1 bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50',
                    )}
                  >
                    <p className="font-semibold text-sm">{p.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    <p className="text-sm font-bold mt-1.5 text-primary">
                      {formatCurrency(PLAN_PRICES[p.value][form.billingCycle])}
                      <span className="text-xs font-normal text-muted-foreground">/{form.billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Billing Cycle</Label>
                <Select value={form.billingCycle} onValueChange={handleBillingChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly (save ~17%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Price *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    className="pl-7"
                  />
                </div>
                <FieldError msg={errors.price} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium text-sm">Auto-renew</p>
                <p className="text-xs text-muted-foreground">Automatically generate renewal invoices</p>
              </div>
              <Switch checked={form.autoRenew} onCheckedChange={(v) => set('autoRenew', v)} />
            </div>
          </div>
        );

      // Step 7: Confirm
      case 7: {
        const client = clients.find((c) => c.id === form.clientId);
        const domain = domains.find((d) => d.id === form.domainId);
        const h = hosting.find((h) => h.id === form.hostingId);
        const v = vps.find((v) => v.id === form.vpsId);
        const linkedEmails = emails.filter((e) => form.emailIds.includes(e.id));

        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review the application details before creating.</p>
            <div className="rounded-xl border divide-y">
              {[
                { label: 'App Name', value: form.name },
                { label: 'Platform', value: form.appType === 'ios' ? 'iOS' : form.appType === 'windows' ? 'Windows' : 'Android' },
                { label: 'Framework', value: formatFrameworkLabel(form.framework) },
                { label: 'Description', value: form.description || '—' },
                { label: 'Client', value: client?.name ?? '—' },
                { label: 'Domain', value: domain ? `${domain.name}${domain.tld}` : 'Not linked' },
                {
                  label: 'Infrastructure',
                  value: form.infraType === 'hosting' && h ? `Hosting: ${h.planName}` :
                    form.infraType === 'vps' && v ? `VPS: ${v.planName}` : 'Not linked',
                },
                {
                  label: 'Emails',
                  value: linkedEmails.length > 0 ? linkedEmails.map((e) => `${e.name}@${e.domain}`).join(', ') : 'None',
                },
                { label: 'Plan', value: `${form.plan.charAt(0).toUpperCase()}${form.plan.slice(1)}` },
                { label: 'Price', value: `${formatCurrency(parseFloat(form.price) || 0)} / ${form.billingCycle}` },
                { label: 'Auto-renew', value: form.autoRenew ? 'Yes' : 'No' },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/60 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
              A subscription and initial invoice will be generated automatically.
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  const currentStep = STEPS.find((s) => s.id === step);

  return (
    <div className="w-full space-y-6">
      <StepIndicator current={step} />

      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold">{currentStep?.label}</h2>
          <p className="text-muted-foreground text-sm mt-1">Step {step} of {STEPS.length}</p>
        </div>

        {renderStep()}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => step === 1 ? router.back() : back()} disabled={isSubmitting}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex gap-2">
          {step < 7 ? (
            <>
              {[3, 5].includes(step) && (
                <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
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
              {isSubmitting ? 'Creating...' : 'Create Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

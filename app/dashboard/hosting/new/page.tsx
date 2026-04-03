'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Globe, 
  HardDrive, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Mail, 
  Zap,
  Users,
  CreditCard,
  Rocket,
  Server,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { HOSTING_PLANS, CLOUD_HOSTING_PLANS } from '@/lib/constants'; 
import { formatCurrency } from '@/lib/formatting';

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Hosting Type', icon: HardDrive },
  { id: 2, label: 'Plan', icon: Zap },
  { id: 3, label: 'Client', icon: Users },
  { id: 4, label: 'Domain', icon: Globe },
  { id: 5, label: 'Services', icon: Mail },
  { id: 6, label: 'Billing', icon: CreditCard },
  { id: 7, label: 'Confirm', icon: CheckCircle2 },
];

type HostingType = 'web' | 'node' | 'wordpress' | 'cloud';

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

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AddHostingPage() {
  const router = useRouter();
  const { hostingPlans, cloudHostingPlans, clients = [], domains = [], addHosting, currentCompany } = useInvoiceData();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Selection State
  const [form, setForm] = useState({
     hostingType: 'web' as HostingType,
     selectedPlanId: '',
     clientId: '',
     domainId: '',
     hostingName: '',
     billingCycle: 'monthly' as 'monthly' | 'yearly',
     autoRenew: true,
     linkedEmails: false,
     linkedVps: false
  });

  const availablePlans = useMemo(() => {
    let plans = form.hostingType === 'cloud' ? cloudHostingPlans : hostingPlans;
    if (!plans || plans.length === 0) {
      plans = form.hostingType === 'cloud' ? CLOUD_HOSTING_PLANS : HOSTING_PLANS;
    }
    return plans;
  }, [form.hostingType, hostingPlans, cloudHostingPlans]);

  const set = (key: keyof typeof form, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const selectedPlan = useMemo(() => {
    // Search in all potential plans regardless of current hostingType to support the multi-section UI
    const allPlans = [...hostingPlans, ...cloudHostingPlans, ...HOSTING_PLANS, ...CLOUD_HOSTING_PLANS];
    return allPlans.find(p => p.id === form.selectedPlanId);
  }, [form.selectedPlanId, hostingPlans, cloudHostingPlans]);

  const selectedClient = useMemo(() => clients.find(c => c.id === form.clientId), [form.clientId, clients]);
  const selectedDomain = useMemo(() => domains.find(d => d.id === form.domainId), [form.domainId, domains]);

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 2 && !form.selectedPlanId) e.selectedPlanId = 'Please select a plan';
    if (s === 3 && !form.clientId) e.clientId = 'Please select a client';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, 7)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = () => {
     if (!validate(6)) return;
     if (!selectedPlan) return;
     
     setIsSubmitting(true);
     try {
       const expiryDate = new Date();
       if (form.billingCycle === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
       else expiryDate.setFullYear(expiryDate.getFullYear() + 1);

       addHosting({
          companyId: currentCompany.id,
          name: form.hostingName || `${selectedPlan.name} Hosting`,
          clientId: form.clientId,
          domainId: form.domainId || '',
          type: form.hostingType,
          planName: selectedPlan.name,
          price: form.billingCycle === 'monthly' ? selectedPlan.price.monthly : selectedPlan.price.yearly,
          billingCycle: form.billingCycle,
          status: 'active',
          expiryDate: expiryDate.toISOString(),
          resources: selectedPlan.resources,
          linkedServices: {
             emailIds: form.linkedEmails ? ['1'] : [],
             vpsIds: form.linkedVps ? ['1'] : []
          }
       });

       toast.success('Hosting account created successfully!', {
         description: 'Subscription and invoice generated.',
       });
       router.push('/dashboard/hosting');
     } catch {
       toast.error('Failed to create hosting account');
     } finally {
       setIsSubmitting(false);
     }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <Label>Hosting Type *</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                {[
                  { id: 'web', label: 'Web Hosting', icon: Globe, color: 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
                  { id: 'node', label: 'Node.js', imgUrl: '/node-js-svgrepo-com.svg', color: 'border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
                  { id: 'wordpress', label: 'WordPress', imgUrl: '/wordpress-139-svgrepo-com.svg', color: 'border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300' },
                  { id: 'cloud', label: 'Cloud Hosting', icon: Server, color: 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set('hostingType', t.id as HostingType)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-sm font-semibold transition-all text-left',
                      form.hostingType === t.id ? t.color + ' ring-2 ring-offset-1' : 'border-border hover:border-muted-foreground/50',
                    )}
                  >
                    {t.imgUrl ? (
                        <img src={t.imgUrl} alt={t.label} className={cn("h-5 w-5 mb-1 opacity-80", form.hostingType === t.id && "opacity-100")} />
                    ) : (
                        t.icon && <t.icon className="h-5 w-5 mb-1" />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              {/* Web Hosting Section */}
              <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Web Hosting Plans</h3>
              </div>
              <div className="space-y-2">
                {(hostingPlans.length > 0 ? hostingPlans : HOSTING_PLANS).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                        setForm(prev => ({ ...prev, selectedPlanId: p.id, hostingType: 'web' }));
                        setErrors(prev => ({ ...prev, selectedPlanId: '' }));
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-all relative overflow-hidden group',
                      form.selectedPlanId === p.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/5',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
                          {p.isPopular && <Badge className="text-[9px] h-4 px-1 bg-primary font-bold">POPULAR</Badge>}
                       </div>
                       <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {p.resources.cpu} · {p.resources.ram} · {p.resources.storage}
                       </p>
                    </div>
                    <div className="text-right shrink-0">
                        {p.originalPrice && (
                             <p className="text-[10px] text-muted-foreground/60 line-through decoration-destructive/40 leading-none">
                                {formatCurrency(p.originalPrice.monthly)}
                             </p>
                        )}
                        <p className="font-black text-lg text-primary leading-none mt-0.5">
                             {formatCurrency(p.price.monthly)}
                             <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/mo</span>
                        </p>
                    </div>
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        form.selectedPlanId === p.id ? "bg-primary border-primary" : "border-border"
                    )}>
                        {form.selectedPlanId === p.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cloud Hosting Section */}
            <div className="space-y-3 pt-8 mt-8 border-t border-dashed md:pt-0 md:mt-0 md:border-t-0 md:border-l md:pl-6 lg:pl-10">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-violet-600" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Cloud Hosting Plans</h3>
              </div>
              <div className="space-y-2">
                {(cloudHostingPlans.length > 0 ? cloudHostingPlans : CLOUD_HOSTING_PLANS).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                        setForm(prev => ({ ...prev, selectedPlanId: p.id, hostingType: 'cloud' }));
                        setErrors(prev => ({ ...prev, selectedPlanId: '' }));
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-all relative overflow-hidden group',
                      form.selectedPlanId === p.id 
                        ? 'border-violet-500 bg-violet-500/5 ring-2 ring-violet-500/20'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/5',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate group-hover:text-violet-600 transition-colors">{p.name}</p>
                          {p.isPopular && <Badge className="text-[9px] h-4 px-1 bg-violet-600 font-bold">POPULAR</Badge>}
                       </div>
                       <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {p.resources.cpu} · {p.resources.ram} · {p.resources.storage}
                       </p>
                    </div>
                    <div className="text-right shrink-0">
                        {p.originalPrice && (
                             <p className="text-[10px] text-muted-foreground/60 line-through decoration-destructive/40 leading-none">
                                {formatCurrency(p.originalPrice.monthly)}
                             </p>
                        )}
                        <p className="font-black text-lg text-violet-600 leading-none mt-0.5">
                             {formatCurrency(p.price.monthly)}
                             <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/mo</span>
                        </p>
                    </div>
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        form.selectedPlanId === p.id ? "bg-violet-600 border-violet-600" : "border-border"
                    )}>
                        {form.selectedPlanId === p.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            </div>
            <FieldError msg={errors.selectedPlanId} />
          </div>
        );

      case 3:
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
                    onClick={() => { set('clientId', c.id); set('domainId', ''); }}
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

      case 4:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Link an existing domain to this hosting account, or skip this step.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
              {domains.filter(d => d.clientId === form.clientId).map((d) => (
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

            <div>
               <Label htmlFor="hostingName">Internal Name</Label>
               <Input 
                 id="hostingName"
                 placeholder="e.g. My Website Hosting" 
                 className="mt-1.5"
                 value={form.hostingName}
                 onChange={(e) => set('hostingName', e.target.value)}
               />
               <p className="text-xs text-muted-foreground mt-1">Friendly name for internal management.</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Select additional services to provision alongside hosting.</p>
             <div className="grid grid-cols-2 gap-3 mt-1.5">
                {[
                  { id: 'emails', label: 'Email Accounts', desc: 'Add mailbox storage', icon: Mail, checked: form.linkedEmails },
                  { id: 'vps', label: 'Dedicated IP', desc: 'Static IPv4 address', icon: Server, checked: form.linkedVps },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => set(s.id === 'emails' ? 'linkedEmails' : 'linkedVps', !s.checked)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-all flex flex-col gap-1.5',
                      s.checked ? 'border-primary bg-primary/5 ring-2 ring-offset-1' : 'border-border hover:border-muted-foreground/50',
                    )}
                  >
                     <div className="flex items-center justify-between w-full">
                        <s.icon className={cn("h-5 w-5", s.checked ? "text-primary" : "text-muted-foreground")} />
                        {s.checked && <CheckCircle2 className="h-4 w-4 text-primary" />}
                     </div>
                     <p className="font-semibold text-sm mt-1">{s.label}</p>
                     <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5">
            <div>
               <Label>Billing Cycle</Label>
               <Select value={form.billingCycle} onValueChange={(v: 'monthly' | 'yearly') => set('billingCycle', v)}>
                 <SelectTrigger className="mt-1.5">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="monthly">Monthly ({formatCurrency(selectedPlan?.price.monthly || 0)}/mo)</SelectItem>
                   <SelectItem value="yearly">Yearly ({formatCurrency(selectedPlan?.price.yearly || 0)}/yr) - Save ~17%</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            
            <div className="rounded-xl border bg-muted/20 p-4">
               <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan?.name}</span>
               </div>
               <div className="flex justify-between text-sm mb-4">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                     {formatCurrency(form.billingCycle === 'monthly' ? (selectedPlan?.price.monthly || 0) : (selectedPlan?.price.yearly || 0))}
                  </span>
               </div>
               <div className="h-px bg-border my-3" />
               <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Due Now</span>
                  <span className="font-bold text-lg text-primary">
                     {formatCurrency(form.billingCycle === 'monthly' ? (selectedPlan?.price.monthly || 0) : (selectedPlan?.price.yearly || 0))}
                  </span>
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

      case 7: {
        const p = selectedPlan;
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review the hosting details before creating.</p>
            <div className="rounded-xl border divide-y">
              {[
                { label: 'Hosting Name', value: form.hostingName || `${p?.name} Hosting` },
                { label: 'Type', value: form.hostingType.replace('node', 'Node.js').charAt(0).toUpperCase() + form.hostingType.slice(1).replace('node', 'ode.js') },
                { label: 'Plan', value: p?.name },
                { label: 'Client', value: selectedClient?.name ?? '—' },
                { label: 'Domain', value: selectedDomain ? `${selectedDomain.name}${selectedDomain.tld}` : 'Not linked' },
                { label: 'Services', value: [form.linkedEmails && 'Emails', form.linkedVps && 'Dedicated IP'].filter(Boolean).join(', ') || 'None' },
                { label: 'Price', value: `${formatCurrency(form.billingCycle === 'monthly' ? (p?.price.monthly || 0) : (p?.price.yearly || 0))} / ${form.billingCycle}` },
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
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard/hosting" className="hover:text-foreground transition-colors">
            Hosting
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Add Hosting</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
          <Rocket className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Rapid Deployment Active</span>
        </div>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Set up Web Hosting</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Follow the steps below to configure and deploy your new hosting account.
        </p>
      </div>

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
                 {[4].includes(step) && (
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
                 {isSubmitting ? 'Creating...' : 'Create Hosting'}
               </Button>
             )}
           </div>
         </div>
      </div>
    </div>
  );
}

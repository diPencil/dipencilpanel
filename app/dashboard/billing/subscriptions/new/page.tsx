'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Subscription } from '@/lib/types';
import { generateSubscriptionServiceId } from '@/lib/subscription-service-id';
import { CURRENCIES } from '@/lib/constants';
import { convertCurrency } from '@/lib/currency-utils';

const SERVICE_TYPES: Subscription['serviceType'][] = ['website', 'domain', 'hosting', 'email', 'vps', 'mobile_app'];
const BILLING_CYCLES: Subscription['billingCycle'][] = ['monthly', 'yearly'];
const STATUSES: Subscription['status'][] = ['active', 'suspended', 'expired'];
const DEFAULT_SERVICE_NAMES = [
  'Business Web Hosting (billed every year)',
  'SSL Certificate (billed includes every year)',
  'Business Email (billed every year)',
  '.COM Domain (billed every year)',
  '.NET Domain (billed every year)',
  'Domain WHOIS Privacy Protection',
  'CANN fee (billed every year)',
  'Single Web Hosting (billed every year)',
  'Cloud Web Hosting (billed every year)',
];
const PLAN_OPTIONS = [
  'Website Service',
  'Domain Protection',
  'Domain Plan',
  'Email Plan',
  'Domain Certificate',
  'Web Hosting',
  'Cloud Hosting',
  'VPS Server',
];

const CUSTOM_PLANS_KEY = 'pencil_custom_plans';
const CUSTOM_SERVICE_NAMES_KEY = 'pencil_custom_service_names';

const toInputDate = (date: Date) => {
  const t = date.getTime();
  if (Number.isNaN(t)) {
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

const isValidInputDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const ms = new Date(`${trimmed}T00:00:00.000Z`).getTime();
  return !Number.isNaN(ms);
};

const toIsoDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString();
};

const addBillingCycle = (dateValue: string, cycle: Subscription['billingCycle']) => {
  if (!isValidInputDate(dateValue)) {
    const fallback = new Date();
    if (cycle === 'monthly') {
      fallback.setUTCMonth(fallback.getUTCMonth() + 1);
    } else {
      fallback.setUTCFullYear(fallback.getUTCFullYear() + 1);
    }
    return toInputDate(fallback);
  }
  const date = new Date(`${dateValue.trim()}T00:00:00.000Z`);
  if (cycle === 'monthly') {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return toInputDate(date);
};

function CreateSubscriptionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { clients, company, domains = [], addSubscription } = useInvoiceData();
  const [isLoading, setIsLoading] = useState(false);

  const today = useMemo(() => toInputDate(new Date()), []);

  const [formData, setFormData] = useState({
    clientId: '',
    serviceType: 'hosting' as Subscription['serviceType'],
    serviceName: '',
    domainId: '',
    serviceId: generateSubscriptionServiceId('hosting'),
    planName: '',
    billingCycle: 'monthly' as Subscription['billingCycle'],
    price: '',
    providerPrice: '',
    currency: company.currency || 'USD',
    startDate: today,
    expiryDate: addBillingCycle(today, 'monthly'),
    autoRenew: true,
    status: 'active' as Subscription['status'],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const cid = searchParams.get('clientId');
    if (!cid || !clients.some((c) => c.id === cid)) return;
    setFormData((prev) => (prev.clientId === cid ? prev : { ...prev, clientId: cid, domainId: '' }));
  }, [searchParams, clients]);

  // ─── Custom Plans ──────────────────────────────────────────────────────────

  const [customPlans, setCustomPlans] = useState<string[]>([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanInput, setNewPlanInput] = useState('');
  const [editingPlan, setEditingPlan] = useState<{ index: number; value: string } | null>(null);
  const customPlansFirstRender = useRef(true);

  // ─── Custom Service Names ──────────────────────────────────────────────────

  const [customServiceNames, setCustomServiceNames] = useState<string[]>([]);
  const [showAddServiceName, setShowAddServiceName] = useState(false);
  const [newServiceNameInput, setNewServiceNameInput] = useState('');
  const [editingServiceName, setEditingServiceName] = useState<{ index: number; value: string } | null>(null);
  const customServiceNamesFirstRender = useRef(true);

  useEffect(() => {
    if (customPlansFirstRender.current) {
      customPlansFirstRender.current = false;
      try {
        const stored = localStorage.getItem(CUSTOM_PLANS_KEY);
        if (stored) setCustomPlans(JSON.parse(stored));
      } catch {}
      return;
    }
    localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(customPlans));
  }, [customPlans]);

  useEffect(() => {
    if (customServiceNamesFirstRender.current) {
      customServiceNamesFirstRender.current = false;
      try {
        const stored = localStorage.getItem(CUSTOM_SERVICE_NAMES_KEY);
        if (stored) setCustomServiceNames(JSON.parse(stored));
      } catch {}
      return;
    }
    localStorage.setItem(CUSTOM_SERVICE_NAMES_KEY, JSON.stringify(customServiceNames));
  }, [customServiceNames]);

  const updateField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleStartDateChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      startDate: value,
      expiryDate: isValidInputDate(value)
        ? addBillingCycle(value, prev.billingCycle)
        : prev.expiryDate,
    }));
  };

  const handleBillingCycleChange = (value: Subscription['billingCycle']) => {
    setFormData((prev) => ({
      ...prev,
      billingCycle: value,
      expiryDate: isValidInputDate(prev.startDate)
        ? addBillingCycle(prev.startDate, value)
        : prev.expiryDate,
    }));
  };

  const handleCurrencyChange = (value: string) => {
    if (value === formData.currency) return;
    const priceNum = Number(formData.price);
    const hasPrice = formData.price.trim() !== '' && Number.isFinite(priceNum);
    const provNum = Number(formData.providerPrice);
    const hasProv = formData.providerPrice.trim() !== '' && Number.isFinite(provNum);
    if (hasPrice || hasProv) {
      setFormData((prev) => ({
        ...prev,
        currency: value,
        price: hasPrice
          ? convertCurrency(priceNum, formData.currency, value, company).toFixed(2)
          : prev.price,
        providerPrice: hasProv
          ? convertCurrency(provNum, formData.currency, value, company).toFixed(2)
          : prev.providerPrice,
      }));
      toast({
        title: 'Currency converted',
        description: `Amounts updated using your exchange rates (${formData.currency} → ${value})`,
      });
    } else {
      setFormData((prev) => ({ ...prev, currency: value }));
    }
    if (errors.currency) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.currency;
        return next;
      });
    }
  };

  const handleAddCustomPlan = () => {
    const trimmed = newPlanInput.trim();
    if (!trimmed) return;
    if (PLAN_OPTIONS.includes(trimmed) || customPlans.includes(trimmed)) {
      toast({ title: 'Plan already exists', description: 'Choose a different name.', variant: 'destructive' });
      return;
    }
    setCustomPlans((prev) => [...prev, trimmed]);
    updateField('planName', trimmed);
    setNewPlanInput('');
    setShowAddPlan(false);
  };

  const handleSaveEditPlan = () => {
    if (!editingPlan) return;
    const trimmed = editingPlan.value.trim();
    if (!trimmed) return;
    const oldValue = customPlans[editingPlan.index];
    setCustomPlans((prev) => prev.map((p, i) => (i === editingPlan.index ? trimmed : p)));
    if (formData.planName === oldValue) updateField('planName', trimmed);
    setEditingPlan(null);
  };

  const handleDeleteCustomPlan = (index: number) => {
    const deleted = customPlans[index];
    setCustomPlans((prev) => prev.filter((_, i) => i !== index));
    if (formData.planName === deleted) updateField('planName', '');
  };

  // ─── Service Name Handlers ────────────────────────────────────────────────

  const handleAddCustomServiceName = () => {
    const trimmed = newServiceNameInput.trim();
    if (!trimmed) return;
    if (DEFAULT_SERVICE_NAMES.includes(trimmed) || customServiceNames.includes(trimmed)) {
      toast({ title: 'Service name already exists', description: 'Choose a different name.', variant: 'destructive' });
      return;
    }
    setCustomServiceNames((prev) => [...prev, trimmed]);
    updateField('serviceName', trimmed);
    setNewServiceNameInput('');
    setShowAddServiceName(false);
  };

  const handleSaveEditServiceName = () => {
    if (!editingServiceName) return;
    const trimmed = editingServiceName.value.trim();
    if (!trimmed) return;
    const oldValue = customServiceNames[editingServiceName.index];
    setCustomServiceNames((prev) => prev.map((s, i) => (i === editingServiceName.index ? trimmed : s)));
    if (formData.serviceName === oldValue) updateField('serviceName', trimmed);
    setEditingServiceName(null);
  };

  const handleDeleteCustomServiceName = (index: number) => {
    const deleted = customServiceNames[index];
    setCustomServiceNames((prev) => prev.filter((_, i) => i !== index));
    if (formData.serviceName === deleted) updateField('serviceName', '');
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.clientId) nextErrors.clientId = 'Client is required';
    if (!formData.serviceName.trim()) nextErrors.serviceName = 'Service name is required';
    if (!formData.planName.trim()) nextErrors.planName = 'Plan name is required';

    const price = Number(formData.price);
    if (!Number.isFinite(price) || price <= 0) {
      nextErrors.price = 'Price must be greater than 0';
    }

    if (formData.providerPrice.trim() !== '') {
      const pp = Number(formData.providerPrice);
      if (!Number.isFinite(pp) || pp < 0) {
        nextErrors.providerPrice = 'Provider price must be 0 or greater';
      }
    }

    if (!formData.startDate) nextErrors.startDate = 'Start date is required';
    if (!formData.expiryDate) nextErrors.expiryDate = 'Expiry date is required';
    if (formData.startDate && formData.expiryDate && formData.expiryDate <= formData.startDate) {
      nextErrors.expiryDate = 'Expiry date must be after start date';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const parsedPrice = Number(formData.price);
      const parsedProvider =
        formData.providerPrice.trim() === '' ? null : Number(formData.providerPrice);
      const startDateIso = toIsoDate(formData.startDate);
      const expiryDateIso = toIsoDate(formData.expiryDate);
      const nextInvoiceDate = addBillingCycle(formData.startDate, formData.billingCycle);

      addSubscription({
        clientId: formData.clientId,
        serviceType: formData.serviceType,
        serviceName: formData.serviceName.trim(),
        serviceId: formData.serviceId.trim() || generateSubscriptionServiceId(formData.serviceType),
        planName: formData.planName.trim(),
        billingCycle: formData.billingCycle,
        price: parsedPrice,
        providerPrice: parsedProvider,
        currency: formData.currency,
        startDate: startDateIso,
        expiryDate: expiryDateIso,
        nextInvoiceDate: toIsoDate(nextInvoiceDate),
        autoRenew: formData.autoRenew,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        domainId: formData.domainId || undefined,
      });

      toast({
        title: 'Success',
        description: 'Subscription added successfully',
      });

      router.push('/dashboard/billing/subscriptions');
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to add subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/billing/subscriptions">
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Subscription</h1>
            <p className="text-muted-foreground">Create a new recurring billing subscription</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No clients available. Please add a client first.
          </p>
          <Button asChild>
            <Link href="/dashboard/clients">Add Client</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/billing/subscriptions">
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Subscription</h1>
          <p className="text-muted-foreground">Create a new recurring billing subscription</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 items-start">

          {/* Row 1 — Client | Service Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Client</label>
            <Select
              value={formData.clientId}
              onValueChange={(value) => updateField('clientId', value)}
              key={`client-${formData.clientId}`}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-red-600 mt-1">{errors.clientId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Service Type</label>
            <Select
              value={formData.serviceType}
              onValueChange={(value) => {
                const t = value as Subscription['serviceType'];
                setFormData((prev) => ({
                  ...prev,
                  serviceType: t,
                  serviceId: generateSubscriptionServiceId(t),
                }));
                if (errors.serviceType) {
                  setErrors((prev) => { const next = { ...prev }; delete next.serviceType; return next; });
                }
              }}
              key={`type-${formData.serviceType}`}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2 — Service Name (Add) | Service ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Service Name</label>
              {!showAddServiceName && (
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setShowAddServiceName(true)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            <Select
              value={formData.serviceName || ''}
              onValueChange={(value) => updateField('serviceName', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service name" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_SERVICE_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
                {customServiceNames.map((name) => (
                  <SelectItem key={`custom-${name}`} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showAddServiceName && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={newServiceNameInput}
                  onChange={(e) => setNewServiceNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCustomServiceName(); }
                    if (e.key === 'Escape') { setShowAddServiceName(false); setNewServiceNameInput(''); }
                  }}
                  placeholder="Enter service name..."
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddCustomServiceName} disabled={!newServiceNameInput.trim()}>Save</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddServiceName(false); setNewServiceNameInput(''); }}>Cancel</Button>
              </div>
            )}
            {customServiceNames.length > 0 && (
              <div className="mt-2 rounded-md border border-border divide-y divide-border">
                {customServiceNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5">
                    {editingServiceName?.index === index ? (
                      <>
                        <Input
                          value={editingServiceName.value}
                          onChange={(e) => setEditingServiceName((prev) => prev ? { ...prev, value: e.target.value } : null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveEditServiceName(); }
                            if (e.key === 'Escape') setEditingServiceName(null);
                          }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEditServiceName}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingServiceName(null)}><X className="h-3.5 w-3.5" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm flex-1 truncate">{name}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingServiceName({ index, value: name })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteCustomServiceName(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {errors.serviceName && <p className="text-xs text-red-600 mt-1">{errors.serviceName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Service ID</label>
            <Input
              value={formData.serviceId}
              onChange={(event) => updateField('serviceId', event.target.value)}
              placeholder="e.g. D-17750697"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Auto-generated from service type. Change type to regenerate.</p>
          </div>

          {/* Row 3 — Domain | Plan Name (Add) */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Domain (optional)</label>
            <Select
              value={formData.domainId || 'none'}
              onValueChange={(value) => updateField('domainId', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}{domain.tld}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Plan Name</label>
              {!showAddPlan && (
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setShowAddPlan(true)}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            <Select
              value={formData.planName || ''}
              onValueChange={(value) => updateField('planName', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((plan) => (
                  <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                ))}
                {customPlans.map((plan) => (
                  <SelectItem key={`custom-${plan}`} value={plan}>{plan}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showAddPlan && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={newPlanInput}
                  onChange={(e) => setNewPlanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCustomPlan(); }
                    if (e.key === 'Escape') { setShowAddPlan(false); setNewPlanInput(''); }
                  }}
                  placeholder="Enter plan name..."
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddCustomPlan} disabled={!newPlanInput.trim()}>Save</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddPlan(false); setNewPlanInput(''); }}>Cancel</Button>
              </div>
            )}
            {customPlans.length > 0 && (
              <div className="mt-2 rounded-md border border-border divide-y divide-border">
                {customPlans.map((plan, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5">
                    {editingPlan?.index === index ? (
                      <>
                        <Input
                          value={editingPlan.value}
                          onChange={(e) => setEditingPlan((prev) => prev ? { ...prev, value: e.target.value } : null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveEditPlan(); }
                            if (e.key === 'Escape') setEditingPlan(null);
                          }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEditPlan}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPlan(null)}><X className="h-3.5 w-3.5" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm flex-1 truncate">{plan}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPlan({ index, value: plan })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteCustomPlan(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {errors.planName && <p className="text-xs text-red-600 mt-1">{errors.planName}</p>}
          </div>

          {/* Row 4 — Price | Provider Price */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Price (client)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(event) => updateField('price', event.target.value)}
              placeholder="0.00"
            />
            {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Provider price (internal)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.providerPrice}
              onChange={(event) => updateField('providerPrice', event.target.value)}
              placeholder="Your cost from vendor (optional)"
            />
            <p className="text-xs text-muted-foreground mt-1">Not shown on invoices — used only for margin in Financial Summary.</p>
            {errors.providerPrice && <p className="text-xs text-red-600 mt-1">{errors.providerPrice}</p>}
          </div>

          {/* Row 5 — Currency | Billing Cycle */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Currency</label>
            <Select
              value={formData.currency}
              onValueChange={handleCurrencyChange}
              key={`currency-${formData.currency}`}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Billing Cycle</label>
            <Select
              value={formData.billingCycle}
              onValueChange={(value) => handleBillingCycleChange(value as Subscription['billingCycle'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLES.map((cycle) => (
                  <SelectItem key={cycle} value={cycle}>
                    {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 6 — Start Date | Expiry Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Start Date</label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
            />
            {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
            <Input
              type="date"
              value={formData.expiryDate}
              onChange={(event) => updateField('expiryDate', event.target.value)}
            />
            {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate}</p>}
          </div>

          {/* Row 7 — Status | Auto-renew */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => updateField('status', value as Subscription['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 self-end">
            <div>
              <p className="text-sm font-medium">Auto-renew</p>
              <p className="text-xs text-muted-foreground">Automatically renew this subscription</p>
            </div>
            <Switch
              checked={formData.autoRenew}
              onCheckedChange={(checked) => updateField('autoRenew', checked)}
            />
          </div>
        </div>

        {/* Notes — full width */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
          <Textarea
            value={formData.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={4}
            placeholder="Add any internal notes for this subscription"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" asChild disabled={isLoading}>
            <Link href="/dashboard/billing/subscriptions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Add Subscription'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreateSubscriptionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground text-sm text-center">Loading…</div>}>
      <CreateSubscriptionPageInner />
    </Suspense>
  );
}

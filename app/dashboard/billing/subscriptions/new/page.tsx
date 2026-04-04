'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
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

export default function CreateSubscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, company, addSubscription } = useInvoiceData();
  const [isLoading, setIsLoading] = useState(false);

  const today = useMemo(() => toInputDate(new Date()), []);

  const [formData, setFormData] = useState({
    clientId: '',
    serviceType: 'hosting' as Subscription['serviceType'],
    serviceName: '',
    serviceId: generateSubscriptionServiceId('hosting'),
    planName: '',
    planMode: 'select' as 'select' | 'custom',
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.serviceType;
                    return next;
                  });
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

          <div>
            <label className="block text-sm font-medium mb-1.5">Service Name</label>
            <Input
              value={formData.serviceName}
              onChange={(event) => updateField('serviceName', event.target.value)}
              placeholder="e.g. example.com or VPS-01"
            />
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
            <p className="text-xs text-muted-foreground mt-1">
              Filled automatically from service type (letter + random number). Change service type to regenerate.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-1.5">Plan Name</label>
                <Select
                  value={formData.planMode === 'select' ? formData.planName : '__custom__'}
                  onValueChange={(value) => {
                    if (value === '__custom__') {
                      setFormData((prev) => ({ ...prev, planMode: 'custom' }));
                      return;
                    }
                    updateField('planMode', 'select');
                    updateField('planName', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((plan) => (
                      <SelectItem key={plan} value={plan}>
                        {plan}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Create a new plan...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <label className="block text-sm font-medium">Create Plan</label>
                  {formData.planMode === 'custom' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setFormData((prev) => ({ ...prev, planMode: 'select', planName: '' }))}
                    >
                      Use existing plan
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setFormData((prev) => ({ ...prev, planMode: 'custom', planName: '' }))}
                    >
                      Create Plan
                    </Button>
                  )}
                </div>
                {formData.planMode === 'custom' ? (
                  <Input
                    value={formData.planName}
                    onChange={(event) => updateField('planName', event.target.value)}
                    placeholder="Create a new plan name"
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
                    Pick an existing plan or create a new one.
                  </div>
                )}
              </div>
            </div>
            {errors.planName && <p className="text-xs text-red-600 mt-1">{errors.planName}</p>}
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
            <p className="text-xs text-muted-foreground mt-1">
              Not shown on invoices or payments — used only in Financial Summary for margin.
            </p>
            {errors.providerPrice && <p className="text-xs text-red-600 mt-1">{errors.providerPrice}</p>}
          </div>

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
                  <SelectItem key={curr} value={curr}>
                    {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 mt-7">
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

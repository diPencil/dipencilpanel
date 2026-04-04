'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronLeft, Pencil, Plus, Save, Trash2, AlertTriangle, X } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SERVICE_TYPES: Subscription['serviceType'][] = ['website', 'domain', 'hosting', 'email', 'vps', 'mobile_app'];
const BILLING_CYCLES: Subscription['billingCycle'][] = ['monthly', 'yearly'];
const STATUSES: Subscription['status'][] = ['active', 'suspended', 'expired', 'cancelled'];
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

const toInputDate = (date: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const toIsoDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString();
};

export default function EditSubscriptionPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { subscriptions, clients, company, updateSubscription, deleteSubscription } = useInvoiceData();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const subscription = subscriptions.find(s => s.id === id);

  const [formData, setFormData] = useState({
    clientId: '',
    serviceType: 'hosting' as Subscription['serviceType'],
    serviceName: '',
    serviceId: '',
    planName: '',
    billingCycle: 'monthly' as Subscription['billingCycle'],
    price: '',
    providerPrice: '',
    currency: 'USD',
    startDate: '',
    expiryDate: '',
    autoRenew: true,
    status: 'active' as Subscription['status'],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customPlans, setCustomPlans] = useState<string[]>([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanInput, setNewPlanInput] = useState('');
  const [editingPlan, setEditingPlan] = useState<{ index: number; value: string } | null>(null);
  const customPlansFirstRender = useRef(true);

  const planOptions = useMemo(() => {
    const options = [...PLAN_OPTIONS, ...customPlans];
    if (formData.planName && !options.includes(formData.planName)) {
      options.push(formData.planName);
    }
    return options;
  }, [customPlans, formData.planName]);

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
    if (subscription) {
      setFormData({
        clientId: subscription.clientId,
        serviceType: subscription.serviceType,
        serviceName: subscription.serviceName,
        serviceId: subscription.serviceId,
        planName: subscription.planName,
        billingCycle: subscription.billingCycle,
        price: subscription.price.toString(),
        providerPrice:
          subscription.providerPrice != null && Number.isFinite(subscription.providerPrice)
            ? String(subscription.providerPrice)
            : '',
        currency: subscription.currency,
        startDate: toInputDate(subscription.startDate),
        expiryDate: toInputDate(subscription.expiryDate),
        autoRenew: subscription.autoRenew,
        status: subscription.status,
        notes: subscription.notes || '',
      });
    }
  }, [subscription]);

  useEffect(() => {
    if (!subscription?.planName) return;
    if (PLAN_OPTIONS.includes(subscription.planName)) return;
    setCustomPlans((prev) => (prev.includes(subscription.planName) ? prev : [...prev, subscription.planName]));
  }, [subscription?.planName]);

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

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.clientId) nextErrors.clientId = 'Client is required';
    if (!formData.serviceName.trim()) nextErrors.serviceName = 'Service name is required';
    if (!formData.planName.trim()) nextErrors.planName = 'Plan name is required';

    const price = Number(formData.price);
    if (!Number.isFinite(price) || price < 0) {
      nextErrors.price = 'Price must be 0 or greater';
    }

    if (formData.providerPrice.trim() !== '') {
      const pp = Number(formData.providerPrice);
      if (!Number.isFinite(pp) || pp < 0) {
        nextErrors.providerPrice = 'Provider price must be 0 or greater';
      }
    }

    if (!formData.startDate) nextErrors.startDate = 'Start date is required';
    if (!formData.expiryDate) nextErrors.expiryDate = 'Expiry date is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate() || !subscription) return;

    setIsLoading(true);
    try {
      updateSubscription(subscription.id, {
        clientId: formData.clientId,
        serviceType: formData.serviceType,
        serviceName: formData.serviceName.trim(),
        serviceId: formData.serviceId.trim(),
        planName: formData.planName.trim(),
        billingCycle: formData.billingCycle,
        price: Number(formData.price),
        providerPrice:
          formData.providerPrice.trim() === '' ? null : Number(formData.providerPrice),
        currency: formData.currency,
        startDate: toIsoDate(formData.startDate),
        expiryDate: toIsoDate(formData.expiryDate),
        autoRenew: formData.autoRenew,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      });

      toast({
        title: 'Success',
        description: 'Subscription updated successfully',
      });

      router.push('/dashboard/billing/subscriptions');
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to update subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performDelete = () => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      deleteSubscription(subscription.id);
      toast({
        title: 'Deleted',
        description: 'Subscription deleted successfully',
      });
      setDeleteDialogOpen(false);
      router.push('/dashboard/billing/subscriptions');
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to delete subscription',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-semibold">Subscription not found</h2>
        <Button onClick={() => router.push('/dashboard/billing/subscriptions')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Subscription</h1>
            <p className="text-muted-foreground font-medium">Updating {subscription.serviceName}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isLoading}
           >
             <Trash2 className="h-4 w-4 mr-2" /> Delete
           </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-border/50 shadow-sm overflow-hidden p-8 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
               <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-4">Core Identification</h3>
                <div>
                  <label className="block text-sm font-semibold mb-2">Assign Client</label>
                  <Select 
                    value={formData.clientId} 
                    onValueChange={(value) => updateField('clientId', value)}
                    key={`client-${formData.clientId}`}
                  >
                    <SelectTrigger className="bg-muted/30">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Service Type</label>
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
                      <SelectTrigger className="bg-muted/30">
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
                    <label className="block text-sm font-semibold mb-2">Service ID</label>
                    <Input
                      value={formData.serviceId}
                      onChange={(event) => updateField('serviceId', event.target.value)}
                      className="bg-muted/30 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Type letter + random number (e.g. D-17750697). Changing service type generates a new ID.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Service Display Name</label>
                  <Input
                    value={formData.serviceName}
                    onChange={(event) => updateField('serviceName', event.target.value)}
                    className="bg-muted/30"
                  />
                  {errors.serviceName && <p className="text-xs text-red-600 mt-1">{errors.serviceName}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Plan Details</label>
                  <Select
                    value={formData.planName || ''}
                    onValueChange={(value) => updateField('planName', value)}
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {planOptions.map((plan) => (
                        <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customPlans.length > 0 && (
                    <div className="mt-2 rounded-md border border-border divide-y divide-border">
                      {customPlans.map((plan, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2">
                          {editingPlan?.index === index ? (
                            <>
                              <Input
                                value={editingPlan.value}
                                onChange={(e) => setEditingPlan((prev) => prev ? { ...prev, value: e.target.value } : null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveEditPlan(); }
                                  if (e.key === 'Escape') setEditingPlan(null);
                                }}
                                className="h-7 text-sm flex-1 bg-muted/30"
                                autoFocus
                              />
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEditPlan}>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPlan(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm flex-1">{plan}</span>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPlan({ index, value: plan })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteCustomPlan(index)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showAddPlan ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={newPlanInput}
                        onChange={(e) => setNewPlanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddCustomPlan(); }
                          if (e.key === 'Escape') { setShowAddPlan(false); setNewPlanInput(''); }
                        }}
                        placeholder="Enter plan name..."
                        className="flex-1 bg-muted/30"
                        autoFocus
                      />
                      <Button type="button" onClick={handleAddCustomPlan} disabled={!newPlanInput.trim()}>Save</Button>
                      <Button type="button" variant="outline" onClick={() => { setShowAddPlan(false); setNewPlanInput(''); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={() => setShowAddPlan(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Create custom plan
                    </Button>
                  )}
                  {errors.planName && <p className="text-xs text-red-600 mt-1">{errors.planName}</p>}
                </div>
             </div>

             <div className="space-y-4">
               <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-4">Pricing & Cycle</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Billing Cycle</label>
                    <Select
                      value={formData.billingCycle}
                      onValueChange={(value) => updateField('billingCycle', value as Subscription['billingCycle'])}
                      key={`cycle-${formData.billingCycle}`}
                    >
                      <SelectTrigger className="bg-muted/30">
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
                    <label className="block text-sm font-semibold mb-2">Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => updateField('status', value as Subscription['status'])}
                    >
                      <SelectTrigger className="bg-muted/30">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Price (client)</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(event) => updateField('price', event.target.value)}
                      className="bg-muted/30 font-mono"
                    />
                    {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Provider price (internal)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.providerPrice}
                      onChange={(event) => updateField('providerPrice', event.target.value)}
                      className="bg-muted/30 font-mono"
                      placeholder="Vendor cost (optional)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Not on invoices — Financial Summary margin only.
                    </p>
                    {errors.providerPrice && <p className="text-xs text-red-600 mt-1">{errors.providerPrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Currency</label>
                    <Select
                      value={formData.currency}
                      onValueChange={handleCurrencyChange}
                      key={`currency-${formData.currency}`}
                    >
                      <SelectTrigger className="bg-muted/30 font-mono">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(event) => updateField('startDate', event.target.value)}
                      className="bg-muted/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Expiry Date</label>
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(event) => updateField('expiryDate', event.target.value)}
                      className="bg-muted/30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 bg-muted/10">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">Auto-renew System</p>
                    <p className="text-xs text-muted-foreground">Force generation of next period invoice</p>
                  </div>
                  <Switch
                    checked={formData.autoRenew}
                    onCheckedChange={(checked) => updateField('autoRenew', checked)}
                  />
                </div>
             </div>
           </div>

           <div className="pt-6 border-t border-border/50">
             <label className="block text-sm font-semibold mb-2">Internal Management Notes</label>
             <Textarea
               value={formData.notes}
               onChange={(event) => updateField('notes', event.target.value)}
               rows={4}
               className="bg-muted/30"
               placeholder="Add any internal tracking details or special client requests..."
             />
           </div>

           <div className="flex items-center justify-end gap-3 pt-6 border-transparent">
             <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isLoading} className="font-semibold px-8 hover:bg-muted">
               Discard Changes
             </Button>
             <Button type="submit" disabled={isLoading} className="font-bold px-12 shadow-xl shadow-primary/10">
               {isLoading ? 'Processing...' : 'Save & Update Subscription'}
               {!isLoading && <Save className="ml-2 h-4 w-4" />}
             </Button>
           </div>
        </Card>
      </form>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{subscription.serviceName}</strong> will be removed permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
              onClick={() => performDelete()}
            >
              Delete subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

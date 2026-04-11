'use client';

import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvoiceItemsEditor } from './invoice-items-editor';
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import { useToast } from '@/hooks/use-toast';
import { CURRENCIES } from '@/lib/constants';
import { useInvoiceData } from '@/context/InvoiceContext';
import { convertCurrency } from '@/lib/currency-utils';

interface InvoiceFormProps {
  invoice?: Invoice;
  clients: Client[];
  onSubmit: (data: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
  /** diPencil company invoices: no client picker; uses internal client id on save. */
  variant?: 'client' | 'dipencil';
  dipencilInternalClientId?: string | null;
}

export function InvoiceForm({
  invoice,
  clients,
  onSubmit,
  isLoading,
  variant = 'client',
  dipencilInternalClientId = null,
}: InvoiceFormProps) {
  const { company, currentCompany } = useInvoiceData();
  const sellerCompanyId = company.id && company.id !== 'default' ? company.id : currentCompany.id;

  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || []);
  const pickerClients = clients.filter((c) => !c.isDipencilInternal);

  const [formData, setFormData] = useState({
    clientId: invoice?.clientId || '',
    counterpartyName: invoice?.counterpartyName ?? '',
    counterpartyAddress: invoice?.counterpartyAddress ?? '',
    issueDate: invoice?.issueDate ? invoice.issueDate.split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate ? invoice.dueDate.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextBillingDate: invoice?.nextBillingDate ? invoice.nextBillingDate.split('T')[0] : '',
    currency: invoice?.currency || company.currency || 'USD',
    status: (invoice?.status || 'pending') as 'paid' | 'pending' | 'overdue',
    paymentStatus: (invoice?.paymentStatus || 'unpaid') as 'paid' | 'unpaid',
    notes: invoice?.notes || '',
    serviceType: invoice?.serviceType,
    serviceId: invoice?.serviceId,
    serviceName: invoice?.serviceName,
    subscriptionId: invoice?.subscriptionId,
  });

  useEffect(() => {
    if (invoice) return;
    setFormData((prev) => ({ ...prev, currency: company.currency || prev.currency }));
  }, [invoice, company.id, company.currency]);

  const { toast } = useToast();
  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  const validateForm = () => {
    const newErrors: Partial<typeof formData> = {};

    if (variant === 'client' && !formData.clientId) newErrors.clientId = 'Client is required';
    if (variant === 'dipencil' && !formData.counterpartyName?.trim()) {
      (newErrors as Record<string, string>).counterpartyName = 'Bill-to name is required';
    }
    if (variant === 'dipencil' && !dipencilInternalClientId && !invoice) {
      toast({
        title: 'Error',
        description: 'Workspace is still loading. Please try again in a moment.',
        variant: 'destructive',
      });
      return false;
    }
    if (!formData.issueDate) newErrors.issueDate = 'Issue date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one item is required',
        variant: 'destructive',
      });
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'currency' && value !== formData.currency) {
      // Auto-convert item prices when currency changes
      const updatedItems = items.map(item => ({
        ...item,
        price: Number(convertCurrency(item.price, formData.currency, value, company).toFixed(2))
      }));
      setItems(updatedItems);
      toast({
        title: 'Currency Converted',
        description: `Prices updated based on your exchange rates (${formData.currency} → ${value})`,
      });
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const totals = calculateInvoiceTotals(items);

    const invoiceKind = variant === 'dipencil' ? 'dipencil' : 'client';
    const data: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'> = {
      clientId:
        variant === 'dipencil'
          ? dipencilInternalClientId || invoice?.clientId || ''
          : formData.clientId,
      companyId: sellerCompanyId || '',
      invoiceKind,
      counterpartyName:
        variant === 'dipencil' ? formData.counterpartyName.trim() || null : null,
      counterpartyAddress:
        variant === 'dipencil' ? formData.counterpartyAddress.trim() || null : null,
      issueDate: `${formData.issueDate}T00:00:00.000Z`,
      dueDate: `${formData.dueDate}T00:00:00.000Z`,
      nextBillingDate: formData.nextBillingDate ? `${formData.nextBillingDate}T00:00:00.000Z` : null,
      currency: formData.currency,
      status: formData.status,
      paymentStatus: formData.paymentStatus,
      items,
      notes: formData.notes,
      serviceType: formData.serviceType as any,
      serviceId: formData.serviceId,
      serviceName: formData.serviceName,
      subscriptionId: formData.subscriptionId,
      ...totals,
    };

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top row: Client (or Bill to) | Currency | Status | Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {variant === 'dipencil' ? (
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Bill to (name)</label>
              <Input
                name="counterpartyName"
                value={formData.counterpartyName}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Customer or entity name"
              />
              {(errors as Record<string, string>).counterpartyName && (
                <p className="text-xs text-red-600 mt-1">{(errors as Record<string, string>).counterpartyName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Bill to (address)</label>
              <textarea
                name="counterpartyAddress"
                value={formData.counterpartyAddress}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Address lines (optional)"
                className="w-full min-h-[72px] p-2 rounded-lg border border-input bg-background text-foreground text-sm"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1.5">Client</label>
            <Select value={formData.clientId} onValueChange={(value) => handleSelectChange('clientId', value)}>
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {pickerClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-red-600 mt-1">{errors.clientId}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Currency</label>
          <Select value={formData.currency} onValueChange={(value) => handleSelectChange('currency', value)}>
            <SelectTrigger disabled={isLoading}>
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
          <label className="block text-sm font-medium mb-1.5">Status</label>
          <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
            <SelectTrigger disabled={isLoading}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Payment Status</label>
          <Select value={formData.paymentStatus} onValueChange={(value) => handleSelectChange('paymentStatus', value)}>
            <SelectTrigger disabled={isLoading}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates row — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Issue Date</label>
          <Input
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.issueDate && <p className="text-xs text-red-600 mt-1">{errors.issueDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Due Date</label>
          <Input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            disabled={isLoading}
          />
          {errors.dueDate && <p className="text-xs text-red-600 mt-1">{errors.dueDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Next Billing Date
            <span className="ml-1 text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            type="date"
            name="nextBillingDate"
            value={formData.nextBillingDate}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
      </div>

      <InvoiceItemsEditor
        items={items}
        onItemsChange={setItems}
        currency={formData.currency}
        defaultVat={company.taxRate ?? 0}
      />

      <div>
        <label className="block text-sm font-medium mb-1.5">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional notes or payment terms..."
          className="w-full p-2 rounded-lg border border-input bg-background text-foreground text-sm"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
      </Button>
    </form>
  );
}

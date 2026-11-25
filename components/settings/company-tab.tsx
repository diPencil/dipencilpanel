'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Company } from '@/lib/core/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CURRENCIES } from '@/lib/core/constants';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  Receipt,
  Upload,
  Trash2,
  Loader2,
  Save,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface CompanyTabProps {
  company: Company;
  onSubmit: (data: Partial<Company>) => Promise<{ success: boolean; error?: string }> | void;
  isLoading?: boolean;
}

export function CompanyTab({
  company,
  onSubmit,
  isLoading: parentLoading,
}: CompanyTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: company.name || '',
    address: company.address || '',
    email: company.email || '',
    phone: company.phone || '',
    vatNumber: company.vatNumber || '',
    currency: company.currency || 'USD',
    taxRate: company.taxRate ?? 14,
    invoiceLogo: company.invoiceLogo || '',
    clientInvoiceFooterLeft: company.clientInvoiceFooterLeft ?? 'If you would like assistance with renewal or have any questions, please contact our exclusive service middle east agent.',
    clientInvoiceFooterRight: company.clientInvoiceFooterRight ?? 'Pencil for E-Marketing Ltd. · Technical Agent Provider\nof Hosting & Digital Systems in the Middle East.',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  useEffect(() => {
    setFormData({
      name: company.name || '',
      address: company.address || '',
      email: company.email || '',
      phone: company.phone || '',
      vatNumber: company.vatNumber || '',
      currency: company.currency || 'USD',
      taxRate: company.taxRate ?? 14,
      invoiceLogo: company.invoiceLogo || '',
      clientInvoiceFooterLeft: company.clientInvoiceFooterLeft ?? 'If you would like assistance with renewal or have any questions, please contact our exclusive service middle east agent.',
      clientInvoiceFooterRight: company.clientInvoiceFooterRight ?? 'Pencil for E-Marketing Ltd. · Technical Agent Provider\nof Hosting & Digital Systems in the Middle East.',
    });
  }, [
    company.id,
    company.name,
    company.address,
    company.email,
    company.phone,
    company.vatNumber,
    company.currency,
    company.taxRate,
    company.invoiceLogo,
    company.clientInvoiceFooterLeft,
    company.clientInvoiceFooterRight,
  ]);

  const activeInvoiceLogo = formData.invoiceLogo || '/hostinger-black.svg';

  const validateForm = () => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.vatNumber.trim()) newErrors.vatNumber = 'VAT number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const finalValue = name === 'taxRate' ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, SVG, JPG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, invoiceLogo: result }));
        toast.info('New invoice logo selected.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await onSubmit({
        ...formData,
        invoiceLogo: formData.invoiceLogo || '/hostinger-black.svg',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = parentLoading || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Section 1: Invoice Logo & Full Live Mockup ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Receipt className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Client Invoice Logo &amp; Live Document Preview
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* ── Invoice Logo Card ── */}
          <div className="border border-border rounded-xl p-5 space-y-3 bg-card h-full">
            <div>
              <p className="text-sm font-semibold text-foreground">Invoice Logo</p>
              <p className="text-xs text-muted-foreground">Displayed on invoices sent to clients</p>
            </div>
            <div className="border border-border/80 rounded-lg p-4 bg-muted/30 flex items-center justify-center min-h-[80px]">
              {activeInvoiceLogo ? (
                <img
                  src={activeInvoiceLogo}
                  alt="Invoice logo preview"
                  className="h-12 max-w-[200px] object-contain"
                />
              ) : (
                <span className="text-sm text-muted-foreground">No logo selected</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
              }}
              disabled={isBusy}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex-1 border border-dashed border-border rounded-lg py-2 px-4 text-sm text-center hover:border-primary/50 hover:bg-muted/40 transition-colors disabled:opacity-50 text-foreground font-medium"
              >
                Upload invoice logo
              </button>
              {formData.invoiceLogo && formData.invoiceLogo !== '/hostinger-black.svg' && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, invoiceLogo: '/hostinger-black.svg' }))}
                  disabled={isBusy}
                  className="border border-border rounded-lg py-2 px-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Full Invoice Header & Footer Live Preview */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Complete Client Invoice Preview
              </span>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-[10px]">
                Paid
              </Badge>
            </div>

            {/* Document Surface */}
            <div className="p-3.5 rounded-lg bg-background border border-border space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="h-9 flex items-center">
                    <img
                      src={activeInvoiceLogo}
                      alt="Invoice logo preview"
                      className="h-8 w-auto max-w-[160px] object-contain"
                    />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{formData.name || 'Company Name'}</p>
                  <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-tight">
                    {formData.address || 'Address line'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">VAT: {formData.vatNumber || 'TAX-123456'}</p>
                </div>

                <div className="text-right space-y-0.5">
                  <p className="text-sm font-bold text-foreground">INVOICE</p>
                  <p className="text-[11px] font-mono text-muted-foreground">#INV-2026-0042</p>
                </div>
              </div>

              {/* Sample Line items indicator */}
              <div className="py-2 border-y border-dashed border-border/80 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Domain &amp; Cloud Hosting Plan</span>
                <span className="font-semibold text-foreground">$120.00</span>
              </div>

              {/* Footer Preview */}
              <div className="pt-1 flex items-start justify-between text-[9px] text-muted-foreground leading-tight gap-3">
                <div className="max-w-[180px] space-y-0.5">
                  <p className="font-medium text-foreground">{formData.name || 'Company'}</p>
                  <p className="whitespace-pre-line">{formData.clientInvoiceFooterLeft}</p>
                </div>
                <div className="text-right max-w-[160px] whitespace-pre-line">
                  {formData.clientInvoiceFooterRight}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Header and footer stay synchronized across client invoices.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Company Header Information ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Seller &amp; Company Details (Invoice Header)
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Company Name</label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Hostinger International Ltd."
              disabled={isBusy}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Official Business Address (Appears below company name)
            </label>
            <Textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. 61 Lordou Vironos Street&#10;Larnaca 6023, Cyprus"
              disabled={isBusy}
            />
            {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Contact Email</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="billing@company.com"
                disabled={isBusy}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Contact Phone</label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                disabled={isBusy}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">VAT / Tax Identification Number</label>
            <Input
              type="text"
              name="vatNumber"
              value={formData.vatNumber}
              onChange={handleChange}
              placeholder="e.g. CY10123456X"
              disabled={isBusy}
            />
            {errors.vatNumber && <p className="text-xs text-destructive mt-1">{errors.vatNumber}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Default Currency</label>
              <Select
                value={formData.currency}
                onValueChange={(val) => handleSelectChange('currency', val)}
              >
                <SelectTrigger disabled={isBusy}>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">Default Tax Rate (%)</label>
              <Input
                type="number"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                placeholder="14"
                min="0"
                max="100"
                step="0.01"
                disabled={isBusy}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Client Invoice Footer Settings ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Client Invoice Footer Customization
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Footer Left Text (Support &amp; Renewal Notice)
            </label>
            <Textarea
              name="clientInvoiceFooterLeft"
              value={formData.clientInvoiceFooterLeft}
              onChange={handleChange}
              rows={3}
              placeholder="If you would like assistance with renewal or have any questions, please contact our exclusive service middle east agent."
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Appears on the bottom-left of every client invoice beneath your company name.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Footer Right Text (Agency Provider / Contact)
            </label>
            <Textarea
              name="clientInvoiceFooterRight"
              value={formData.clientInvoiceFooterRight}
              onChange={handleChange}
              rows={3}
              placeholder="Pencil for E-Marketing Ltd. · Technical Agent Provider&#10;of Hosting &amp; Digital Systems in the Middle East."
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Appears on the bottom-right of client invoices. Supports multi-line notes.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-border">
        <Button type="submit" disabled={isBusy} className="gap-2">
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Company &amp; Invoice Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

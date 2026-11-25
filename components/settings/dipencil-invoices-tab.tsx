'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Company } from '@/lib/core/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileSpreadsheet,
  Upload,
  Trash2,
  Loader2,
  Save,
  CheckCircle2,
  FileText,
  Building,
} from 'lucide-react';

interface DipencilInvoicesTabProps {
  company: Company;
  onSubmit: (data: Partial<Company>) => Promise<{ success: boolean; error?: string }> | void;
  isLoading?: boolean;
}

const DEFAULT_SELLER_LINES = `EGY: 10 A Hussein Wassef Street,
Al-Masaha Square, Dokki
KSA: Olaya, Akaria Plaza
Gate D - Level 6, Riyadh`;

export function DipencilInvoicesTab({
  company,
  onSubmit,
  isLoading: parentLoading,
}: DipencilInvoicesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    dipencilLogo: company.dipencilLogo || company.logo || '/pencil-logo.png',
    dipencilSellerName: company.dipencilSellerName ?? (company.ownerName || 'Pencil for E-Marketing Ltd.'),
    dipencilSellerLines: company.dipencilSellerLines ?? DEFAULT_SELLER_LINES,
    dipencilFooterLeft: company.dipencilFooterLeft ?? 'If you would like assistance with renewal or have any questions,\nplease contact our exclusive service engineer.',
    dipencilFooterRight: company.dipencilFooterRight ?? 'Mahmoud El-Sabbagh · Technical Visual Design Engineer\nDon\'t hesitate to reach out : +201003778273',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setFormData({
      dipencilLogo: company.dipencilLogo || company.logo || '/pencil-logo.png',
      dipencilSellerName: company.dipencilSellerName ?? (company.ownerName || 'Pencil for E-Marketing Ltd.'),
      dipencilSellerLines: company.dipencilSellerLines ?? DEFAULT_SELLER_LINES,
      dipencilFooterLeft: company.dipencilFooterLeft ?? 'If you would like assistance with renewal or have any questions,\nplease contact our exclusive service engineer.',
      dipencilFooterRight: company.dipencilFooterRight ?? 'Mahmoud El-Sabbagh · Technical Visual Design Engineer\nDon\'t hesitate to reach out : +201003778273',
    });
  }, [
    company.id,
    company.dipencilLogo,
    company.logo,
    company.ownerName,
    company.dipencilSellerName,
    company.dipencilSellerLines,
    company.dipencilFooterLeft,
    company.dipencilFooterRight,
  ]);

  const activeDpcLogo = formData.dipencilLogo || '/pencil-logo.png';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        setFormData((prev) => ({ ...prev, dipencilLogo: result }));
        toast.info('New diPencil invoice logo selected.');
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
    setIsSaving(true);
    try {
      await onSubmit({
        dipencilLogo: formData.dipencilLogo || '/pencil-logo.png',
        dipencilSellerName: formData.dipencilSellerName,
        dipencilSellerLines: formData.dipencilSellerLines,
        dipencilFooterLeft: formData.dipencilFooterLeft,
        dipencilFooterRight: formData.dipencilFooterRight,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = parentLoading || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Section 1: diPencil Invoice Logo & Live Preview ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            diPencil Invoice Logo &amp; Live Document
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* ── diPencil Invoice Logo Card ── */}
          <div className="border border-border rounded-xl p-5 space-y-3 bg-card h-full">
            <div>
              <p className="text-sm font-semibold text-foreground">diPencil Invoice Logo</p>
              <p className="text-xs text-muted-foreground">Displayed on diPencil system invoices</p>
            </div>
            <div className="border border-border/80 rounded-lg p-4 bg-muted/30 flex items-center justify-center min-h-[80px]">
              {activeDpcLogo ? (
                <img
                  src={activeDpcLogo}
                  alt="diPencil logo preview"
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
                Upload diPencil invoice logo
              </button>
              {formData.dipencilLogo && formData.dipencilLogo !== '/pencil-logo.png' && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, dipencilLogo: '/pencil-logo.png' }))}
                  disabled={isBusy}
                  className="border border-border rounded-lg py-2 px-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Full diPencil Invoice Document Mockup */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                diPencil Invoice Document Preview
              </span>
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-[10px]">
                DPC Invoice
              </Badge>
            </div>

            {/* Document Surface */}
            <div className="p-3.5 rounded-lg bg-background border border-border space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="h-9 flex items-center">
                    <img
                      src={activeDpcLogo}
                      alt="diPencil logo"
                      className="h-8 w-auto max-w-[160px] object-contain"
                    />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {formData.dipencilSellerName || 'Pencil for E-Marketing Ltd.'}
                  </p>
                  <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-tight">
                    {formData.dipencilSellerLines}
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <p className="text-sm font-bold text-foreground">INVOICE</p>
                  <p className="text-[11px] font-mono text-muted-foreground">#DPC-2026-0001</p>
                </div>
              </div>

              {/* Sample item */}
              <div className="py-2 border-y border-dashed border-border/80 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Managed Cloud Cluster Infrastructure</span>
                <span className="font-semibold text-foreground">$450.00</span>
              </div>

              {/* Footer Preview */}
              <div className="pt-1 flex items-start justify-between text-[9px] text-muted-foreground leading-tight gap-3">
                <div className="max-w-[180px] space-y-0.5">
                  <p className="font-medium text-foreground">{formData.dipencilSellerName || 'Pencil for E-Marketing Ltd.'}</p>
                  <p className="whitespace-pre-line">{formData.dipencilFooterLeft}</p>
                </div>
                <div className="text-right max-w-[160px] whitespace-pre-line">
                  {formData.dipencilFooterRight}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Dedicated strictly to /dashboard/billing/dipencil-invoices.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Seller & Branches ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Building className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Seller Entity &amp; Regional Branches
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              diPencil Invoicing Entity Name
            </label>
            <Input
              type="text"
              name="dipencilSellerName"
              value={formData.dipencilSellerName}
              onChange={handleChange}
              placeholder="e.g. Pencil for E-Marketing Ltd."
              disabled={isBusy}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Printed on the top-left of every diPencil Invoice.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Regional Branches &amp; Address Lines (One per line)
            </label>
            <Textarea
              name="dipencilSellerLines"
              value={formData.dipencilSellerLines}
              onChange={handleChange}
              rows={4}
              placeholder="EGY: 10 A Hussein Wassef Street,&#10;Al-Masaha Square, Dokki&#10;KSA: Olaya, Akaria Plaza&#10;Gate D - Level 6, Riyadh"
              disabled={isBusy}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports multiple branches (Egypt, Saudi Arabia, UAE, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 3: diPencil Invoice Footer ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            diPencil Invoice Footer Customization
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Footer Left Text (Assistance &amp; Renewal Notice)
            </label>
            <Textarea
              name="dipencilFooterLeft"
              value={formData.dipencilFooterLeft}
              onChange={handleChange}
              rows={3}
              placeholder="If you would like assistance with renewal or have any questions, please contact our exclusive service engineer."
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Footer Right Text (Service Engineer &amp; Phone)
            </label>
            <Textarea
              name="dipencilFooterRight"
              value={formData.dipencilFooterRight}
              onChange={handleChange}
              rows={3}
              placeholder="Mahmoud El-Sabbagh · Technical Visual Design Engineer&#10;Don't hesitate to reach out : +201003778273"
              disabled={isBusy}
            />
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
              Save diPencil Invoice Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}


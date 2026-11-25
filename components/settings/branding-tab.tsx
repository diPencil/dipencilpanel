'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Company } from '@/lib/core/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  Upload,
  Trash2,
  Loader2,
  Save,
  CheckCircle2,
  LayoutTemplate,
  Globe,
  LogIn,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface BrandingTabProps {
  company: Company;
  onSubmit: (data: Partial<Company>) => Promise<{ success: boolean; error?: string }> | void;
  isLoading?: boolean;
}

export function BrandingTab({
  company,
  onSubmit,
  isLoading: parentLoading,
}: BrandingTabProps) {
  const { user } = useUser();
  const sidebarLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: company.name || '',
    projectName: company.projectName || 'diPencil Panel',
    logo: company.logo || '',
    favicon: company.favicon || '/favicon.svg',
    loginLogo: company.loginLogo || '/favicon.png',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      name: company.name || '',
      projectName: company.projectName || 'diPencil Panel',
      logo: company.logo || '',
      favicon: company.favicon || '/favicon.svg',
      loginLogo: company.loginLogo || '/favicon.png',
    });
  }, [
    company.id,
    company.name,
    company.projectName,
    company.logo,
    company.favicon,
    company.loginLogo,
  ]);

  const activeSidebarLogo = formData.logo && formData.logo !== '/logo.png'
    ? formData.logo
    : '/pencil-logo.png';
  const activeFavicon = formData.favicon || '/favicon.svg';
  const activeLoginLogo = formData.loginLogo || '/favicon.png';

  const handleFileUpload = (file: File, key: 'logo' | 'favicon' | 'loginLogo') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, SVG, JPG, WebP, ICO).');
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
        setFormData((prev) => ({ ...prev, [key]: result }));
        toast.info('New image selected. Click "Save Company & App Settings" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Company name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        projectName: formData.projectName.trim() || 'diPencil Panel',
        logo: formData.logo || '/pencil-logo.png',
        favicon: formData.favicon || '/favicon.svg',
        loginLogo: formData.loginLogo || '/favicon.png',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = parentLoading || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Section 1: Main Names ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Project &amp; Company Names
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Primary Project / App Title
            </label>
            <Input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
              placeholder="e.g. diPencil Panel"
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Appears in browser page title, login screen, and header.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Master Company Name
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Hostinger International Ltd."
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The primary organization name associated with this panel instance.
            </p>
          </div>
        </div>

        {/* Administrator account binding callout */}
        <div className="rounded-xl border border-border p-4 bg-muted/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Administrator Binding</p>
              <p className="text-[11px] text-muted-foreground">
                Current active admin user: <span className="font-mono text-foreground font-semibold">{user?.username || 'dipencil'}</span> ({formData.projectName})
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-[11px]">
            Connected
          </Badge>
        </div>
      </div>

      {/* ── Section 2: Branding Logos & Favicon (All 3 Side by Side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* ── 1. System Logo (Widest 5/12) ── */}
        <div className="lg:col-span-5 border border-border rounded-xl p-4 bg-card flex flex-col justify-between space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">System Logo</p>
            <p className="text-xs text-muted-foreground">Displayed in the main sidebar</p>
          </div>
          <div className="border border-border/80 rounded-lg p-3 bg-muted/30 flex items-center justify-center min-h-[75px]">
            {activeSidebarLogo ? (
              <img
                src={activeSidebarLogo}
                alt="System logo preview"
                className="h-10 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No logo selected</span>
            )}
          </div>
          <input
            ref={sidebarLogoInputRef}
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'logo');
            }}
            disabled={isBusy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sidebarLogoInputRef.current?.click()}
              disabled={isBusy}
              className="flex-1 border border-dashed border-border rounded-lg py-1.5 px-3 text-xs text-center hover:border-primary/50 hover:bg-muted/40 transition-colors disabled:opacity-50 text-foreground font-medium"
            >
              Upload system logo
            </button>
            {formData.logo && formData.logo !== '/pencil-logo.png' && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, logo: '/pencil-logo.png' }))}
                disabled={isBusy}
                className="border border-border rounded-lg py-1.5 px-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Login Page Logo (Medium 4/12) ── */}
        <div className="lg:col-span-4 border border-border rounded-xl p-4 bg-card flex flex-col justify-between space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Login Page Logo</p>
            <p className="text-xs text-muted-foreground">Displayed on login card (/login)</p>
          </div>
          <div className="border border-border/80 rounded-lg p-3 bg-muted/30 flex items-center justify-center min-h-[75px]">
            {activeLoginLogo ? (
              <img
                src={activeLoginLogo}
                alt="Login logo preview"
                className="h-10 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No logo selected</span>
            )}
          </div>
          <input
            ref={loginLogoInputRef}
            type="file"
            accept="image/*,.svg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'loginLogo');
            }}
            disabled={isBusy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loginLogoInputRef.current?.click()}
              disabled={isBusy}
              className="flex-1 border border-dashed border-border rounded-lg py-1.5 px-3 text-xs text-center hover:border-primary/50 hover:bg-muted/40 transition-colors disabled:opacity-50 text-foreground font-medium"
            >
              Upload login logo
            </button>
            {formData.loginLogo && formData.loginLogo !== '/favicon.png' && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, loginLogo: '/favicon.png' }))}
                disabled={isBusy}
                className="border border-border rounded-lg py-1.5 px-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Browser Favicon (Smallest 3/12) ── */}
        <div className="lg:col-span-3 border border-border rounded-xl p-4 bg-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Browser Favicon</p>
              <p className="text-xs text-muted-foreground">Tab &amp; mini icon</p>
            </div>
            <span className="text-[10px] text-muted-foreground">1:1</span>
          </div>
          <div className="border border-border/80 rounded-lg p-3 bg-muted/30 flex items-center justify-center min-h-[75px]">
            <div className="h-9 w-9 rounded-lg border border-border bg-background p-1 flex items-center justify-center shadow-xs">
              <img src={activeFavicon} alt="Favicon preview" className="h-full w-full object-contain" />
            </div>
          </div>
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*,.svg,.ico"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'favicon');
            }}
            disabled={isBusy}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => faviconInputRef.current?.click()}
              disabled={isBusy}
              className="flex-1 border border-dashed border-border rounded-lg py-1.5 px-3 text-xs text-center hover:border-primary/50 hover:bg-muted/40 transition-colors disabled:opacity-50 text-foreground font-medium"
            >
              Upload favicon
            </button>
            {formData.favicon && formData.favicon !== '/favicon.svg' && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, favicon: '/favicon.svg' }))}
                disabled={isBusy}
                className="border border-border rounded-lg py-1.5 px-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
              >
                Reset
              </button>
            )}
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
              Save Company Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}


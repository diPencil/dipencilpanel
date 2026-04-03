'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CURRENCIES } from '@/lib/constants';

interface CompanyInfoFormProps {
  company: Company;
  onSubmit: (company: Partial<Company>) => void;
  isLoading?: boolean;
}

export function CompanyInfoForm({
  company,
  onSubmit,
  isLoading,
}: CompanyInfoFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceLogoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    logo: company.logo,
    invoiceLogo: company.invoiceLogo,
    name: company.name,
    address: company.address,
    email: company.email,
    phone: company.phone,
    vatNumber: company.vatNumber,
    currency: company.currency,
    taxRate: company.taxRate,
  });

  useEffect(() => {
    setFormData({
      logo: company.logo,
      invoiceLogo: company.invoiceLogo,
      name: company.name,
      address: company.address,
      email: company.email,
      phone: company.phone,
      vatNumber: company.vatNumber,
      currency: company.currency,
      taxRate: company.taxRate,
    });
  }, [
    company.id,
    company.logo,
    company.invoiceLogo,
    company.name,
    company.address,
    company.email,
    company.phone,
    company.vatNumber,
    company.currency,
    company.taxRate,
  ]);

  const { toast } = useToast();
  const [errors, setErrors] = useState<Partial<typeof formData>>({});
  
  const systemLogo = formData.logo && formData.logo !== '/logo.png' ? formData.logo : '/pencil-logo.png';
  const invoiceLogoDisplay = formData.invoiceLogo || '/hostinger-black.svg';

  const validateForm = () => {
    const newErrors: Partial<typeof formData> = {};

    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.vatNumber.trim()) newErrors.vatNumber = 'VAT number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // ensure fallbacks are saved if empty
    const finalData = {
        ...formData,
        logo: formData.logo || '/pencil-logo.png',
        invoiceLogo: formData.invoiceLogo || '/hostinger-black.svg'
    };

    onSubmit(finalData);
    toast({
      title: 'Success',
      description: 'Company settings updated successfully',
    });
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFormData((prev) => ({ ...prev, logo: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFormData((prev) => ({ ...prev, invoiceLogo: result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── System Logo ── */}
        <div className="border rounded-xl p-5 space-y-3 h-full">
        <div>
          <p className="text-sm font-semibold">System Logo</p>
          <p className="text-xs text-muted-foreground">Displayed in the sidebar</p>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[80px]">
          {systemLogo ? (
            <img src={systemLogo} alt="System logo preview" className="h-12 max-w-[200px] object-contain" />
          ) : (
            <span className="text-sm text-muted-foreground">No logo selected</span>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={handleLogoFileChange} disabled={isLoading} />
        <div className="flex gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading}
            className="flex-1 border border-dashed border-gray-300 rounded-lg py-2 px-4 text-sm text-center hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Upload system logo
          </button>
          {formData.logo && (
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, logo: '' }))} disabled={isLoading}
              className="border border-gray-200 rounded-lg py-2 px-3 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
        </div>

        {/* ── Invoice Logo ── */}
        <div className="border rounded-xl p-5 space-y-3 h-full">
        <div>
          <p className="text-sm font-semibold">Invoice Logo</p>
          <p className="text-xs text-muted-foreground">Displayed on invoices sent to clients</p>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[80px]">
          {invoiceLogoDisplay ? (
            <img src={invoiceLogoDisplay} alt="Invoice logo preview" className="h-12 max-w-[200px] object-contain" />
          ) : (
            <span className="text-sm text-muted-foreground">No logo selected</span>
          )}
        </div>
        <input ref={invoiceLogoInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={handleInvoiceLogoFileChange} disabled={isLoading} />
        <div className="flex gap-2">
          <button type="button" onClick={() => invoiceLogoInputRef.current?.click()} disabled={isLoading}
            className="flex-1 border border-dashed border-gray-300 rounded-lg py-2 px-4 text-sm text-center hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Upload invoice logo
          </button>
          {formData.invoiceLogo && (
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, invoiceLogo: '' }))} disabled={isLoading}
              className="border border-gray-200 rounded-lg py-2 px-3 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Company Name</label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your Company Name"
          disabled={isLoading}
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Address</label>
        <Input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Business Street, City, Country"
          disabled={isLoading}
        />
        {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contact@company.com"
            disabled={isLoading}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Phone</label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 (555) 123-4567"
            disabled={isLoading}
          />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">VAT Number</label>
        <Input
          type="text"
          name="vatNumber"
          value={formData.vatNumber}
          onChange={handleChange}
          placeholder="VAT123456789"
          disabled={isLoading}
        />
        {errors.vatNumber && <p className="text-xs text-red-600 mt-1">{errors.vatNumber}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Default Currency</label>
          <Select
            value={formData.currency}
            onValueChange={(value) => handleSelectChange('currency', value)}
          >
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
          <label className="block text-sm font-medium mb-1.5">Default Tax Rate (%)</label>
          <Input
            type="number"
            name="taxRate"
            value={formData.taxRate}
            onChange={handleChange}
            placeholder="10"
            min="0"
            max="100"
            step="0.01"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}

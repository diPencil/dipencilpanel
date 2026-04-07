'use client';

import React, { useEffect, useState } from 'react';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoiceData } from '@/context/InvoiceContext';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => void;
  isLoading?: boolean;
}

export function ClientForm({ client, onSubmit, isLoading }: ClientFormProps) {
  const { clientGroups, allCompanies, currentCompany } = useInvoiceData();
  const initialGroupId = clientGroups.find(g => g.clientIds.includes(client?.id || ''))?.id || 'none';

  const buildFormData = () => ({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    companyName: client?.companyName || currentCompany?.name || '',
    companyId: client?.companyId || currentCompany?.id || '',
    groupId: initialGroupId,
  });

  const [formData, setFormData] = useState(buildFormData);

  const { toast } = useToast();
  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  useEffect(() => {
    setFormData(buildFormData());
  }, [client, currentCompany?.id, currentCompany?.name, initialGroupId]);

  const validateForm = () => {
    const newErrors: Partial<typeof formData> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, groupId: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSubmit(formData as any);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      companyName: currentCompany?.name || '',
      companyId: currentCompany?.id || '',
      groupId: 'none'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Client Name</label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          disabled={isLoading}
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Email</label>
        <Input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
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

      <div>
        <label className="block text-sm font-medium mb-1.5">Address</label>
        <Input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Main Street, City, Country"
          disabled={isLoading}
        />
        {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Company
          </label>
          <Select
              value={formData.companyId || 'none'}
              onValueChange={(value) => {
                const selected = allCompanies.find(co => co.id === value);
                setFormData((prev) => ({
                  ...prev,
                  companyId: value === 'none' ? '' : value,
                  companyName: selected ? selected.name : (value === 'none' ? '' : prev.companyName),
                }));
                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined }));
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No company</span>
                </SelectItem>
                {allCompanies.map((co) => (
                  <SelectItem key={co.id} value={co.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{co.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          {errors.companyName && (
            <p className="text-xs text-red-600 mt-1">{errors.companyName}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Client Group</label>
          <Select value={formData.groupId} onValueChange={handleSelectChange} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Group</SelectItem>
              {clientGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${group.color?.split(' ')[0]}`} />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : client ? 'Update Client' : 'Add Client'}
      </Button>
    </form>
  );
}

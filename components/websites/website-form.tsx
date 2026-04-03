'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Website } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const websiteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required'),
  clientId: z.string().min(1, 'Client is required'),
  type: z.enum(['wordpress', 'node', 'php', 'html']),
  storage: z.number().min(1, 'Storage is required'),
  bandwidth: z.number().min(1, 'Bandwidth is required'),
  planName: z.string().min(1, 'Plan name is required'),
  price: z.number().min(0, 'Price must be positive'),
  billingCycle: z.enum(['monthly', 'yearly']),
  status: z.enum(['active', 'inactive', 'suspended']),
});

type WebsiteFormData = z.infer<typeof websiteSchema>;

interface WebsiteFormProps {
  website?: Website;
  initialType?: string;
  onSuccess?: () => void;
}

export function WebsiteForm({ website, initialType, onSuccess }: WebsiteFormProps) {
  const router = useRouter();
  const { addWebsite, updateWebsite, clients } = useInvoiceData();
  const { register, handleSubmit, formState: { errors } } = useForm<WebsiteFormData>({
    resolver: zodResolver(websiteSchema),
    defaultValues: website ? {
      name: website.name,
      domain: website.domain,
      clientId: website.clientId,
      type: website.type,
      storage: website.storage,
      bandwidth: website.bandwidth,
      planName: website.plan.name,
      price: website.plan.price,
      billingCycle: website.plan.billingCycle,
      status: website.status,
    } : {
      type: (initialType as any) || 'wordpress',
      planName: 'Professional',
      billingCycle: 'monthly',
      status: 'active',
      clientId: '',
    },
  });

  const onSubmit = (data: WebsiteFormData) => {
    if (website) {
      updateWebsite(website.id, {
        name: data.name,
        domain: data.domain,
        type: data.type,
        storage: data.storage,
        bandwidth: data.bandwidth,
        plan: {
          name: data.planName,
          price: data.price,
          billingCycle: data.billingCycle,
        },
        status: data.status,
      });
    } else {
      addWebsite({
        name: data.name,
        domain: data.domain,
        clientId: data.clientId,
        type: data.type,
        storage: data.storage,
        bandwidth: data.bandwidth,
        plan: {
          name: data.planName,
          price: data.price,
          billingCycle: data.billingCycle,
        },
        status: data.status,
        linkedDomain: data.domain,
      });
    }

    onSuccess?.();
    router.push('/dashboard/websites');
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Website Name</label>
            <input
              {...register('name')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="My Business Site"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Domain</label>
            <input
              {...register('domain')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="example.com"
            />
            {errors.domain && <p className="text-xs text-destructive mt-1">{errors.domain.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              {...register('type')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="wordpress">WordPress</option>
              <option value="node">Node.js</option>
              <option value="php">PHP</option>
              <option value="html">HTML</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Storage (GB)</label>
            <input
              {...register('storage', { valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="50"
            />
            {errors.storage && <p className="text-xs text-destructive mt-1">{errors.storage.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bandwidth (GB)</label>
            <input
              {...register('bandwidth', { valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="100"
            />
            {errors.bandwidth && <p className="text-xs text-destructive mt-1">{errors.bandwidth.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Plan Name</label>
            <input
              {...register('planName')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Professional"
            />
            {errors.planName && <p className="text-xs text-destructive mt-1">{errors.planName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Monthly Price ($)</label>
            <input
              {...register('price', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="19.99"
            />
            {errors.price && <p className="text-xs text-destructive mt-1">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Billing Cycle</label>
            <select
              {...register('billingCycle')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">
            {website ? 'Update Website' : 'Create Website'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smartphone, Globe, HardDrive, Server, Mail, CreditCard, User,
  ArrowLeft, Pencil, Trash2, PlayCircle, PauseCircle, AlertTriangle,
  Calendar, RefreshCw, DollarSign, CheckCircle2, Clock, XCircle,
  FileText, Activity,
} from 'lucide-react';
import { AppStatusBadge, AppTypeBadge, AppPlanBadge, AppFrameworkBadge } from './app-badge';
import type { MobileApp } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';

interface AppDetailProps {
  app: MobileApp;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-36">{label}</span>
      <div className="text-sm font-medium text-right">{children}</div>
    </div>
  );
}

function ServiceTile({
  icon: Icon, label, value, warning, color,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  warning?: boolean;
  color?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-4',
      warning ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' : 'bg-muted/30',
    )}>
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', color ?? 'bg-muted')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          <p className="text-sm font-semibold truncate">{value}</p>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Not linked</p>
        )}
      </div>
      {warning && <AlertTriangle className="h-4 w-4 text-amber-500 ml-auto shrink-0" />}
    </div>
  );
}

export function AppDetail({ app }: AppDetailProps) {
  const router = useRouter();
  const { clients, domains, hosting, vps, emails, subscriptions, invoices, deleteMobileApp, setMobileAppStatus } = useInvoiceData();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const client = clients.find((c) => c.id === app.clientId);
  const domain = domains.find((d) => d.id === app.domainId);
  const hostingAccount = hosting.find((h) => h.id === app.hostingId);
  const vpsAccount = vps.find((v) => v.id === app.vpsId);
  const linkedEmails = emails.filter((e) => app.emailIds.includes(e.id));
  const subscription = subscriptions.find((s) => s.id === app.subscriptionId);
  const appInvoices = invoices.filter((inv) => inv.subscriptionId === app.subscriptionId).slice(0, 5);

  const handleDelete = () => {
    deleteMobileApp(app.id);
    toast.success(`${app.name} deleted`);
    router.push('/dashboard/mobile-apps');
  };

  const handleStatusToggle = () => {
    const newStatus = app.status === 'live' ? 'suspended' : 'live';
    setMobileAppStatus(app.id, newStatus);
    toast.success(`App status changed to ${newStatus}`);
  };

  const invoiceStatusIcon = (status: string) => {
    if (status === 'paid') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === 'overdue') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/mobile-apps')} className="shrink-0 mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{app.name}</h1>
              <AppStatusBadge status={app.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <AppTypeBadge type={app.appType} />
              <AppFrameworkBadge framework={app.framework} />
              <AppPlanBadge plan={app.plan} />
              <span>·</span>
              <span>{client?.name ?? 'Unknown Client'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}
            className={cn(app.status === 'live' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700')}
          >
            {app.status === 'live'
              ? <><PauseCircle className="h-4 w-4 mr-2" />Suspend</>
              : <><PlayCircle className="h-4 w-4 mr-2" />Go Live</>
            }
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/mobile-apps/${app.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />Infrastructure
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />Services
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />Billing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                App Details
              </h3>
              <div className="divide-y">
                <InfoRow label="App Name">{app.name}</InfoRow>
                <InfoRow label="Client">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {client?.name ?? '—'}
                  </div>
                </InfoRow>
                <InfoRow label="Platform"><AppTypeBadge type={app.appType} /></InfoRow>
                <InfoRow label="Framework"><AppFrameworkBadge framework={app.framework} /></InfoRow>
                <InfoRow label="Status"><AppStatusBadge status={app.status} /></InfoRow>
                <InfoRow label="Plan"><AppPlanBadge plan={app.plan} /></InfoRow>
                {app.description && (
                  <InfoRow label="Description">
                    <span className="text-right text-muted-foreground">{app.description}</span>
                  </InfoRow>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Timeline
              </h3>
              <div className="divide-y">
                <InfoRow label="Created">{new Date(app.createdAt).toLocaleDateString()}</InfoRow>
                {app.expiryDate && (
                  <InfoRow label="Expires">
                    <span className={cn(
                      new Date(app.expiryDate) < new Date() ? 'text-red-600' :
                      new Date(app.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' : '',
                    )}>
                      {new Date(app.expiryDate).toLocaleDateString()}
                    </span>
                  </InfoRow>
                )}
                <InfoRow label="Auto-renew">
                  <Badge variant="outline" className={app.autoRenew ? 'text-emerald-700 border-emerald-300' : 'text-muted-foreground'}>
                    {app.autoRenew ? 'Enabled' : 'Disabled'}
                  </Badge>
                </InfoRow>
                <InfoRow label="Billing Cycle">
                  <span className="capitalize">{app.billingCycle}</span>
                </InfoRow>
              </div>
            </Card>
          </div>

          {/* Missing service warnings */}
          {(!app.domainId || (!app.hostingId && !app.vpsId)) && (
            <Card className="p-5 border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Incomplete Setup
              </h3>
              <div className="space-y-2">
                {!app.domainId && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <Globe className="h-4 w-4 shrink-0" />
                    No domain linked to this application
                  </div>
                )}
                {!app.hostingId && !app.vpsId && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <HardDrive className="h-4 w-4 shrink-0" />
                    No hosting or VPS infrastructure linked
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ServiceTile
              icon={Globe}
              label="Domain"
              value={domain ? `${domain.name}${domain.tld}` : undefined}
              warning={!domain}
              color={domain ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : undefined}
            />
            {hostingAccount ? (
              <ServiceTile
                icon={HardDrive}
                label="Hosting"
                value={`${hostingAccount.planName} (${hostingAccount.type})`}
                color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              />
            ) : vpsAccount ? (
              <ServiceTile
                icon={Server}
                label="VPS"
                value={`${vpsAccount.planName} — ${vpsAccount.cpu}vCPU / ${vpsAccount.ram}GB RAM`}
                color="bg-violet-100 dark:bg-violet-900/30 text-violet-600"
              />
            ) : (
              <ServiceTile
                icon={HardDrive}
                label="Server (Hosting / VPS)"
                warning
              />
            )}
          </div>

          {domain && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4 text-sm">Domain Details</h3>
              <div className="divide-y">
                <InfoRow label="Domain">{domain.name}{domain.tld}</InfoRow>
                <InfoRow label="Registrar">{domain.registrar}</InfoRow>
                <InfoRow label="Status"><Badge variant="outline" className="capitalize">{domain.status}</Badge></InfoRow>
                <InfoRow label="Expiry">{new Date(domain.expiryDate).toLocaleDateString()}</InfoRow>
                <InfoRow label="Auto-renew">{domain.autoRenew ? 'Yes' : 'No'}</InfoRow>
              </div>
            </Card>
          )}

          {hostingAccount && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4 text-sm">Hosting Details</h3>
              <div className="divide-y">
                <InfoRow label="Name">{hostingAccount.name}</InfoRow>
                <InfoRow label="Plan">{hostingAccount.planName}</InfoRow>
                <InfoRow label="Type"><span className="capitalize">{hostingAccount.type}</span></InfoRow>
                <InfoRow label="Status"><Badge variant="outline" className="capitalize">{hostingAccount.status}</Badge></InfoRow>
              </div>
            </Card>
          )}

          {vpsAccount && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4 text-sm">VPS Details</h3>
              <div className="divide-y">
                <InfoRow label="Name">{vpsAccount.name}</InfoRow>
                <InfoRow label="Plan">{vpsAccount.planName}</InfoRow>
                <InfoRow label="CPU">{vpsAccount.cpu} vCPU</InfoRow>
                <InfoRow label="RAM">{vpsAccount.ram} GB</InfoRow>
                <InfoRow label="Storage">{vpsAccount.storage} GB</InfoRow>
                <InfoRow label="Status"><Badge variant="outline" className="capitalize">{vpsAccount.status}</Badge></InfoRow>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4 mt-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Linked Emails
              <Badge variant="secondary">{linkedEmails.length}</Badge>
            </h3>
            {linkedEmails.length === 0 ? (
              <div className="py-8 text-center">
                <Mail className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No email accounts linked</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedEmails.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{e.name}@{e.domain}</p>
                      <p className="text-xs text-muted-foreground">{e.storage}GB storage</p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">active</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Monthly Price</p>
              <p className="text-2xl font-bold">{formatCurrency(app.price)}</p>
              <p className="text-xs text-muted-foreground">Per {app.billingCycle}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Subscription Status</p>
              <div className="flex items-center gap-2 mt-1">
                {subscription ? (
                  <Badge variant="outline" className={cn(
                    'capitalize',
                    subscription.status === 'active' ? 'text-emerald-700 border-emerald-300' :
                    'text-muted-foreground',
                  )}>
                    {subscription.status}
                  </Badge>
                ) : <span className="text-sm text-muted-foreground">No subscription</span>}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Next Invoice</p>
              <p className="text-sm font-semibold">
                {subscription?.expiryDate
                  ? new Date(subscription.expiryDate).toLocaleDateString()
                  : '—'}
              </p>
            </Card>
          </div>

          {subscription && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Subscription
              </h3>
              <div className="divide-y">
                <InfoRow label="Plan">{subscription.planName ?? '—'}</InfoRow>
                <InfoRow label="Price">{formatCurrency(subscription.price)} / {subscription.billingCycle}</InfoRow>
                <InfoRow label="Start Date">{new Date(subscription.startDate).toLocaleDateString()}</InfoRow>
                <InfoRow label="End Date">{new Date(subscription.expiryDate).toLocaleDateString()}</InfoRow>
                <InfoRow label="Auto-renew">
                  <Badge variant="outline" className={app.autoRenew ? 'text-emerald-700 border-emerald-300' : ''}>
                    {app.autoRenew ? 'Yes' : 'No'}
                  </Badge>
                </InfoRow>
              </div>
            </Card>
          )}

          {appInvoices.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Recent Invoices
              </h3>
              <div className="space-y-2">
                {appInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      {invoiceStatusIcon(inv.status)}
                      <div>
                        <p className="text-sm font-medium">#{inv.number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(inv.total)}</p>
                      <Badge variant="outline" className={cn('text-xs capitalize',
                        inv.status === 'paid' ? 'text-emerald-700 border-emerald-300' :
                        inv.status === 'overdue' ? 'text-red-600 border-red-300' : '',
                      )}>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Application?"
        description={`Are you sure you want to delete "${app.name}"? This cannot be undone.`}
      />
    </div>
  );
}

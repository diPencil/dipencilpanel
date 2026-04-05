'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Edit2, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from '@/lib/formatting';
import { convertCurrency } from '@/lib/currency-utils';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
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
import type { Subscription } from '@/lib/types';
import { SubscriptionStatusBadge } from '@/components/subscriptions/subscription-status-badge';
import { getSubscriptionDisplayStatus } from '@/lib/subscription-display-status';
import { RenewSubscriptionDialog } from '@/components/subscriptions/renew-subscription-dialog';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { subscriptions, clients, company, domains = [], getClient, cancelSubscription, updateSubscription, renewSubscription, deleteSubscription } = useInvoiceData();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceConfirmTarget, setInvoiceConfirmTarget] = useState<Subscription | null>(null);
  const [renewScheduleTarget, setRenewScheduleTarget] = useState<Subscription | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const client = getClient(sub.clientId);
    const searchString = `${client?.name} ${sub.serviceName} ${sub.planName}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const companyCurrency = company.currency || 'USD';
  const filteredTotalPricing =
    searchTerm.trim().length > 0
      ? filteredSubscriptions.reduce(
          (sum, sub) =>
            sum + convertCurrency(sub.price, sub.currency || companyCurrency, companyCurrency, company),
          0
        )
      : null;

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'website': return <Badge variant="outline" className="border-blue-500/30 text-blue-500">Website</Badge>;
      case 'vps': return <Badge variant="outline" className="border-purple-500/30 text-purple-500">VPS</Badge>;
      case 'email': return <Badge variant="outline" className="border-cyan-500/30 text-cyan-500">Email</Badge>;
      case 'domain': return <Badge variant="outline" className="border-orange-500/30 text-orange-500">Domain</Badge>;
      case 'hosting': return <Badge variant="outline" className="border-teal-500/30 text-teal-500">Hosting</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage recurring services and billing cycles</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search subscriptions..." 
              className="pl-9 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-describedby={
                filteredTotalPricing !== null
                  ? 'subscriptions-search-count subscriptions-search-total'
                  : 'subscriptions-search-count'
              }
            />
          </div>
          <div className="flex flex-col gap-0.5 shrink-0 items-start leading-tight">
            <p
              id="subscriptions-search-count"
              className="text-sm text-muted-foreground whitespace-nowrap tabular-nums"
              aria-live="polite"
            >
              <span className="font-semibold text-foreground">{filteredSubscriptions.length}</span>
              {filteredSubscriptions.length === 1 ? ' subscription' : ' subscriptions'}
              {searchTerm.trim()
                ? filteredSubscriptions.length === 1
                  ? ' matches'
                  : ' match'
                : ''}
            </p>
            {filteredTotalPricing !== null && (
              <p
                id="subscriptions-search-total"
                className="text-sm text-muted-foreground whitespace-nowrap tabular-nums"
                aria-live="polite"
              >
                Total pricing:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(filteredTotalPricing, companyCurrency)}
                </span>
              </p>
            )}
          </div>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/dashboard/billing/subscriptions/new">Add Subscription</Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold">Client Name</th>
                <th className="px-6 py-4 text-sm font-semibold">Service</th>
                <th className="px-6 py-4 text-sm font-semibold">Plan</th>
                <th className="px-6 py-4 text-sm font-semibold">Cycle</th>
                <th className="px-6 py-4 text-sm font-semibold">Price</th>
                <th className="px-6 py-4 text-sm font-semibold">Date Range</th>
                <th className="px-6 py-4 text-sm font-semibold">Auto-renew</th>
                <th className="px-6 py-4 text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-20" />
                      <p>No subscriptions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const client = getClient(sub.clientId);
                  const exp = new Date(sub.expiryDate).getTime();
                  const now = Date.now();
                  const week = 7 * 24 * 60 * 60 * 1000;
                  const isExpiringSoon = exp >= now && exp < now + week;
                  const displayStatus = getSubscriptionDisplayStatus(sub);
                  const isExpiredOrInactive =
                    displayStatus === 'inactive' || displayStatus === 'expired';

                  return (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{client?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">{client?.email || ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{sub.serviceName}</span>
                          {(() => {
                            const linked = sub.domainId
                              ? domains.find((d) => d.id === sub.domainId)
                              : domains.find((d) => d.subscriptionId === sub.id);
                            return linked ? (
                              <span className="text-xs text-muted-foreground">{linked.name}{linked.tld}</span>
                            ) : null;
                          })()}
                          {getServiceTypeBadge(sub.serviceType)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{sub.planName}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="capitalize text-[10px] h-5">
                          {sub.billingCycle}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-sm">
                        {formatCurrency(sub.price, sub.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">From: {formatDate(sub.startDate)}</span>
                          <span className={isExpiringSoon ? "text-xs font-medium text-red-500" : "text-xs text-muted-foreground"}>
                            Exp: {formatDate(sub.expiryDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Switch 
                          checked={sub.autoRenew} 
                          onCheckedChange={(val) => updateSubscription(sub.id, { autoRenew: val })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <SubscriptionStatusBadge subscription={sub} className="text-[10px] h-5" />
                          {isExpiringSoon && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse text-[10px]">Expiring</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="group-hover:bg-accent rounded-full h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="gap-2" 
                              onClick={() => router.push(`/dashboard/billing/subscriptions/${sub.id}`)}
                            >
                              <Eye className="h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2" 
                              onClick={() => router.push(`/dashboard/billing/subscriptions/${sub.id}/edit`)}
                            >
                              <Edit2 className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2" 
                              onClick={() => setInvoiceConfirmTarget(sub)}
                            >
                              <FileText className="h-4 w-4" /> Generate Invoice
                            </DropdownMenuItem>
                            {isExpiredOrInactive ? (
                              <DropdownMenuItem
                                className="gap-2 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30"
                                onClick={() => setRenewScheduleTarget(sub)}
                              >
                                <RefreshCcw className="h-4 w-4" /> Renewal
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/30"
                                onClick={() => setCancelTarget(sub)}
                              >
                                <XCircle className="h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeleteTarget(sub)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Smart Feature Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-primary/5 border-primary/10 shadow-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Auto-generation Active</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When <strong>Auto-renew</strong> is enabled on a subscription, a renewal invoice is created automatically
            once its end date is within 7 days (or overdue), each time your workspace data syncs (e.g. opening the panel).
            If an unpaid invoice is already linked to that subscription, another is not created until it is paid.
          </p>
        </Card>
        
        <Card className="p-6 bg-yellow-500/5 border-yellow-500/10 shadow-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-yellow-800">Expiring Soon</h3>
          </div>
          <p className="text-sm text-yellow-800/70 leading-relaxed">
            You have {subscriptions.filter(s => s.status === 'active' && new Date(s.expiryDate).getTime() < (Date.now() + 7 * 24 * 60 * 60 * 1000)).length} subscriptions expiring within the next 7 days. 
            Review these items to prevent service interruption.
          </p>
        </Card>
      </div>

      <AlertDialog open={!!invoiceConfirmTarget} onOpenChange={(open) => !open && setInvoiceConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate renewal invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              A new invoice will be created for <strong>{invoiceConfirmTarget?.serviceName}</strong> using
              the standard renewal dates (from subscription end date and billing cycle).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (invoiceConfirmTarget) {
                  renewSubscription(invoiceConfirmTarget.id);
                  setInvoiceConfirmTarget(null);
                }
              }}
            >
              Generate invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RenewSubscriptionDialog
        open={!!renewScheduleTarget}
        onOpenChange={(open) => {
          if (!open) setRenewScheduleTarget(null);
        }}
        subscriptionId={renewScheduleTarget?.id ?? null}
        serviceName={renewScheduleTarget?.serviceName ?? ''}
      />

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the status for <strong>{cancelTarget?.serviceName}</strong>. The client&apos;s access may be affected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelTarget) {
                  cancelSubscription(cancelTarget.id);
                  toast.success('Subscription cancelled successfully');
                  setCancelTarget(null);
                }
              }}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscription permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This will remove <strong className="text-foreground">{deleteTarget?.serviceName}</strong> from your
                  workspace. The record will be deleted from the database and cannot be undone.
                </p>
                <p>
                  Linked invoices stay in your account; their subscription link will be cleared. Other records (domains,
                  hosting, etc.) are not deleted automatically.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteSubscription(deleteTarget.id);
                  toast.success('Subscription deleted');
                  setDeleteTarget(null);
                }
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
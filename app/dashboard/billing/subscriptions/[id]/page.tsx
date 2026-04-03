'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  RefreshCcw, 
  User, 
  Shield, 
  FileText,
  Clock,
  AlertTriangle,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { SubscriptionStatusBadge } from '@/components/subscriptions/subscription-status-badge';

/** Calendar month before expiry (same day-of-month in UTC). Window: that day through and after expiry. */
function isRenewalSubscriptionWindowActive(expiryIso: string): boolean {
  const expiry = new Date(expiryIso);
  if (Number.isNaN(expiry.getTime())) return false;
  const windowStart = new Date(
    Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() - 1, expiry.getUTCDate()),
  );
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return todayUtc >= windowStart.getTime();
}

export default function SubscriptionDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { subscriptions, getClient, invoices, renewSubscription, cancelSubscription } = useInvoiceData();
  const [generateInvoiceOpen, setGenerateInvoiceOpen] = useState(false);
  const [renewalConfirmOpen, setRenewalConfirmOpen] = useState(false);
  const [cancelSubOpen, setCancelSubOpen] = useState(false);

  const subscription = subscriptions.find(s => s.id === id);
  const client = subscription ? getClient(subscription.clientId) : null;
  const subInvoices = invoices.filter(inv => inv.subscriptionId === id).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-semibold">Subscription not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const expMs = new Date(subscription.expiryDate).getTime();
  const nowMs = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const isExpiringSoon = expMs >= nowMs && expMs < nowMs + weekMs;

  const showRenewalSubscription =
    subscription.status !== 'cancelled' &&
    isRenewalSubscriptionWindowActive(subscription.expiryDate);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Subscriptions
        </Button>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="gap-2" asChild>
             <Link href={`/dashboard/billing/subscriptions/${subscription.id}/edit`}>
               <Edit2 className="h-4 w-4" /> Edit Subscription
             </Link>
           </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight">{subscription.serviceName}</h1>
            <SubscriptionStatusBadge subscription={subscription} />
          </div>
          <p className="text-lg text-muted-foreground">{subscription.planName} • {subscription.billingCycle} billing</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="text-3xl font-mono font-bold text-primary">
             {formatCurrency(subscription.price, subscription.currency)}
           </div>
           <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Next Payment Due</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="p-0 border-b border-border/50 bg-muted/20 px-6 py-4 flex justify-between items-center">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Service Information
              </h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Service Type</p>
                    <p className="font-semibold capitalize">{subscription.serviceType}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Service ID</p>
                    <p className="font-mono text-sm bg-muted/50 px-2 py-1 rounded w-fit">{subscription.serviceId}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Notes</p>
                    <p className="text-sm leading-relaxed">{subscription.notes || 'No notes provided'}</p>
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Start Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary/60" />
                      <p className="font-medium">{formatDate(subscription.startDate)}</p>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Expiry Date</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary/60" />
                      <p className={isExpiringSoon ? "font-bold text-red-500" : "font-medium"}>
                        {formatDate(subscription.expiryDate)}
                      </p>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Auto-renewal</p>
                    <div className="flex items-center gap-2">
                       <RefreshCcw className={`h-4 w-4 ${subscription.autoRenew ? "text-green-500" : "text-muted-foreground"}`} />
                       <p className="font-medium">{subscription.autoRenew ? 'Enabled' : 'Disabled'}</p>
                    </div>
                 </div>
               </div>
            </div>
          </Card>

          {/* Billing History */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="p-0 border-b border-border/50 bg-muted/20 px-6 py-4 flex justify-between items-center">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Billing History
              </h3>
            </div>
            {subInvoices.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto opacity-10 mb-2" />
                <p>No invoices found for this subscription</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/5">
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Invoice #</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {subInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/billing/invoices/${inv.id}`)}>
                        <td className="px-6 py-4 text-sm font-mono font-medium">{inv.number}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(inv.issueDate)}</td>
                        <td className="px-6 py-4 text-sm font-mono text-right font-medium">{formatCurrency(inv.total, inv.currency)}</td>
                        <td className="px-6 py-4 text-right">
                          <Badge variant={inv.paymentStatus === 'paid' ? 'success' : 'outline'} className="text-[10px] uppercase tracking-wide h-5">
                            {inv.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-8">
           {/* Client Card */}
           <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <User className="h-4 w-4" /> Assigned Client
                </h3>
                {client ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                         {client.name.charAt(0)}
                       </div>
                       <div>
                         <p className="font-bold leading-none">{client.name}</p>
                         <p className="text-xs text-muted-foreground mt-1">{client.email}</p>
                       </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full justify-between group" asChild>
                       <Link href={`/dashboard/clients`}>
                         View client profile
                         <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                       </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Client information not available</p>
                )}
              </div>
           </Card>

           {/* Quick Actions */}
           <Card className="border-border/50 shadow-sm overflow-hidden bg-slate-900 text-white">
             <div className="p-6 space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-400">
                   <Shield className="h-4 w-4" /> Management Actions
                </h3>
                <div className="space-y-3">
                   <Button 
                    className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none font-bold"
                    onClick={() => setGenerateInvoiceOpen(true)}
                   >
                     Generate Invoice
                   </Button>
                   {showRenewalSubscription && (
                     <Button
                       variant="outline"
                       className="w-full border border-white/90 text-white bg-transparent hover:bg-white/10 font-bold gap-2"
                       onClick={() => setRenewalConfirmOpen(true)}
                     >
                       <RefreshCcw className="h-4 w-4 shrink-0" />
                       Renewal Subscription
                     </Button>
                   )}
                   <Button 
                    variant="outline" 
                    className="w-full border-slate-600 text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white font-bold"
                    onClick={() => setCancelSubOpen(true)}
                   >
                     Cancel Subscription
                   </Button>
                </div>
                <div className="pt-4 border-t border-slate-800">
                   <p className="text-[10px] text-slate-500 uppercase font-bold text-center tracking-widest leading-loose">
                     Manage carefully. Actions affect <br/> client service status immediately.
                   </p>
                </div>
             </div>
           </Card>
        </div>
      </div>

      <AlertDialog open={generateInvoiceOpen} onOpenChange={setGenerateInvoiceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate renewal invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              A new invoice will be created for <strong>{subscription.serviceName}</strong> based on this subscription&apos;s plan and billing cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                renewSubscription(subscription.id);
                setGenerateInvoiceOpen(false);
              }}
            >
              Generate invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={renewalConfirmOpen} onOpenChange={setRenewalConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renew subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a <strong>renewal invoice</strong> for{' '}
              <strong>{subscription.serviceName}</strong>, extend the billing period, and set the subscription
              status to <strong>Active</strong> (even if it was expired).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                renewSubscription(subscription.id);
                setRenewalConfirmOpen(false);
              }}
            >
              Renew &amp; generate invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelSubOpen} onOpenChange={setCancelSubOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the subscription status for <strong>{subscription.serviceName}</strong>. The client&apos;s service access may be affected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                cancelSubscription(subscription.id);
                setCancelSubOpen(false);
              }}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

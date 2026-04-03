'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  HardDrive, 
  Zap, 
  FileText,
  Plus,
  ExternalLink,
  Calendar,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export default function ClientProfilePage() {
  const params = useParams();
  const { 
    clients = [], 
    domains = [], 
    hosting = [], 
    emails = [], 
    vps = [], 
    invoices = [] 
  } = useInvoiceData();

  const clientId = params.id as string;
  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  const clientDomains = useMemo(() => domains.filter(d => d.clientId === clientId), [domains, clientId]);
  const clientHosting = useMemo(() => hosting.filter(h => h.clientId === clientId), [hosting, clientId]);
  const clientEmails = useMemo(() => emails.filter(e => e.clientId === clientId), [emails, clientId]);
  const clientVPS = useMemo(() => vps.filter(v => v.clientId === clientId), [vps, clientId]);
  const clientInvoices = useMemo(() => invoices.filter(i => i.clientId === clientId), [invoices, clientId]);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
         <h1 className="text-2xl font-bold">Client not found</h1>
         <Link href="/dashboard/clients">
            <Button variant="outline">Back to Clients</Button>
         </Link>
      </div>
    );
  }

  const sections = [
    { label: 'Domains', count: clientDomains.length, icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Hosting', count: clientHosting.length, icon: HardDrive, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Email', count: clientEmails.length, icon: Mail, color: 'text-pink-500', bg: 'bg-pink-50' },
    { label: 'VPS', count: clientVPS.length, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Invoices', count: clientInvoices.length, icon: FileText, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border border-border/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Users className="h-6 w-6" />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight">{client.name}</h1>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">{client.companyName || 'Private Client'}</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-xl gap-2 font-bold px-6 shadow-sm">
              <Edit className="h-4 w-4" /> Edit Client
           </Button>
           <Button className="rounded-xl gap-2 font-bold px-6 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> New Service
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
         {sections.map((s, i) => (
           <Card key={i} className="p-4 border-none shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", s.bg)}>
                 <s.icon className={cn("h-6 w-6", s.color)} />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                 <p className="text-xl font-black mt-0.5">{s.count}</p>
              </div>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left Side - Details */}
         <div className="lg:col-span-2 space-y-8">
            {/* Hosting Accounts Detail */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                     <HardDrive className="h-5 w-5 text-primary" /> Active Hosting
                  </h2>
               </div>
               <div className="space-y-4">
                  {clientHosting.map((h) => (
                    <Card key={h.id} className="p-6 border-border/50 hover:shadow-lg transition-all group overflow-hidden">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                             <div className="h-12 w-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                <HardDrive className="h-6 w-6" />
                             </div>
                             <div>
                                <h4 className="font-bold text-lg">{h.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                   <Badge variant="secondary" className="h-5 text-[10px] font-bold uppercase">{h.planName}</Badge>
                                   <span className="text-xs text-muted-foreground font-medium">• {h.type} hosting</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-col sm:items-end">
                             <p className="text-lg font-black">{formatCurrency(h.price)}<span className="text-[10px] text-muted-foreground uppercase ml-1">/{h.billingCycle}</span></p>
                             <p className="text-xs text-muted-foreground">Expires: {formatDate(h.expiryDate).split(',')[0]}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Link href={`/dashboard/hosting/${h.id}`}>
                                <Button variant="outline" size="sm" className="rounded-lg h-9 px-4 gap-2 font-bold text-xs">
                                   Manage <ExternalLink className="h-3 w-3" />
                                </Button>
                             </Link>
                          </div>
                       </div>
                    </Card>
                  ))}
                  {clientHosting.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
                       <HardDrive className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                       <p className="text-sm font-bold text-muted-foreground">No active hosting accounts for this client.</p>
                       <Button size="sm" variant="ghost" className="mt-2 text-xs font-black text-primary">Assign Hosting Now</Button>
                    </div>
                  )}
               </div>
            </div>

            {/* Domains Table */}
            <div className="space-y-4">
               <h2 className="text-xl font-bold px-2 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> Domains Portfolio
               </h2>
               <Card className="border-none shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                       <TableRow>
                          <TableHead className="font-bold">Domain Name</TableHead>
                          <TableHead className="font-bold text-center">Auto-Renew</TableHead>
                          <TableHead className="font-bold">Expiry Date</TableHead>
                          <TableHead className="font-bold text-right pr-6">Status</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {clientDomains.map((d) => (
                         <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-semibold py-4">
                               <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-blue-50 text-blue-500 rounded flex items-center justify-center">
                                     <Globe className="h-4 w-4" />
                                  </div>
                                  {d.name}{d.tld}
                               </div>
                            </TableCell>
                            <TableCell className="text-center italic text-xs">
                               {d.autoRenew ? (
                                 <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                    <Check className="h-3 w-3" /> Enabled
                                 </span>
                               ) : 'Disabled'}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium">{formatDate(d.expiryDate).split(',')[0]}</TableCell>
                            <TableCell className="text-right pr-6">
                               <Badge className={cn(
                                 "uppercase text-[10px] h-5 font-bold",
                                 d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                               )}>{d.status}</Badge>
                            </TableCell>
                         </TableRow>
                       ))}
                       {clientDomains.length === 0 && (
                         <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No domains registered.</TableCell>
                         </TableRow>
                       )}
                    </TableBody>
                  </Table>
               </Card>
            </div>
         </div>

         {/* Right Side - Profile Card */}
         <div className="space-y-8 text-center sm:text-left">
            <Card className="p-8 border-none shadow-sm bg-card relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Briefcase className="h-32 w-32" />
               </div>
               <div className="space-y-6 relative z-10">
                  <h3 className="font-black text-sm tracking-widest uppercase text-muted-foreground underline decoration-primary decoration-2 underline-offset-8 mb-6">Contact Information</h3>
                  <div className="space-y-4">
                     <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                           <Mail className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Email Address</p>
                           <p className="font-bold text-sm">{client.email}</p>
                        </div>
                     </div>
                     <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                           <Phone className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Phone Number</p>
                           <p className="font-bold text-sm">{client.phone || '+1 (555) 000-0000'}</p>
                        </div>
                     </div>
                     <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                           <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Billing Address</p>
                           <p className="font-bold text-sm truncate">{client.address || 'No address provided'}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </Card>

            <Card className="overflow-hidden border border-border/50 rounded-3xl shadow-sm">
               <div className="bg-card p-6 pb-2">
                  <h3 className="font-black text-sm tracking-widest uppercase mb-6 flex items-center gap-2">
                     <CreditCard className="h-4 w-4 text-primary" /> Finance Overview
                  </h3>
                  <div className="space-y-6">
                     <div className="p-5 bg-green-500/5 rounded-2xl border border-green-500/10">
                        <p className="text-[10px] uppercase font-black text-green-600/70 tracking-widest mb-2">Total LTV</p>
                        <p className="text-3xl font-black text-green-600">{formatCurrency(clientInvoices.reduce((sum, i) => sum + i.total, 0))}</p>
                     </div>

                     <div className="space-y-4 px-2">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground font-bold uppercase text-[10px]">Total Invoices</span>
                           <span className="font-black">{clientInvoices.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground font-bold uppercase text-[10px]">Unpaid Amounts</span>
                           <span className="text-red-500 font-black">
                              {formatCurrency(clientInvoices.filter(i => i.paymentStatus === 'unpaid').reduce((sum, i) => sum + i.total, 0))}
                           </span>
                        </div>
                     </div>

                     <Link href="/dashboard/billing/invoices">
                        <Button variant="outline" className="w-full h-12 rounded-xl font-bold gap-2 mb-4">
                           View All Invoices <ChevronRight className="h-4 w-4" />
                        </Button>
                     </Link>
                  </div>
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}

function Edit(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

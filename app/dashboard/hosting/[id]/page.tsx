'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  ChevronLeft, 
  Settings, 
  Mail, 
  Zap, 
  Activity, 
  Cpu, 
  HardDrive, 
  RotateCcw,
  History,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function HostingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { 
    hosting = [], 
    clients = [], 
    domains = [], 
    emails = [], 
    vps = [], 
    subscriptions = [],
    deleteHosting, 
    suspendHosting, 
    renewHosting 
  } = useInvoiceData();

  const hostingId = params.id as string;
  const h = useMemo(() => hosting.find(h => h.id === hostingId), [hosting, hostingId]);
  const client = useMemo(() => clients.find(c => c.id === h?.clientId), [clients, h]);
  const domain = useMemo(() => domains.find(d => d.id === h?.domainId), [domains, h]);
  const subscription = useMemo(() => subscriptions.find(s => s.id === h?.subscriptionId), [subscriptions, h]);
  
  const linkedEmails = useMemo(() => emails.filter(e => h?.linkedServices.emailIds.includes(e.id)), [emails, h]);
  const linkedVps = useMemo(() => vps.filter(v => h?.linkedServices.vpsIds.includes(v.id)), [vps, h]);

  if (!h) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
         <XCircle className="h-12 w-12 text-destructive" />
         <h1 className="text-2xl font-bold">Hosting not found</h1>
         <Link href="/dashboard/hosting">
            <Button variant="outline">Back to Hosting</Button>
         </Link>
      </div>
    );
  }

  const handleDelete = () => {
    deleteHosting(h.id);
    toast.success('Hosting account deleted');
    router.push('/dashboard/hosting');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Breadcrumb & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/hosting">
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border border-border/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <HardDrive className="h-5 w-5" />
             </div>
             <div>
                <h1 className="text-2xl font-bold tracking-tight">{h.name}</h1>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">Hosting Account</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2 font-bold px-6 shadow-sm">
             <Settings className="h-4 w-4" /> Control Panel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border/50 shadow-sm">
                  <MoreVertical className="h-5 w-5" />
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl">
               <DropdownMenuLabel className="mb-2 uppercase text-[10px] font-black tracking-widest text-muted-foreground/60">Account Operations</DropdownMenuLabel>
               <DropdownMenuItem onClick={() => renewHosting(h.id)} className="rounded-xl py-2.5">
                  <RotateCcw className="h-4 w-4 mr-3" /> Renew Cycle
               </DropdownMenuItem>
               <DropdownMenuItem onClick={() => suspendHosting(h.id)} className="rounded-xl py-2.5 text-amber-600">
                  <History className="h-4 w-4 mr-3" /> Suspend Service
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={handleDelete} className="rounded-xl py-2.5 text-destructive font-bold focus:bg-destructive focus:text-white">
                  <Trash2 className="h-4 w-4 mr-3" /> Terminate Account
               </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left Column - Main Info */}
         <div className="lg:col-span-2 space-y-8">
            {/* Health and Status */}
            <Card className="p-8 border-none bg-primary/5 shadow-sm relative overflow-hidden ring-1 ring-primary/20">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Activity className="h-32 w-32" />
               </div>
               <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                  <div className="flex-1 space-y-4 text-center md:text-left">
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <Badge className="bg-green-500 border-none px-4 py-1 h-7 font-black tracking-widest shadow-md flex items-center gap-1.5">
                           <ShieldCheck className="h-3.5 w-3.5" /> {h.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="h-7 px-4 font-black tracking-widest border-primary/20 bg-primary/5 uppercase text-primary">
                           {h.type.toUpperCase()}
                        </Badge>
                     </div>
                     <div>
                        <h2 className="text-3xl font-black mb-2">{h.planName} Plan</h2>
                        <p className="text-muted-foreground">Service is running optimally on {h.type} hosting clusters. All resources are within limits.</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-12 px-8 py-4 bg-card rounded-3xl shadow-sm border border-border/50">
                      <div className="text-center">
                         <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Price</p>
                         <p className="text-2xl font-black">{formatCurrency(h.price)}</p>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase">{h.billingCycle}</p>
                      </div>
                      <div className="w-px h-12 bg-border/50" />
                      <div className="text-center">
                         <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Expires</p>
                         <p className="text-2xl font-black tracking-tight">{formatDate(h.expiryDate).split(',')[0]}</p>
                         <p className="text-blue-500 text-[10px] font-bold uppercase cursor-pointer hover:underline">View Subscription</p>
                      </div>
                  </div>
               </div>
            </Card>

            {/* Resources Usage - Detailed */}
            <div className="space-y-4">
               <div className="flex items-end justify-between">
                  <h3 className="text-xl font-bold px-2 tracking-tight">Resource Utilization</h3>
                  <Button variant="ghost" className="text-xs uppercase font-black text-primary gap-1.5 h-8">
                     View All Metrics <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Cloud CPU', value: 45, max: 100, text: h.resources.cpu, icon: Cpu, color: 'from-blue-500 to-blue-600' },
                    { label: 'Memory', value: 62, max: 100, text: h.resources.ram, icon: Zap, color: 'from-purple-500 to-purple-600' },
                    { label: 'NVMe Storage', value: 78, max: 100, text: `38.5 GB / ${h.resources.storage}`, icon: HardDrive, color: 'from-orange-500 to-orange-600' },
                    { label: 'Data Transfer', value: 12, max: 100, text: `12.5 GB / ${h.resources.bandwidth}`, icon: Globe, color: 'from-green-500 to-green-600' },
                  ].map((r, i) => (
                    <Card key={i} className="p-6 border-border/50 shadow-sm group hover:scale-[1.02] transition-transform">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                <r.icon className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="text-sm font-bold tracking-tight">{r.label}</p>
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{r.text}</p>
                             </div>
                          </div>
                          <span className="text-xl font-black">{r.value}%</span>
                       </div>
                       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                             className={cn("h-full rounded-full bg-linear-to-r", r.color)} 
                             style={{ width: `${r.value}%` }} 
                          />
                       </div>
                    </Card>
                  ))}
               </div>
            </div>

            {/* Linked Services */}
            <div className="space-y-4">
               <h3 className="text-xl font-bold px-2 tracking-tight">Integrated Services</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Linked Domain */}
                  <Card className="p-6 bg-card border-none shadow-sm relative overflow-hidden group border border-border/10 ring-1 ring-border/5">
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                     <div className="flex flex-col h-full space-y-4">
                        <div className="flex items-center gap-3">
                           <Globe className="h-5 w-5 text-blue-500" />
                           <h4 className="font-bold text-sm">Primary Domain</h4>
                        </div>
                        <div className="flex-1">
                           <p className="font-black text-lg tracking-tight uppercase">{domain ? `${domain.name}${domain.tld}` : 'Not linked'}</p>
                           <p className="text-xs text-muted-foreground mt-1">Status: <span className="text-green-500 font-bold uppercase">Active</span></p>
                        </div>
                        <Link href="/dashboard/domains/dns">
                           <Button variant="ghost" size="sm" className="w-full h-9 rounded-lg gap-2 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50">
                              DNS Management <ExternalLink className="h-3 w-3" />
                           </Button>
                        </Link>
                     </div>
                  </Card>

                  {/* Linked Emails */}
                  <Card className="p-6 bg-card border-none shadow-sm relative overflow-hidden group border border-border/10 ring-1 ring-border/5">
                     <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                     <div className="flex flex-col h-full space-y-4">
                        <div className="flex items-center gap-3">
                           <Mail className="h-5 w-5 text-purple-500" />
                           <h4 className="font-bold text-sm">Business Email</h4>
                        </div>
                        <div className="flex-1">
                           <div className="flex items-baseline gap-2">
                              <p className="font-black text-2xl tracking-tight leading-none uppercase">{linkedEmails.length}</p>
                              <span className="text-xs font-bold text-muted-foreground uppercase">Accounts</span>
                           </div>
                           <p className="text-xs text-muted-foreground mt-1">Plan: Starter Email</p>
                        </div>
                        <Link href="/dashboard/emails">
                           <Button variant="ghost" size="sm" className="w-full h-9 rounded-lg gap-2 text-[10px] uppercase font-bold text-purple-600 hover:bg-purple-50">
                              Manage Accounts <ExternalLink className="h-3 w-3" />
                           </Button>
                        </Link>
                     </div>
                  </Card>

                  {/* Linked VPS */}
                  <Card className="p-6 bg-card border-none shadow-sm relative overflow-hidden group border border-border/10 ring-1 ring-border/5">
                     <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                     <div className="flex flex-col h-full space-y-4">
                        <div className="flex items-center gap-3">
                           <Zap className="h-5 w-5 text-orange-500" />
                           <h4 className="font-bold text-sm">Dedicated VPS</h4>
                        </div>
                        <div className="flex-1">
                           <p className="font-black text-lg tracking-tight uppercase">{linkedVps[0]?.name || 'No VPS Active'}</p>
                           {linkedVps[0] && (
                             <div className="flex items-center gap-1.5 mt-2">
                               <Badge className="bg-orange-500 h-4 text-[8px] uppercase px-1.5 focus:ring-0">{linkedVps[0].planName}</Badge>
                             </div>
                           )}
                        </div>
                        <Link href="/dashboard/vps">
                           <Button variant="ghost" size="sm" className="w-full h-9 rounded-lg gap-2 text-[10px] uppercase font-bold text-orange-600 hover:bg-orange-50">
                              VPS Console <ExternalLink className="h-3 w-3" />
                           </Button>
                        </Link>
                     </div>
                  </Card>
               </div>
            </div>
         </div>

         {/* Right Column - Client & Billing Sidebar */}
         <div className="space-y-8">
            {/* Client Card */}
            <Card className="p-1 border border-border/50 overflow-hidden rounded-3xl bg-card">
               <div className="p-6 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-border/50">
                     <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-3xl">
                        {client?.name.substring(0, 2).toUpperCase() || 'NA'}
                     </div>
                     <div>
                        <h4 className="text-xl font-bold tracking-tight">{client?.name || 'Unknown Client'}</h4>
                        <p className="text-xs text-muted-foreground">{client?.email || 'No email'}</p>
                     </div>
                     <Link href={`/dashboard/clients/${client?.id}`}>
                        <Button variant="outline" size="sm" className="rounded-xl h-8 px-6 text-[10px] uppercase font-bold tracking-widest bg-muted/50 border-none hover:bg-primary hover:text-white transition-all">
                           Profile
                        </Button>
                     </Link>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-black underline decoration-primary decoration-2 underline-offset-4">Active Services</span>
                        <span className="text-xs font-black">7 Total</span>
                     </div>
                     <div className="space-y-2">
                        {[
                          { icon: Globe, label: 'Domains', count: 2 },
                          { icon: HardDrive, label: 'Hosting', count: 1 },
                          { icon: Mail, label: 'EMail', count: 4 },
                          { icon: Zap, label: 'VPS', count: 0 },
                        ].map((s, i) => (
                           <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-muted p-2 rounded-xl transition-all">
                              <div className="flex items-center gap-3">
                                 <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{s.label}</span>
                              </div>
                              <span className="h-5 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black group-hover:bg-primary group-hover:text-white transition-all">
                                 {s.count}
                              </span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </Card>

            {/* Billing Breakdown */}
            <Card className="overflow-hidden border border-border/50 rounded-3xl shadow-sm">
               <div className="bg-card p-6 pb-2">
                  <h3 className="font-black text-sm tracking-widest uppercase mb-4 flex items-center gap-2">
                     <CreditCard className="h-4 w-4 text-primary" /> Billing Info
                  </h3>
                  <div className="space-y-6">
                     <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-2">Next Billing Date</p>
                        <div className="flex items-center gap-3">
                           <Calendar className="h-5 w-5 text-primary" />
                           <p className="text-2xl font-black">{formatDate(h.expiryDate).split(',')[0]}</p>
                        </div>
                        <p className="text-xs text-primary font-bold mt-2 flex items-center gap-1.5 leading-none">
                           <History className="h-3 w-3" /> Automatic Payment
                        </p>
                     </div>

                     <div className="space-y-4 px-2">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground font-medium">Monthly Fee</span>
                           <span className="font-bold">{formatCurrency(h.price)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground font-medium">Last Invoice</span>
                           <span className="text-blue-500 font-bold underline cursor-pointer">INV-2024-0012</span>
                        </div>
                        <div className="h-px bg-border/50" />
                        <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-3">
                           <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                           <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                              Account will automatically suspend of payment is not received within 3 days of invoice issue.
                           </p>
                        </div>
                     </div>

                     <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 mb-4 transition-transform hover:scale-[1.02]">
                        Generate Manual Invoice
                     </Button>
                  </div>
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}

function XCircle(props: any) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}

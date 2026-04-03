'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  RotateCw, 
  AlertCircle,
  ChevronRight,
  Filter, 
  CreditCard, 
  Banknote, 
  Building2, 
  Calendar,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate, formatInvoiceNumber } from '@/lib/formatting';
import { convertCurrency } from '@/lib/currency-utils';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const router = useRouter();
  const { payments = [], invoices = [], domains = [], websites = [], emails = [], vps = [], getPaidRevenue, company } = useInvoiceData();
  const [activeTab, setActiveTab] = useState<'payments' | 'refunds'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'card' | 'cash' | 'bank'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredPayments = payments.filter((pay) => {
    const searchMatch = `${pay.clientName || ''} ${pay.invoiceNumber || ''} ${pay.id || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const methodMatch = filterMethod === 'all' || pay.method === filterMethod;
    const tabMatch = activeTab === 'payments' ? pay.status !== 'refunded' : pay.status === 'refunded';
    return searchMatch && methodMatch && tabMatch;
  });

  const companyCurrency = company.currency || 'USD';
  const filteredTotalPricing =
    searchTerm.trim().length > 0
      ? filteredPayments.reduce(
          (sum, pay) =>
            sum + convertCurrency(pay.amount, pay.currency || companyCurrency, companyCurrency, company),
          0
        )
      : null;

  const getServiceInfo = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return { type: 'General', title: 'Unknown Service' };

    let title = inv.serviceName || inv.items[0]?.description || 'General Service';
    
    if (inv.serviceType === 'domain' && inv.serviceId) {
       title = domains.find(d => d.id === inv.serviceId)?.name || title;
    } else if (inv.serviceType === 'website' && inv.serviceId) {
       title = websites.find(w => w.id === inv.serviceId)?.name || title;
    } else if (inv.serviceType === 'email' && inv.serviceId) {
       title = emails.find(e => e.id === inv.serviceId)?.name || title;
    } else if (inv.serviceType === 'vps' && inv.serviceId) {
       title = vps.find(v => v.id === inv.serviceId)?.name || title;
    }

    return { type: inv.serviceType || 'Service', title };
  };

  const totalAllTime = getPaidRevenue();
  const totalThisYear = payments
    .filter(p => new Date(p.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, p) => sum + p.amount, 0);
  const totalThisMonth = payments
    .filter(p => {
      const d = new Date(p.date);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const toggleAll = () => {
    if (selectedIds.length === filteredPayments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPayments.map(p => p.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground mt-1">Track all transactions and financial records</p>
        </div>
        <div className="flex items-center gap-3">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filter Method <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setFilterMethod('all')}>All Methods</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterMethod('card')}>Credit Card</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterMethod('bank')}>Bank Transfer</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterMethod('cash')}>Cash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden shadow-sm">
        {/* Tabs Layer */}
        <div className="flex border-b border-border/50 px-2 overflow-x-auto no-scrollbar">
           <button
             onClick={() => setActiveTab('payments')}
             className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
               activeTab === 'payments' 
                 ? 'border-primary text-primary' 
                 : 'border-transparent text-muted-foreground hover:text-foreground'
             }`}
           >
             Payment history
           </button>
           <button
             onClick={() => setActiveTab('refunds')}
             className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
               activeTab === 'refunds' 
                 ? 'border-primary text-primary' 
                 : 'border-transparent text-muted-foreground hover:text-foreground'
             }`}
           >
             Refund history
           </button>
        </div>

        {/* Toolbar Layer */}
        <div className="p-4 flex items-center gap-4">
          <div className="p-1 px-2 border-r border-border mr-2">
            <Checkbox 
              className="h-5 w-5 rounded-[4px] border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" 
              checked={filteredPayments.length > 0 && selectedIds.length === filteredPayments.length}
              onCheckedChange={toggleAll}
            />
          </div>
          <div className="flex flex-1 min-w-0 items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-lg min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 bg-card border-border/50 h-11 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-describedby={
                  filteredTotalPricing !== null
                    ? 'payments-search-count payments-search-total'
                    : 'payments-search-count'
                }
              />
            </div>
            <div className="flex flex-col gap-0.5 shrink-0 items-start leading-tight">
              <p
                id="payments-search-count"
                className="text-sm text-muted-foreground whitespace-nowrap tabular-nums"
                aria-live="polite"
              >
                <span className="font-semibold text-foreground">{filteredPayments.length}</span>
                {filteredPayments.length === 1
                  ? activeTab === 'refunds'
                    ? ' refund'
                    : ' payment'
                  : activeTab === 'refunds'
                    ? ' refunds'
                    : ' payments'}
                {searchTerm.trim()
                  ? filteredPayments.length === 1
                    ? ' matches'
                    : ' match'
                  : ''}
              </p>
              {filteredTotalPricing !== null && (
                <p
                  id="payments-search-total"
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
          </div>
          <div className="flex-1 min-w-0 hidden sm:block" />
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full h-10 w-10">
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Hostinger-style Table Layer */}
        <div className="overflow-x-auto border-t border-border/40">
          <table className="w-full">
            <tbody className="divide-y divide-border/40">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center text-muted-foreground bg-muted/5">
                    <div className="flex flex-col items-center gap-3">
                       <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 opacity-30" />
                       </div>
                       <p className="text-sm font-medium">No {activeTab} recorded yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const service = getServiceInfo(payment.invoiceId);
                  const isSelected = selectedIds.includes(payment.id);
                  return (
                    <tr 
                      key={payment.id} 
                      className={`hover:bg-muted/30 transition-all group cursor-pointer border-l-2 ${isSelected ? 'border-l-primary bg-primary/5' : 'border-l-transparent'}`}
                      onClick={() => router.push(`/dashboard/billing/payments/${payment.id}`)}
                    >
                      <td className="pl-6 py-5 w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          className="h-5 w-5 rounded-[4px] border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          checked={isSelected} 
                          onCheckedChange={() => toggleOne(payment.id)}
                        />
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Payment ID</span>
                          <span className="text-sm font-bold text-foreground">
                            H_{(payment.id.split('').reduce((sum, c) => sum + c.charCodeAt(0) , 0) * 15485863 % 90000000 + 10000000).toString()}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Invoice ID</span>
                          <span className="text-sm font-bold text-foreground">
                            {formatInvoiceNumber(payment.invoiceNumber)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Client</span>
                          <span className="text-sm font-bold text-foreground truncate max-w-[150px]">
                            {payment.clientName}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Title</span>
                          <span className="text-sm font-medium text-foreground max-w-[150px] truncate">{service.title}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Paid at</span>
                          <span className="text-sm font-medium text-foreground">
                             {payment.date ? new Date(payment.date).toISOString().split('T')[0] : 'N/A'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">Amount</span>
                          <span className="text-sm font-bold text-foreground">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                      </td>

                      <td className="pr-8 py-5 text-right w-10">
                         <ChevronRight className="h-5 w-5 text-primary opacity-40 group-hover:opacity-100 transition-all translate-x-0 group-hover:translate-x-1" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-6xl animate-in slide-in-from-bottom-10 duration-500">
           <div className="bg-white border-2 border-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl flex items-center justify-between px-8 py-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                   <div className="bg-primary/10 text-primary p-1 rounded-md">
                      <Checkbox 
                        checked={true} 
                        className="h-5 w-5 border-primary bg-primary text-primary-foreground" 
                        onCheckedChange={() => setSelectedIds([])}
                      />
                   </div>
                   <span className="text-lg font-bold text-foreground">
                    {selectedIds.length} {selectedIds.length === 1 ? 'payment' : 'payments'} selected
                   </span>
                </div>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-1 px-2 text-muted-foreground hover:text-foreground text-xl font-light transition-colors ml-2"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  className="text-primary font-bold text-base hover:bg-primary/5 transition-all"
                  onClick={() => {
                    toast.info(`Downloading ${selectedIds.length} invoices...`);
                  }}
                >
                  Download invoices
                </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
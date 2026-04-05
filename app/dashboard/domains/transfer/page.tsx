'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRightLeft, Globe, Plus, Search, Trash2, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { useToast } from '@/hooks/use-toast';

type TransferFilter = 'all' | 'pending' | 'completed' | 'failed';

const PROVIDERS = ['GoDaddy', 'Namecheap', 'Hostinger', 'Cloudflare', 'Porkbun', 'Other'];

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DomainTransferPage() {
  const { toast } = useToast();
  const { clients = [], transfers = [], addTransfer, deleteTransfer, addDomain, company } = useInvoiceData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TransferFilter>('all');

  const [domainName, setDomainName] = useState('');
  const [tld, setTld] = useState('.com');
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [previousProvider, setPreviousProvider] = useState(PROVIDERS[0]);
  const [transferDate, setTransferDate] = useState(formatInputDate(new Date()));
  const [expiryDate, setExpiryDate] = useState(formatInputDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)));
  const [subscriptionDuration, setSubscriptionDuration] = useState<'12' | '24'>('12');
  const [price, setPrice] = useState('13.99');
  const [autoRenew, setAutoRenew] = useState(true);
  const [status, setStatus] = useState<TransferFilter>('pending');
  const [notes, setNotes] = useState('');

  const rows = useMemo(() => {
    return transfers.map((transfer) => ({
      ...transfer,
      clientName: clients.find((client) => client.id === transfer.clientId)?.name ?? 'Unassigned',
      fullDomain: `${transfer.domainName}${transfer.tld}`,
    }));
  }, [clients, transfers]);

  const filteredTransfers = useMemo(() => {
    return rows.filter((transfer) => {
      const searchMatch =
        transfer.fullDomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.previousProvider.toLowerCase().includes(searchQuery.toLowerCase());
      const filterMatch = filter === 'all' || transfer.status === filter;
      return searchMatch && filterMatch;
    });
  }, [filter, rows, searchQuery]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((transfer) => transfer.status === 'pending').length,
    completed: rows.filter((transfer) => transfer.status === 'completed').length,
    failed: rows.filter((transfer) => transfer.status === 'failed').length,
  }), [rows]);

  const resetForm = () => {
    setDomainName('');
    setTld('.com');
    setClientId(clients[0]?.id ?? '');
    setPreviousProvider(PROVIDERS[0]);
    setTransferDate(formatInputDate(new Date()));
    setExpiryDate(formatInputDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)));
    setSubscriptionDuration('12');
    setPrice('13.99');
    setAutoRenew(true);
    setStatus('pending');
    setNotes('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!domainName.trim() || !clientId) {
      toast({ title: 'Missing information', description: 'Please enter a domain and select a client.', variant: 'destructive' });
      return;
    }

    const normalizedName = domainName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\.+$/, '');
    const domainRecord = {
      domainName: normalizedName,
      tld: tld.startsWith('.') ? tld : `.${tld}`,
      clientId,
      previousProvider,
      transferDate: new Date(transferDate).toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      subscriptionDuration: Number(subscriptionDuration) as 12 | 24,
      price: Number(price),
      status: status as 'pending' | 'completed' | 'failed',
      autoRenew,
      notes,
    };

    let createdDomainId: string | undefined;

    if (status === 'completed') {
      const createdDomain = addDomain({
        name: domainRecord.domainName,
        tld: domainRecord.tld,
        clientId,
        companyId: company.id,
        registrar: previousProvider,
        expiryDate: domainRecord.expiryDate,
        autoRenew,
        price: Number(price),
        billingCycle: 'yearly',
        status: 'active',
        planName: 'Transfer Registration',
        linkedServices: { websiteIds: [], emailIds: [], vpsIds: [] },
        dnsRecords: [
          { id: 'dns-a', type: 'A', host: '@', value: '76.76.21.21', ttl: '3600' },
          { id: 'dns-mx', type: 'MX', host: '@', value: `mail.${normalizedName}${domainRecord.tld}`, ttl: '3600' },
        ],
        nameservers: ['ns1.hostinger.com', 'ns2.hostinger.com'],
        nextInvoiceDate: domainRecord.expiryDate,
        notes,
      });
      createdDomainId = createdDomain.id;
    }

    addTransfer({ ...domainRecord, domainId: createdDomainId });

    toast({
      title: status === 'completed' ? 'Transfer completed' : 'Transfer added',
      description: status === 'completed'
        ? `${normalizedName}${domainRecord.tld} was added to the domain portfolio.`
        : `${normalizedName}${domainRecord.tld} is now tracked as a transfer request.`,
    });

    resetForm();
  };

  const renderStatus = (transferStatus: string) => {
    switch (transferStatus) {
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'failed':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"><Clock3 className="mr-1 h-3 w-3" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/dashboard/domains">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domain Transfers</h1>
          <p className="text-muted-foreground mt-1">Track transfer requests and convert completed transfers into live domains.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">All transfers</p><p className="mt-2 text-2xl font-bold">{counts.all}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="mt-2 text-2xl font-bold text-amber-600">{counts.pending}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-2xl font-bold text-emerald-600">{counts.completed}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Failed</p><p className="mt-2 text-2xl font-bold text-rose-600">{counts.failed}</p></Card>
      </div>

      <Card className="p-6 shadow-sm" id="add-transfer">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Plus className="h-4 w-4" />
          Add Transfer
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Domain name</label>
            <Input value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="example" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">TLD</label>
            <Select value={tld} onValueChange={setTld}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select TLD" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=".com">.com</SelectItem>
                <SelectItem value=".net">.net</SelectItem>
                <SelectItem value=".org">.org</SelectItem>
                <SelectItem value=".dev">.dev</SelectItem>
                <SelectItem value=".io">.io</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Client</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Previous provider</label>
            <Select value={previousProvider} onValueChange={setPreviousProvider}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transfer date</label>
            <Input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expiration date</label>
            <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subscription duration</label>
            <Select value={subscriptionDuration} onValueChange={(value) => setSubscriptionDuration(value as '12' | '24')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">1 year</SelectItem>
                <SelectItem value="24">2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <Input type="number" step="0.01" min="0" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(value) => setStatus(value as TransferFilter)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registrar unlock code, approval status, EPP code, and other transfer notes." />
          </div>

          <div className="lg:col-span-2 flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Auto-renew
              </div>
              <p className="text-xs text-muted-foreground">Keep the domain renewal chain active after transfer completion.</p>
            </div>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>

          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transfer
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>Reset</Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search domain, client, or provider" className="pl-9" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'completed', 'failed'] as TransferFilter[]).map((option) => (
            <Button key={option} variant={filter === option ? 'default' : 'outline'} onClick={() => setFilter(option)} className="capitalize">
              {option}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead className="bg-muted/60 text-sm">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Domain Name</th>
                <th className="px-5 py-4 text-left font-semibold">Client Name</th>
                <th className="px-5 py-4 text-left font-semibold">Previous Provider</th>
                <th className="px-5 py-4 text-left font-semibold">Transfer Date</th>
                <th className="px-5 py-4 text-left font-semibold">Expiration Date</th>
                <th className="px-5 py-4 text-left font-semibold">Subscription Duration</th>
                <th className="px-5 py-4 text-left font-semibold">Price</th>
                <th className="px-5 py-4 text-left font-semibold">Status</th>
                <th className="px-5 py-4 text-left font-semibold">Auto-renew</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-muted-foreground">No transfers match your filters.</td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-5 py-4 font-medium">{transfer.fullDomain}</td>
                    <td className="px-5 py-4 text-sm">{transfer.clientName}</td>
                    <td className="px-5 py-4 text-sm">{transfer.previousProvider}</td>
                    <td className="px-5 py-4 text-sm">{formatDate(transfer.transferDate)}</td>
                    <td className="px-5 py-4 text-sm">{formatDate(transfer.expiryDate)}</td>
                    <td className="px-5 py-4 text-sm">{transfer.subscriptionDuration} year{transfer.subscriptionDuration > 1 ? 's' : ''}</td>
                    <td className="px-5 py-4 text-sm font-medium">{formatCurrency(transfer.price, 'USD')}</td>
                    <td className="px-5 py-4">{renderStatus(transfer.status)}</td>
                    <td className="px-5 py-4 text-sm">{transfer.autoRenew ? 'Yes' : 'No'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {transfer.domainId ? (
                          <Link href={`/dashboard/domains/${transfer.domainId}`}>
                            <Button variant="outline" size="sm">View domain</Button>
                          </Link>
                        ) : transfer.status === 'pending' ? (
                          <Badge variant="secondary">Waiting</Badge>
                        ) : null}
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteTransfer(transfer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {filteredTransfers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No transfers match your filters.</div>
          ) : (
            filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="p-4 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{transfer.fullDomain}</div>
                      <div className="text-xs text-muted-foreground">{transfer.clientName}</div>
                    </div>
                    {renderStatus(transfer.status)}
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Provider</p><p className="mt-1">{transfer.previousProvider}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Price</p><p className="mt-1 font-medium">{formatCurrency(transfer.price, 'USD')}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Transfer date</p><p className="mt-1">{formatDate(transfer.transferDate)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Expiry</p><p className="mt-1">{formatDate(transfer.expiryDate)}</p></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Auto-renew: {transfer.autoRenew ? 'Yes' : 'No'}</div>
                    <div className="flex gap-2">
                      {transfer.domainId && (
                        <Link href={`/dashboard/domains/${transfer.domainId}`}>
                          <Button variant="outline" size="sm">View domain</Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteTransfer(transfer.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
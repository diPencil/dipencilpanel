'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Globe, Save, RotateCcw, Monitor, Mail, Server } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { useToast } from '@/hooks/use-toast';

const EMPTY_DNS = [
  { id: 'dns-a', type: 'A' as const, host: '@', value: '', ttl: '3600' },
  { id: 'dns-cname', type: 'CNAME' as const, host: 'www', value: '', ttl: '3600' },
  { id: 'dns-mx', type: 'MX' as const, host: '@', value: '', ttl: '3600' },
  { id: 'dns-txt', type: 'TXT' as const, host: '@', value: '', ttl: '3600' },
];

function computeStatus(expiryDate: string, status: string) {
  if (status === 'suspended') return 'suspended';

  const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0 || status === 'expired') return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'active';
}

export default function DomainManagePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { getDomain, clients = [], websites = [], emails = [], vps = [], updateDomain, renewDomain, getSubscription, updateSubscription } = useInvoiceData();
  const domain = getDomain(params.id);

  const [clientId, setClientId] = useState(domain?.clientId ?? '');
  const [registrar, setRegistrar] = useState(domain?.registrar ?? 'Hostinger');
  const [status, setStatus] = useState(domain?.status ?? 'active');
  const [expiryDate, setExpiryDate] = useState(domain?.expiryDate ?? new Date().toISOString());
  const [autoRenew, setAutoRenew] = useState(domain?.autoRenew ?? true);
  const [planName, setPlanName] = useState(domain?.planName ?? 'Yearly Registration');
  const [price, setPrice] = useState(String(domain?.price ?? 0));
  const [nextInvoiceDate, setNextInvoiceDate] = useState(domain?.nextInvoiceDate ?? domain?.expiryDate ?? new Date().toISOString());
  const [notes, setNotes] = useState(domain?.notes ?? '');
  const [ns1, setNs1] = useState(domain?.nameservers?.[0] ?? 'ns1.hostinger.com');
  const [ns2, setNs2] = useState(domain?.nameservers?.[1] ?? 'ns2.hostinger.com');
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(domain?.linkedServices.websiteIds[0] ?? '');
  const [selectedEmailId, setSelectedEmailId] = useState(domain?.linkedServices.emailIds[0] ?? '');
  const [selectedVpsId, setSelectedVpsId] = useState(domain?.linkedServices.vpsIds[0] ?? '');
  const [dnsRecords, setDnsRecords] = useState(domain?.dnsRecords?.length ? domain.dnsRecords : EMPTY_DNS);

  useEffect(() => {
    if (!domain) return;

    setClientId(domain.clientId);
    setRegistrar(domain.registrar);
    setStatus(domain.status);
    setExpiryDate(domain.expiryDate);
    setAutoRenew(domain.autoRenew);
    setPlanName(domain.planName);
    setPrice(String(domain.price));
    setNextInvoiceDate(domain.nextInvoiceDate);
    setNotes(domain.notes ?? '');
    setNs1(domain.nameservers[0]);
    setNs2(domain.nameservers[1]);
    setSelectedWebsiteId(domain.linkedServices.websiteIds[0] ?? '');
    setSelectedEmailId(domain.linkedServices.emailIds[0] ?? '');
    setSelectedVpsId(domain.linkedServices.vpsIds[0] ?? '');
    setDnsRecords(domain.dnsRecords?.length ? domain.dnsRecords : EMPTY_DNS);
  }, [domain]);

  const clientName = useMemo(() => clients.find((client) => client.id === clientId)?.name ?? 'Unassigned', [clients, clientId]);
  const subscription = useMemo(() => (domain?.subscriptionId ? getSubscription(domain.subscriptionId) : undefined), [domain?.subscriptionId, getSubscription]);

  if (!domain) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold">Domain not found</p>
        <p className="text-sm text-muted-foreground mt-2">The requested domain record no longer exists.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/domains">Back to Portfolio</Link>
        </Button>
      </Card>
    );
  }

  const fullDomain = `${domain.name}${domain.tld}`;
  const computedStatus = computeStatus(expiryDate, status);

  const updateDnsRecord = (index: number, field: 'host' | 'value' | 'ttl' | 'type', value: string) => {
    setDnsRecords((prev) => prev.map((record, currentIndex) => (currentIndex === index ? { ...record, [field]: value } : record)));
  };

  const handleSave = () => {
    const updatedDomain = {
      clientId,
      registrar,
      expiryDate,
      autoRenew,
      price: Number(price),
      billingCycle: 'yearly' as const,
      status: computedStatus as any,
      planName,
      linkedServices: {
        websiteIds: selectedWebsiteId ? [selectedWebsiteId] : [],
        emailIds: selectedEmailId ? [selectedEmailId] : [],
        vpsIds: selectedVpsId ? [selectedVpsId] : [],
      },
      dnsRecords,
      nameservers: [ns1, ns2],
      nextInvoiceDate,
      notes,
    };

    updateDomain(domain.id, updatedDomain);

    if (domain.subscriptionId && subscription) {
      updateSubscription(domain.subscriptionId, {
        clientId,
        price: Number(price),
        nextInvoiceDate,
        autoRenew,
        status: computedStatus === 'expired' ? 'expired' : 'active',
        planName,
      });
    }

    toast({ title: 'Saved', description: `${fullDomain} has been updated.` });
  };

  const handleRenew = () => {
    renewDomain(domain.id);
    toast({ title: 'Renewal created', description: `A new renewal invoice was generated for ${fullDomain}.` });
  };

  const renderStatusBadge = () => {
    switch (computedStatus) {
      case 'active':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Active</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Expiring soon</Badge>;
      case 'expired':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">Expired</Badge>;
      default:
        return <Badge variant="secondary">Suspended</Badge>;
    }
  };

  const serviceLabel = (id: string, type: 'website' | 'email' | 'vps') => {
    if (!id) return 'None';
    if (type === 'website') return websites.find((website) => website.id === id)?.name ?? 'Selected website';
    if (type === 'email') {
      const email = emails.find((item) => item.id === id);
      return email ? `${email.name}@${email.domain}` : 'Selected email';
    }
    return vps.find((server) => server.id === id)?.name ?? 'Selected VPS';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/dashboard/domains">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Globe className="h-3.5 w-3.5" />
              Domain details
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{fullDomain}</h1>
            <p className="text-muted-foreground mt-1">Manage DNS, nameservers, linked services, and billing for this domain.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRenew} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Renew now
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Overview</h2>
                <p className="text-sm text-muted-foreground">Basic ownership and billing metadata.</p>
              </div>
              {renderStatusBadge()}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
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
                <label className="text-sm font-medium">Registrar</label>
                <Select value={registrar} onValueChange={setRegistrar}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select registrar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hostinger">Hostinger</SelectItem>
                    <SelectItem value="GoDaddy">GoDaddy</SelectItem>
                    <SelectItem value="Namecheap">Namecheap</SelectItem>
                    <SelectItem value="Cloudflare">Cloudflare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Expiration date</label>
                <Input type="date" value={expiryDate.slice(0, 10)} onChange={(event) => setExpiryDate(new Date(event.target.value).toISOString())} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <Input value={planName} onChange={(event) => setPlanName(event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Billing price</label>
                <Input type="number" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
              <div>
                <div className="text-sm font-medium">Auto-renew</div>
                <p className="text-xs text-muted-foreground">Keep the subscription aligned with the renewal flow.</p>
              </div>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">DNS Management</h2>
              <p className="text-sm text-muted-foreground">Edit the most common DNS record types used by hosting platforms.</p>
            </div>

            <div className="space-y-4">
              {dnsRecords.map((record, index) => (
                <div key={record.id} className="grid gap-3 rounded-2xl border border-border p-4 lg:grid-cols-[120px_1fr_1fr_100px]">
                  <Select value={record.type} onValueChange={(value) => updateDnsRecord(index, 'type', value)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="CNAME">CNAME</SelectItem>
                      <SelectItem value="MX">MX</SelectItem>
                      <SelectItem value="TXT">TXT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={record.host} onChange={(event) => updateDnsRecord(index, 'host', event.target.value)} placeholder="Host" />
                  <Input value={record.value} onChange={(event) => updateDnsRecord(index, 'value', event.target.value)} placeholder="Value" />
                  <Input value={record.ttl} onChange={(event) => updateDnsRecord(index, 'ttl', event.target.value)} placeholder="TTL" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Nameservers</h2>
              <p className="text-sm text-muted-foreground">Use the registrar or custom DNS cluster nameservers.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">ns1</label>
                <Input value={ns1} onChange={(event) => setNs1(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ns2</label>
                <Input value={ns2} onChange={(event) => setNs2(event.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Linked Services</h2>
              <p className="text-sm text-muted-foreground">Connect the domain to hosting services and mailboxes.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Monitor className="h-4 w-4" />Website</label>
                <Select value={selectedWebsiteId || undefined} onValueChange={(value) => setSelectedWebsiteId(value === 'none' ? '' : value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {websites.map((website) => (
                      <SelectItem key={website.id} value={website.id}>{website.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" />Email</label>
                <Select value={selectedEmailId || undefined} onValueChange={(value) => setSelectedEmailId(value === 'none' ? '' : value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {emails.map((email) => (
                      <SelectItem key={email.id} value={email.id}>{email.name}@{email.domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Server className="h-4 w-4" />VPS</label>
                <Select value={selectedVpsId || undefined} onValueChange={(value) => setSelectedVpsId(value === 'none' ? '' : value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vps.map((server) => (
                      <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-medium">Website</p>
                <p className="text-muted-foreground">{serviceLabel(selectedWebsiteId, 'website')}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">{serviceLabel(selectedEmailId, 'email')}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-medium">VPS</p>
                <p className="text-muted-foreground">{serviceLabel(selectedVpsId, 'vps')}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Billing Info</h2>
            <p className="mt-1 text-sm text-muted-foreground">The domain subscription is linked to the billing engine.</p>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Subscription</span><span className="font-medium">{subscription ? subscription.id : 'Not linked'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Subscription type</span><span className="font-medium">{planName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Renewal price</span><span className="font-medium">{formatCurrency(Number(price), 'USD')}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Next invoice date</span><span className="font-medium">{formatDate(nextInvoiceDate)}</span></div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Billing cycle</p>
              <p className="mt-1">Yearly domain billing keeps the renewal chain aligned with the expiration date and invoice schedule.</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleRenew} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Generate renewal invoice
              </Button>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Domain</span><span className="font-medium">{fullDomain}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Client</span><span className="font-medium">{clientName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><span className="font-medium">{computedStatus}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Auto-renew</span><span className="font-medium">{autoRenew ? 'Enabled' : 'Disabled'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Current expiry</span><span className="font-medium">{formatDate(expiryDate)}</span></div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" placeholder="Internal notes for support, billing, or registrar operations." />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
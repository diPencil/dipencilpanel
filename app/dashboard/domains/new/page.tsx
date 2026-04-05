'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, ShieldCheck, ReceiptText } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { useToast } from '@/hooks/use-toast';

const HOST_OPTIONS = [
  { id: 'none', label: 'No host', type: 'none', price: 0 },
  { id: 'website-shared', label: 'Website — Shared', type: 'website', price: 29.99 },
  { id: 'email-workspace', label: 'Email — Workspace', type: 'email', price: 9.99 },
  { id: 'vps-basic', label: 'VPS — Basic', type: 'vps', price: 49.99 },
];

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewDomainPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    clients = [], 
    websites = [], 
    emails = [], 
    vps = [],
    vpsPlans = [],
    hostingPlans = [], 
    cloudHostingPlans = [],
    emailPlans = [],
    allCompanies = [],
    currentCompany,
    addDomain 
  } = useInvoiceData();

  const [domainName, setDomainName] = useState('');
  const [tld, setTld] = useState('.net');
  const [showAddTld, setShowAddTld] = useState(false);
  const [customTld, setCustomTld] = useState('');
  
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompany?.id || allCompanies[0]?.id || '');
  const [clientId, setClientId] = useState('');
  const [hostId, setHostId] = useState(HOST_OPTIONS[0].id);
  const [expiryDate, setExpiryDate] = useState(formatInputDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)));
  const [autoRenew, setAutoRenew] = useState(true);
  const [websiteId, setWebsiteId] = useState('');
  const [emailId, setEmailId] = useState('');
  const [vpsId, setVpsId] = useState('');
  const [registrar, setRegistrar] = useState('Hostinger');
  const [price, setPrice] = useState<number>(HOST_OPTIONS[0].price);
  const [reminderDays, setReminderDays] = useState<number | null>(null);

  const combinedHostingPlans = useMemo(() => {
    const web = hostingPlans.map(p => ({ id: `web-${p.id}`, label: `Web: ${p.name}`, type: 'website', price: p.price.yearly, original: p }));
    const cloud = cloudHostingPlans.map(p => ({ id: `cloud-${p.id}`, label: `Cloud: ${p.name}`, type: 'cloud', price: p.price.yearly, original: p }));
    const vpsP = vpsPlans.map(p => ({ id: `vps-${p.id}`, label: `VPS: ${p.name}`, type: 'vps', price: p.price * 12, original: p }));
    
    return [
      { id: 'none', label: 'No host', type: 'none', price: 0 },
      ...web,
      ...cloud,
      ...vpsP
    ];
  }, [hostingPlans, cloudHostingPlans, vpsPlans]);

  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedHost = combinedHostingPlans.find((h) => h.id === hostId) ?? combinedHostingPlans[0];

  const filteredClients = useMemo(() => {
    return clients.filter(c => c.companyId === selectedCompanyId);
  }, [clients, selectedCompanyId]);

  // Sync clientId if not set
  useEffect(() => {
    if (!clientId && filteredClients.length > 0) {
      setClientId(filteredClients[0].id);
    }
  }, [filteredClients, clientId]);

  // Logic: VPS and Host are mutually exclusive in terms of requirement but can be chosen.
  useEffect(() => {
    if (hostId !== 'none' && vpsId) {
      setVpsId('');
    }
  }, [hostId]);

  useEffect(() => {
    if (vpsId && hostId !== 'none') {
      setHostId('none');
    }
  }, [vpsId]);

  const filteredWebsites = websites.filter(w => w.clientId === clientId);
  const filteredVPS = vps.filter(v => v.clientId === clientId);
  const filteredEmails = emails.filter(e => e.clientId === clientId);

  const normalizeOptionalSelection = (value: string) => (value === 'none' ? '' : value);

  // Note: price is intentionally independent from selected host.

  const fullDomain = useMemo(() => {
    const root = domainName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\.+$/, '');
    const suffix = tld.startsWith('.') ? tld.trim() : `.${tld.trim()}`;
    return root ? `${root}${suffix}` : `example${suffix}`;
  }, [domainName, tld]);

  const linkedServicesPreview = useMemo(() => {
    const items: string[] = [];
    if (websiteId) {
      items.push(`Website: ${websites.find((website) => website.id === websiteId)?.name ?? 'Selected website'}`);
    }
    if (emailId) {
      items.push(`Email: ${emails.find((email) => email.id === emailId)?.name ?? 'Selected mailbox'}`);
    }
    if (vpsId) {
      items.push(`VPS: ${vps.find((server) => server.id === vpsId)?.name ?? 'Selected server'}`);
    }
    return items;
  }, [emailId, emails, vps, vpsId, websiteId, websites]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!domainName.trim() || !clientId) {
      toast({ title: 'Missing information', description: 'Please enter a domain name and client.', variant: 'destructive' });
      return;
    }

    // Validate TLD when custom add is enabled
    if (showAddTld) {
      if (!customTld.trim()) {
        toast({ title: 'Missing TLD', description: 'Please enter a TLD for the domain.', variant: 'destructive' });
        return;
      }
    } else if (!tld || !tld.trim()) {
      toast({ title: 'Missing TLD', description: 'Please select a TLD.', variant: 'destructive' });
      return;
    }

    // Price is required and must be positive
    if (!price || Number.isNaN(price) || price <= 0) {
      toast({ title: 'Invalid price', description: 'Please enter a valid yearly price for the domain.', variant: 'destructive' });
      return;
    }

    const expiry = new Date(expiryDate);

    try {
      const companyId = currentCompany?.id || selectedCompanyId;
      if (!companyId) {
        toast({ title: 'Error', description: 'No company found. Please refresh and try again.', variant: 'destructive' });
        return;
      }

      const created = addDomain({
        name: domainName.trim().toLowerCase().replace(/\s+/g, '-'),
        tld: tld.startsWith('.') ? tld.trim() : `.${tld.trim()}`,
        clientId,
        companyId,
        registrar,
        expiryDate: expiry.toISOString(),
        autoRenew,
        reminderDays: reminderDays ?? null,
        price: Number(price),
        billingCycle: 'yearly',
        status: 'active',
        planName: selectedHost.label,
        host: {
          type: selectedHost.type as any,
          name: selectedHost.label,
          planName: selectedHost.label,
          price: selectedHost.price,
        },
        linkedServices: {
          websiteIds: websiteId ? [websiteId] : [],
          emailIds: emailId ? [emailId] : [],
          vpsIds: vpsId ? [vpsId] : [],
        },
        dnsRecords: [
          { id: 'dns-a', type: 'A', host: '@', value: '76.76.21.21', ttl: '3600' },
          { id: 'dns-cname', type: 'CNAME', host: 'www', value: fullDomain, ttl: '3600' },
          { id: 'dns-mx', type: 'MX', host: '@', value: `mail.${fullDomain}`, ttl: '3600' },
          { id: 'dns-txt', type: 'TXT', host: '@', value: 'v=spf1 include:_spf.google.com ~all', ttl: '3600' },
        ],
        nameservers: ['ns1.hostinger.com', 'ns2.hostinger.com'],
        nextInvoiceDate: expiry.toISOString(),
        notes: selectedClient ? `Registered for ${selectedClient.name}` : undefined,
      });

      toast({
        title: 'Domain created',
        description: `${created.name}${created.tld} was linked to billing and client records.`,
      });
      router.push('/dashboard/domains');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create domain. Please try again.', variant: 'destructive' });
      console.error('[CreateDomain]', err);
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
          <h1 className="text-3xl font-bold tracking-tight">Create a Domain</h1>
          <p className="text-muted-foreground mt-1">Create a domain, attach it to a client, and generate the billing records automatically.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain name</label>
                <Input value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="pencil" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">TLD</label>
                <Select value={showAddTld ? '__add__' : tld} onValueChange={(val) => {
                  if (val === '__add__') {
                    setShowAddTld(true);
                    setTld('');
                  } else {
                    setShowAddTld(false);
                    setTld(val);
                  }
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select TLD" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=".com">.com</SelectItem>
                    <SelectItem value=".net">.net</SelectItem>
                    <SelectItem value=".org">.org</SelectItem>
                    <SelectItem value=".dev">.dev</SelectItem>
                    <SelectItem value=".io">.io</SelectItem>
                    <SelectItem value="__add__">Add new TLD...</SelectItem>
                  </SelectContent>
                </Select>

                {showAddTld && (
                  <div className="mt-2">
                    <Input placeholder="e.g. .shop or shop" value={customTld} onChange={(e) => {
                      const v = e.target.value;
                      setCustomTld(v);
                      // normalize to include dot when storing in tld state
                      setTld(v.startsWith('.') ? v : v ? `.${v}` : '');
                    }} />
                    <p className="text-xs text-muted-foreground mt-1">Enter a custom TLD (with or without a leading dot).</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Company</label>
                <Select value={selectedCompanyId} onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  const firstOfNew = clients.find(c => c.companyId === val);
                  setClientId(firstOfNew?.id || '');
                  setWebsiteId('');
                  setVpsId('');
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose a company" /></SelectTrigger>
                  <SelectContent>
                    {allCompanies.map((com) => (
                      <SelectItem key={com.id} value={com.id}>{com.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Client</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                  <SelectContent>
                    {filteredClients.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No clients for this company</div>
                    ) : (
                      filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select host</label>
                <Select value={hostId} onValueChange={setHostId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose a host" /></SelectTrigger>
                  <SelectContent>
                    {combinedHostingPlans.map((host) => (
                      <SelectItem key={host.id} value={host.id}>{host.label}{host.price ? ` - ${formatCurrency(host.price, 'USD')}/year` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Price (yearly)</label>
                <Input type="number" step="0.01" min="0" value={String(price)} onChange={(e) => setPrice(parseFloat(e.target.value || '0'))} placeholder="12.99" />
                <p className="text-xs text-muted-foreground">Enter the yearly price for this domain (required).</p>
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
                <label className="text-sm font-medium">Expiration date</label>
                <Input className="w-full" type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Pick an expiration date for the domain.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reminder before expiry</label>
                <Select value={reminderDays === null ? 'none' : String(reminderDays)} onValueChange={(val) => setReminderDays(val === 'none' ? null : parseInt(val, 10))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="No reminder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminder</SelectItem>
                    <SelectItem value="7">1 week</SelectItem>
                    <SelectItem value="14">2 weeks</SelectItem>
                    <SelectItem value="21">3 weeks</SelectItem>
                    <SelectItem value="30">1 month</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Optional reminder before expiration.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign website</label>
                <Select value={websiteId || 'none'} onValueChange={(value) => setWebsiteId(normalizeOptionalSelection(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredWebsites.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Active Websites</div>
                        {filteredWebsites.map((website) => (
                          <SelectItem key={website.id} value={website.id}>{website.name}</SelectItem>
                        ))}
                      </>
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{filteredWebsites.length > 0 ? 'Available Plans' : 'Hosting Plans'}</div>
                    {hostingPlans.map((plan) => (
                      <SelectItem key={`plan-${plan.id}`} value={`plan-${plan.id}`}>{plan.name} - {formatCurrency(plan.price.monthly, 'USD')}/mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign email</label>
                <Select value={emailId || 'none'} onValueChange={(val) => setEmailId(normalizeOptionalSelection(val))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredEmails.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Active Emails</div>
                        {filteredEmails.map((email) => (
                          <SelectItem key={email.id} value={email.id}>{email.name}@{email.domain}</SelectItem>
                        ))}
                      </>
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{filteredEmails.length > 0 ? 'Available Plans' : 'Email Plans'}</div>
                    {emailPlans.map((plan) => (
                      <SelectItem key={`plan-${plan.id}`} value={`plan-${plan.id}`}>{plan.name} - {formatCurrency(plan.price, 'USD')}/mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Assign an existing email account or select a plan.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign VPS</label>
                <Select value={vpsId || 'none'} onValueChange={(value) => setVpsId(normalizeOptionalSelection(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredVPS.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Active Servers</div>
                        {filteredVPS.map((server) => (
                          <SelectItem key={server.id} value={server.id}>{server.name} ({server.planName})</SelectItem>
                        ))}
                      </>
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{filteredVPS.length > 0 ? 'Available Plans' : 'VPS Plans'}</div>
                    {vpsPlans.map((plan) => (
                      <SelectItem key={`plan-${plan.id}`} value={`plan-${plan.id}`}>{plan.name} - {formatCurrency(plan.price, 'USD')}/mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Auto-renew
                </div>
                <p className="text-xs text-muted-foreground">Enable yearly renewal reminders and invoice generation.</p>
              </div>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="gap-2">
                <ReceiptText className="h-4 w-4" />
                Create Domain
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/domains')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Globe className="h-4 w-4" />
              Preview
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Full domain</p>
                <p className="mt-1 text-2xl font-bold break-all">{fullDomain}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedHost.label}</Badge>
                <Badge variant="outline">Yearly billing</Badge>
                <Badge variant={autoRenew ? 'default' : 'secondary'}>{autoRenew ? 'Auto-renew on' : 'Auto-renew off'}</Badge>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Client:</span> {selectedClient?.name ?? 'No client selected'}</p>
                <p><span className="font-medium text-foreground">Registrar:</span> {registrar}</p>
                <p><span className="font-medium text-foreground">Price:</span> {formatCurrency(Number(price), 'USD')} / year</p>
                <p><span className="font-medium text-foreground">Expiration:</span> {expiryDate || 'Pick a date'}</p>
                {reminderDays ? (
                  <p><span className="font-medium text-foreground">Reminder:</span> {reminderDays === 7 ? '1 week' : reminderDays === 14 ? '2 weeks' : reminderDays === 21 ? '3 weeks' : reminderDays === 30 ? '1 month' : `${reminderDays} days`} before expiry</p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Linked services</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="font-medium">Website</p>
                <p className="text-muted-foreground">{websiteId ? websites.find((website) => website.id === websiteId)?.name : 'None selected'}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">{emailId ? `${emails.find((email) => email.id === emailId)?.name}@${emails.find((email) => email.id === emailId)?.domain}` : 'None selected'}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="font-medium">VPS</p>
                <p className="text-muted-foreground">{vpsId ? vps.find((server) => server.id === vpsId)?.name : 'None selected'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
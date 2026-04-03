'use client';

import React, { useMemo, useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import type { Domain, Email } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  CheckCircle2,
  CircleX,
  Copy,
  KeyRound,
  Mail,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

type ProviderId = 'hostinger' | 'cpanel' | 'cyberpanel' | 'google-workspace' | 'zoho-mail' | 'godaddy' | 'namecheap' | 'bluehost' | 'custom-smtp';
type Protocol = 'Incoming server (IMAP)' | 'Outgoing server (SMTP)' | 'Incoming server (POP)';

type ServerRow = {
  protocol: Protocol;
  hostname: string;
  port: string;
  encryption: string;
};

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'hostinger', label: 'Hostinger' },
  { id: 'cpanel', label: 'cPanel' },
  { id: 'cyberpanel', label: 'CyberPanel' },
  { id: 'google-workspace', label: 'Google Workspace' },
  { id: 'zoho-mail', label: 'Zoho Mail' },
  { id: 'godaddy', label: 'GoDaddy' },
  { id: 'namecheap', label: 'Namecheap' },
  { id: 'bluehost', label: 'Bluehost' },
  { id: 'custom-smtp', label: 'Custom SMTP' },
];

const PROVIDER_BASE: Record<Exclude<ProviderId, 'custom-smtp'>, ServerRow[]> = {
  hostinger: [
    { protocol: 'Incoming server (IMAP)', hostname: 'imap.hostinger.com', port: '993', encryption: 'SSL' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'smtp.hostinger.com', port: '465', encryption: 'SSL' },
    { protocol: 'Incoming server (POP)', hostname: 'pop.hostinger.com', port: '995', encryption: 'SSL' },
  ],
  cpanel: [
    { protocol: 'Incoming server (IMAP)', hostname: 'mail.yourdomain.com', port: '993', encryption: 'SSL/TLS' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'mail.yourdomain.com', port: '465', encryption: 'SSL/TLS' },
    { protocol: 'Incoming server (POP)', hostname: 'mail.yourdomain.com', port: '995', encryption: 'SSL/TLS' },
  ],
  cyberpanel: [
    { protocol: 'Incoming server (IMAP)', hostname: 'mail.yourdomain.com', port: '993', encryption: 'SSL/TLS' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'mail.yourdomain.com', port: '465', encryption: 'SSL/TLS' },
    { protocol: 'Incoming server (POP)', hostname: 'mail.yourdomain.com', port: '995', encryption: 'SSL/TLS' },
  ],
  'google-workspace': [
    { protocol: 'Incoming server (IMAP)', hostname: 'imap.gmail.com', port: '993', encryption: 'SSL' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'smtp.gmail.com', port: '465', encryption: 'SSL/TLS' },
    { protocol: 'Incoming server (POP)', hostname: 'pop.gmail.com', port: '995', encryption: 'SSL' },
  ],
  'zoho-mail': [
    { protocol: 'Incoming server (IMAP)', hostname: 'imap.zoho.com', port: '993', encryption: 'SSL' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'smtp.zoho.com', port: '465', encryption: 'SSL/TLS' },
    { protocol: 'Incoming server (POP)', hostname: 'pop.zoho.com', port: '995', encryption: 'SSL' },
  ],
  godaddy: [
    { protocol: 'Incoming server (IMAP)', hostname: 'imap.secureserver.net', port: '993', encryption: 'SSL' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'smtpout.secureserver.net', port: '465', encryption: 'SSL' },
    { protocol: 'Incoming server (POP)', hostname: 'pop.secureserver.net', port: '995', encryption: 'SSL' },
  ],
  namecheap: [
    { protocol: 'Incoming server (IMAP)', hostname: 'mail.privateemail.com', port: '993', encryption: 'SSL' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'mail.privateemail.com', port: '465', encryption: 'SSL' },
    { protocol: 'Incoming server (POP)', hostname: 'mail.privateemail.com', port: '995', encryption: 'SSL' },
  ],
  bluehost: [
    { protocol: 'Incoming server (IMAP)', hostname: 'mail.yourdomain.com', port: '993', encryption: 'SSL/TLS' },
    { protocol: 'Outgoing server (SMTP)', hostname: 'mail.yourdomain.com', port: '465', encryption: 'SSL/TLS' },
    { protocol: 'Incoming server (POP)', hostname: 'mail.yourdomain.com', port: '995', encryption: 'SSL/TLS' },
  ],
};

const getDomainFqdn = (domain: Domain): string => `${domain.name}${domain.tld}`;

function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function EmailConfigurationPage() {
  const { domains = [], emails = [], hosting = [], vps = [] } = useInvoiceData();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('none');
  const [selectedEmailId, setSelectedEmailId] = useState<string>('none');
  const [providerId, setProviderId] = useState<ProviderId>('hostinger');
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle');

  const [customRows, setCustomRows] = useState<ServerRow[]>([
    { protocol: 'Incoming server (IMAP)', hostname: '', port: '993', encryption: 'SSL/TLS' },
    { protocol: 'Outgoing server (SMTP)', hostname: '', port: '465', encryption: 'SSL/TLS' },
    { protocol: 'Incoming server (POP)', hostname: '', port: '995', encryption: 'SSL/TLS' },
  ]);

  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.id === selectedDomainId) ?? null,
    [domains, selectedDomainId],
  );

  const selectedDomainFqdn = useMemo(
    () => (selectedDomain ? getDomainFqdn(selectedDomain) : ''),
    [selectedDomain],
  );

  const domainEmails = useMemo(
    () => emails.filter((email) => !selectedDomainFqdn || email.domain === selectedDomainFqdn),
    [emails, selectedDomainFqdn],
  );

  const selectedEmail: Email | null = useMemo(() => {
    const found = domainEmails.find((email) => email.id === selectedEmailId);
    return found ?? null;
  }, [domainEmails, selectedEmailId]);

  const resolvedRows = useMemo<ServerRow[]>(() => {
    if (providerId === 'custom-smtp') {
      return customRows;
    }

    const rows = PROVIDER_BASE[providerId];

    if ((providerId === 'cpanel' || providerId === 'cyberpanel' || providerId === 'bluehost') && selectedDomainFqdn) {
      const host = `mail.${selectedDomainFqdn}`;
      return rows.map((row) => ({ ...row, hostname: host }));
    }

    return rows;
  }, [providerId, customRows, selectedDomainFqdn]);

  const domainBasedHosts = useMemo(() => {
    if (!selectedDomainFqdn) {
      return { mailHost: 'mail.yourdomain.com', smtpHost: 'smtp.yourdomain.com' };
    }
    return {
      mailHost: `mail.${selectedDomainFqdn}`,
      smtpHost: `smtp.${selectedDomainFqdn}`,
    };
  }, [selectedDomainFqdn]);

  const cnameTargets = useMemo(() => {
    const providerSuffix =
      providerId === 'hostinger'
        ? 'hostinger.com'
        : providerId === 'cpanel' || providerId === 'cyberpanel' || providerId === 'bluehost'
          ? selectedDomainFqdn || 'yourdomain.com'
          : providerId === 'google-workspace'
            ? 'google.com'
            : providerId === 'zoho-mail'
              ? 'zoho.com'
              : providerId === 'godaddy'
                ? 'secureserver.net'
                : providerId === 'namecheap'
                  ? 'privateemail.com'
                  : 'provider.com';

    return [
      { type: 'CNAME', host: 'autodiscover', pointsTo: `autodiscover.mail.${providerSuffix}` },
      { type: 'CNAME', host: 'autoconfig', pointsTo: `autoconfig.mail.${providerSuffix}` },
    ];
  }, [providerId, selectedDomainFqdn]);

  const dnsRecords = useMemo(() => {
    const domain = selectedDomainFqdn || 'yourdomain.com';
    const mxTarget =
      providerId === 'google-workspace'
        ? 'aspmx.l.google.com'
        : providerId === 'zoho-mail'
          ? 'mx.zoho.com'
          : providerId === 'hostinger'
            ? 'mx1.hostinger.com'
            : providerId === 'cpanel' || providerId === 'cyberpanel' || providerId === 'bluehost'
              ? domainBasedHosts.mailHost
              : providerId === 'godaddy'
                ? 'mailstore1.secureserver.net'
                : providerId === 'namecheap'
                  ? 'mx1.privateemail.com'
                  : domainBasedHosts.mailHost;

    const spfValue =
      providerId === 'google-workspace'
        ? 'v=spf1 include:_spf.google.com ~all'
        : providerId === 'zoho-mail'
          ? 'v=spf1 include:zoho.com ~all'
          : providerId === 'hostinger'
            ? 'v=spf1 include:_spf.mail.hostinger.com ~all'
            : providerId === 'cpanel' || providerId === 'cyberpanel' || providerId === 'bluehost'
              ? `v=spf1 a mx ip4:YOUR.SERVER.IP ~all`
              : providerId === 'godaddy'
                ? 'v=spf1 include:secureserver.net ~all'
                : providerId === 'namecheap'
                  ? 'v=spf1 include:spf.privateemail.com ~all'
                  : 'v=spf1 include:your.smtp.provider ~all';

    return {
      mx: `@ 10 ${mxTarget}`,
      spf: spfValue,
      dkim: `default._domainkey.${domain} TXT \"v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY\"`,
      dmarc: `_dmarc.${domain} TXT \"v=DMARC1; p=none; rua=mailto:dmarc@${domain}\"`,
    };
  }, [providerId, selectedDomainFqdn, domainBasedHosts.mailHost]);

  const linkedHosting = useMemo(
    () => hosting.filter((item) => item.domainId === selectedDomainId),
    [hosting, selectedDomainId],
  );

  const linkedVps = useMemo(() => {
    if (!selectedDomainFqdn) {
      return [];
    }
    return vps.filter((server) => (server.notes ?? '').toLowerCase().includes(selectedDomainFqdn.toLowerCase()));
  }, [vps, selectedDomainFqdn]);

  const updateCustomRow = (index: number, field: 'hostname' | 'port' | 'encryption', value: string) => {
    setCustomRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const testConfiguration = () => {
    const hasDomain = selectedDomain !== null;
    const hasEmail = selectedEmail !== null;
    const validCustom =
      providerId !== 'custom-smtp' ||
      customRows.every((row) => row.hostname.trim().length > 0 && row.port.trim().length > 0);

    if (hasDomain && hasEmail && validCustom) {
      setTestResult('success');
      toast.success('Email configuration test passed successfully.');
    } else {
      setTestResult('failed');
      toast.error('Email configuration test failed. Please complete all required fields.');
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure your email client using your server settings</p>
      </div>

      <Card className="p-5 border-border/60 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Domain</p>
            <Select
              value={selectedDomainId}
              onValueChange={(value) => {
                setSelectedDomainId(value);
                setSelectedEmailId('none');
                setTestResult('idle');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select domain</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {getDomainFqdn(domain)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Email Account</p>
            <Select value={selectedEmailId} onValueChange={setSelectedEmailId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose mailbox" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select email account</SelectItem>
                {domainEmails.map((email) => (
                  <SelectItem key={email.id} value={email.id}>
                    {email.name}@{email.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Provider</p>
            <Select
              value={providerId}
              onValueChange={(value) => {
                setProviderId(value as ProviderId);
                setTestResult('idle');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b border-border/60 bg-muted/40 px-5 py-4">
          <h2 className="text-base font-semibold">Configure your email client using email server</h2>
        </div>

        {providerId === 'custom-smtp' && (
          <div className="border-b border-border/60 bg-amber-50/50 px-5 py-4">
            <p className="text-xs text-amber-800">Custom SMTP selected. Enter your own hostnames and ports below.</p>
          </div>
        )}

        <div className="hidden md:block overflow-x-auto px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 font-semibold">Protocol</th>
                <th className="py-3 font-semibold">Hostname</th>
                <th className="py-3 font-semibold">Port</th>
                <th className="py-3 font-semibold">Encryption</th>
              </tr>
            </thead>
            <tbody>
              {resolvedRows.map((row, index) => (
                <tr key={row.protocol} className="border-b last:border-0">
                  <td className="py-3 font-medium">{row.protocol}</td>
                  <td className="py-3">
                    {providerId === 'custom-smtp' ? (
                      <Input
                        value={row.hostname}
                        onChange={(event) => updateCustomRow(index, 'hostname', event.target.value)}
                        placeholder="mail.provider.com"
                      />
                    ) : (
                      <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                        <span>{row.hostname}</span>
                        <CopyValueButton value={row.hostname} />
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    {providerId === 'custom-smtp' ? (
                      <Input
                        value={row.port}
                        onChange={(event) => updateCustomRow(index, 'port', event.target.value)}
                        placeholder="465"
                      />
                    ) : (
                      <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                        <span>{row.port}</span>
                        <CopyValueButton value={row.port} />
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    {providerId === 'custom-smtp' ? (
                      <Input
                        value={row.encryption}
                        onChange={(event) => updateCustomRow(index, 'encryption', event.target.value)}
                        placeholder="SSL/TLS"
                      />
                    ) : (
                      <Badge variant="outline">{row.encryption}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {resolvedRows.map((row, index) => (
            <Card key={row.protocol} className="p-4 border-border/60">
              <div className="space-y-3 text-sm">
                <p className="font-semibold">{row.protocol}</p>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hostname</p>
                  {providerId === 'custom-smtp' ? (
                    <Input
                      value={row.hostname}
                      onChange={(event) => updateCustomRow(index, 'hostname', event.target.value)}
                      placeholder="mail.provider.com"
                    />
                  ) : (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                      <span>{row.hostname}</span>
                      <CopyValueButton value={row.hostname} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Port</p>
                  {providerId === 'custom-smtp' ? (
                    <Input
                      value={row.port}
                      onChange={(event) => updateCustomRow(index, 'port', event.target.value)}
                      placeholder="465"
                    />
                  ) : (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                      <span>{row.port}</span>
                      <CopyValueButton value={row.port} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Encryption</p>
                  {providerId === 'custom-smtp' ? (
                    <Input
                      value={row.encryption}
                      onChange={(event) => updateCustomRow(index, 'encryption', event.target.value)}
                      placeholder="SSL/TLS"
                    />
                  ) : (
                    <Badge variant="outline" className="mt-1">
                      {row.encryption}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b border-border/60 bg-muted/40 px-5 py-4">
          <h2 className="text-base font-semibold">Configure your email client using CNAME records</h2>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 font-semibold">Type</th>
                  <th className="py-3 font-semibold">Host</th>
                  <th className="py-3 font-semibold">Points to</th>
                </tr>
              </thead>
              <tbody>
                {cnameTargets.map((record) => (
                  <tr key={record.host} className="border-b last:border-0">
                    <td className="py-3 font-medium">{record.type}</td>
                    <td className="py-3">
                      <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                        <span>{record.host}</span>
                        <CopyValueButton value={record.host} />
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                        <span>{record.pointsTo}</span>
                        <CopyValueButton value={record.pointsTo} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {cnameTargets.map((record) => (
              <Card key={record.host} className="p-4 border-border/60">
                <p className="text-sm font-semibold">{record.type}</p>
                <div className="mt-2 space-y-2 text-xs">
                  <div>
                    <p className="uppercase tracking-wide text-muted-foreground">Host</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono">
                      <span>{record.host}</span>
                      <CopyValueButton value={record.host} />
                    </div>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-muted-foreground">Points to</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono">
                      <span>{record.pointsTo}</span>
                      <CopyValueButton value={record.pointsTo} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 border-border/60 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">DNS Integration</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: 'MX Records', value: dnsRecords.mx },
            { label: 'SPF', value: dnsRecords.spf },
            { label: 'DKIM', value: dnsRecords.dkim },
            { label: 'DMARC', value: dnsRecords.dmarc },
          ].map((record) => (
            <div key={record.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{record.label}</p>
              <div className="mt-2 flex items-start justify-between gap-2 rounded-md border bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
                <span className="break-all">{record.value}</span>
                <CopyValueButton value={record.value} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Email Account Details</h2>
          </div>
          {selectedEmail ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Email address</span>
                <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                  <span>{selectedEmail.name}@{selectedEmail.domain}</span>
                  <CopyValueButton value={`${selectedEmail.name}@${selectedEmail.domain}`} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Username</span>
                <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs">
                  <span>{selectedEmail.name}@{selectedEmail.domain}</span>
                  <CopyValueButton value={`${selectedEmail.name}@${selectedEmail.domain}`} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Password hint</span>
                <div className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>******** (stored securely)</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Mailbox size</span>
                <Badge variant="outline">{selectedEmail.storage} GB</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an email account to view mailbox details.</p>
          )}
        </Card>

        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Domain-based Logic and Integration</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auto-generated hosts</p>
              <div className="mt-2 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-2 py-1">
                  <span>{domainBasedHosts.mailHost}</span>
                  <CopyValueButton value={domainBasedHosts.mailHost} />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-2 py-1">
                  <span>{domainBasedHosts.smtpHost}</span>
                  <CopyValueButton value={domainBasedHosts.smtpHost} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked services</p>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <p>Hosting plans linked: <span className="font-semibold text-foreground">{linkedHosting.length}</span></p>
                <p>VPS servers linked: <span className="font-semibold text-foreground">{linkedVps.length}</span></p>
                <p>Email accounts on domain: <span className="font-semibold text-foreground">{domainEmails.length}</span></p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 border-border/60 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Test Connection</h2>
            <p className="text-sm text-muted-foreground mt-1">Verify if the current email configuration is valid.</p>
          </div>
          <Button onClick={testConfiguration}>Test Email Configuration</Button>
        </div>
        {testResult !== 'idle' && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
            {testResult === 'success' ? (
              <div className="inline-flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Success: Email configuration is valid and ready to use.
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-rose-700">
                <CircleX className="h-4 w-4" />
                Failed: Please select domain, email account, and complete provider settings.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

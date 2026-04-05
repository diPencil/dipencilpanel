'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Globe, Copy, ShieldCheck, Search, Pencil, ChevronRight, Info } from 'lucide-react';
import { REGISTRAR_NAMESERVERS } from '@/lib/constants';
import { toast } from 'sonner';
import { EditDomainDNSDialog } from '@/components/domains/edit-domain-dns-dialog';
import { cn } from '@/lib/utils';

export default function DNSNameserversPage() {
  const { domains = [] } = useInvoiceData();
  const [search, setSearch] = useState('');
  const [dnsTarget, setDnsTarget] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filtered = domains.filter((d) =>
    `${d.name}${d.tld}`.toLowerCase().includes(search.toLowerCase()) ||
    d.registrar?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/dashboard/domains" className="hover:text-foreground transition-colors">
            All Domains
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">DNS & Nameservers</span>
        </nav>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground w-fit shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" />
          DNS Management
        </div>
        <h1 className="text-3xl font-bold tracking-tight">DNS & Nameservers</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          View and update nameservers for all your domains. Click Edit to configure nameservers for a specific domain.
        </p>
      </div>

      {/* Domain nameservers table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">My Domains</h2>
          <Badge variant="secondary">{domains.length}</Badge>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domain or registrar..."
            className="pl-9"
          />
        </div>

        <Card className="overflow-hidden border-border/60">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {domains.length === 0 ? 'No domains added yet.' : 'No domains match your search.'}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((domain) => {
                const hasNS = domain.nameservers && domain.nameservers.length > 0;
                const registrarNS = domain.registrar ? REGISTRAR_NAMESERVERS[domain.registrar] : undefined;
                const displayNS = hasNS ? domain.nameservers : registrarNS;
                const isDefault = !hasNS && !!registrarNS;

                return (
                  <div key={domain.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between hover:bg-muted/20 transition-colors">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold">{domain.name}{domain.tld}</span>
                        {domain.registrar && (
                          <Badge variant="outline" className="text-xs">{domain.registrar}</Badge>
                        )}
                        {isDefault && (
                          <Badge variant="secondary" className="text-[10px]">Default NS</Badge>
                        )}
                        {!hasNS && !registrarNS && (
                          <Badge variant="destructive" className="text-[10px]">No NS set</Badge>
                        )}
                      </div>

                      {displayNS && displayNS.length > 0 ? (
                        <div className="space-y-1 pl-6">
                          {displayNS.map((ns, idx) => (
                            <div key={idx} className="flex items-center gap-2 group/ns">
                              <code className={cn(
                                'text-xs font-mono',
                                isDefault ? 'text-muted-foreground/60 italic' : 'text-muted-foreground',
                              )}>
                                {ns}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ns)}
                                className="opacity-0 group-hover/ns:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="pl-6 text-xs text-muted-foreground italic">No nameservers configured</p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => setDnsTarget(domain.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit NS
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Reference cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Registrar Reference</h2>
        <p className="text-sm text-muted-foreground">
          Default nameservers for major registrars. Click any value to copy it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(REGISTRAR_NAMESERVERS).map(([name, nsList]) => (
            <Card key={name} className="overflow-hidden border-border/50 group hover:shadow-md transition-all">
              <div className="bg-primary/5 p-4 border-b border-border/50 flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-card border border-border/50 flex items-center justify-center text-primary shadow-sm">
                  <Globe className="h-3.5 w-3.5" />
                </div>
                <h3 className="font-bold text-sm">{name}</h3>
              </div>
              <div className="p-4 space-y-1.5">
                {nsList.map((ns, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => copyToClipboard(ns)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group/ns border border-transparent hover:border-border/50 transition-all text-left"
                  >
                    <code className="text-xs font-mono text-muted-foreground truncate mr-2">{ns}</code>
                    <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/ns:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-start gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                    <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-700/80 leading-relaxed font-medium">
                      Standard {name} configuration. Always verify with your account panel.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit DNS dialog */}
      <EditDomainDNSDialog
        open={!!dnsTarget}
        onOpenChange={(open) => { if (!open) setDnsTarget(null); }}
        domainId={dnsTarget}
      />
    </div>
  );
}


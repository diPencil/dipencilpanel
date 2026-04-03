'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Copy, Info, ExternalLink, ShieldCheck } from 'lucide-react';
import { REGISTRAR_NAMESERVERS } from '@/lib/constants';
import { toast } from 'sonner';

export default function DNSNameserversPage() {
  const registrars = Object.entries(REGISTRAR_NAMESERVERS);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground w-fit shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" />
          DNS Reference
        </div>
        <h1 className="text-3xl font-bold tracking-tight">DNS & Nameservers</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Quick reference list of default Nameservers for major domain registrars. Use these values to point your domains to their respective provider's DNS management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {registrars.map(([name, nsList]) => (
          <Card key={name} className="overflow-hidden border-border/50 group hover:shadow-md transition-all ring-1 ring-border/5">
            <div className="bg-primary/5 p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-card border border-border/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                   <Globe className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm tracking-tight">{name}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                 <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="p-5 space-y-4">
               <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Default Nameservers</p>
                  <div className="space-y-1.5">
                    {nsList.map((ns, idx) => (
                      <div key={idx} className="flex items-center justify-between group/ns p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all bg-muted/20">
                         <code className="text-xs font-mono text-muted-foreground truncate mr-2">{ns}</code>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 opacity-0 group-hover/ns:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                            onClick={() => copyToClipboard(ns)}
                         >
                            <Copy className="h-3 w-3" />
                         </Button>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="pt-2 border-t border-border/30">
                  <div className="flex items-start gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                    <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700/80 leading-relaxed font-medium"> 
                       Tip: Standard {name} configuration usually follows this pattern. Always verify with your specific account panel.
                    </p>
                  </div>
               </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 border-dashed border-2 bg-muted/10">
         <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
               <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Need to use custom Nameservers?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
               If you want to use external services like Cloudflare or specialized hosting DNS, you'll need to update your nameservers manually in the {registrars[0][0]} control panel.
            </p>
            <div className="pt-2">
               <Link href="/dashboard/domains">
                <Button className="rounded-xl shadow-lg shadow-primary/10 gap-2">
                    <Globe className="h-4 w-4" /> Go to My Domains
                </Button>
               </Link>
            </div>
         </div>
      </Card>
    </div>
  );
}

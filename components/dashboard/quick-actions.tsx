'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, FileText, Globe, Monitor } from 'lucide-react';

type CardTone = 'sky' | 'emerald' | 'slate' | 'violet';

type QuickActionItem = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: CardTone;
};

const toneStyles: Record<CardTone, { card: string; icon: string; title: string; description: string }> = {
    sky: {
      card:
        'border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-sky-100/70 text-sky-950 shadow-sm hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 dark:border-sky-500/20 dark:from-sky-500/10 dark:via-slate-900 dark:to-sky-500/5 dark:text-sky-50 dark:hover:border-sky-500/30 dark:hover:shadow-sky-500/10',
      icon:
        'bg-sky-500/10 text-sky-600 ring-sky-500/10 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/20',
      title: 'text-sky-950 dark:text-sky-50',
      description: 'text-sky-700/80 dark:text-sky-200/75',
    },
    emerald: {
      card:
        'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 text-emerald-950 shadow-sm hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-slate-900 dark:to-emerald-500/5 dark:text-emerald-50 dark:hover:border-emerald-500/30 dark:hover:shadow-emerald-500/10',
      icon:
        'bg-emerald-500/10 text-emerald-600 ring-emerald-500/10 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/20',
      title: 'text-emerald-950 dark:text-emerald-50',
      description: 'text-emerald-700/80 dark:text-emerald-200/75',
    },
    slate: {
      card:
        'border-border/70 bg-gradient-to-br from-background via-background to-muted/35 text-foreground shadow-sm hover:border-primary/25 hover:shadow-lg hover:shadow-black/5 dark:border-border/60 dark:bg-gradient-to-br dark:from-background dark:via-background dark:to-muted/20',
      icon: 'bg-primary/10 text-primary ring-primary/10',
      title: 'text-foreground',
      description: 'text-muted-foreground',
    },
    violet: {
      card:
        'border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-violet-100/70 text-violet-950 shadow-sm hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 dark:border-violet-500/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-violet-500/5 dark:text-violet-50 dark:hover:border-violet-500/30 dark:hover:shadow-violet-500/10',
      icon:
        'bg-violet-500/10 text-violet-600 ring-violet-500/10 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/20',
      title: 'text-violet-950 dark:text-violet-50',
      description: 'text-violet-700/80 dark:text-violet-200/75',
    },
  };

function QuickActionCard({ href, title, description, icon: Icon, tone }: QuickActionItem) {
  const styles = toneStyles[tone];

  return (
    <Link href={href} className="group block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className={cn('h-full border p-0 transition-all duration-200 hover:-translate-y-0.5', styles.card)}>
        <div className="flex h-full items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-200 group-hover:scale-105', styles.icon)}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className={cn('text-base font-semibold tracking-tight', styles.title)}>{title}</div>
              <div className={cn('mt-1 text-sm', styles.description)}>{description}</div>
            </div>
          </div>

          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-current/70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}

export function QuickActions() {
  const quickActions = [
    {
      href: '/dashboard/websites/new',
      title: 'Add Website',
      description: 'Create a new website',
      icon: Monitor,
      tone: 'sky' as const,
    },
    {
      href: '/dashboard/domains/new',
      title: 'Add Domain',
      description: 'Register or transfer',
      icon: Globe,
      tone: 'emerald' as const,
    },
    {
      href: '/dashboard/billing/invoices/new',
      title: 'Create Invoice',
      description: 'Generate billing documents',
      icon: FileText,
      tone: 'slate' as const,
    },
  ] satisfies QuickActionItem[];

  return (
    <>
      {quickActions.map((action) => (
        <QuickActionCard key={`${action.title}-${action.href}`} {...action} />
      ))}
    </>
  );
}

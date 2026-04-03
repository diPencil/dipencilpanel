'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Smartphone,
  MoreVertical,
  Globe,
  HardDrive,
  Server,
  Mail,
  ExternalLink,
  Pencil,
  Trash2,
  PlayCircle,
  PauseCircle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { AppStatusBadge, AppTypeBadge, AppPlanBadge, AppFrameworkBadge } from './app-badge';
import type { MobileApp, Client, Domain, Hosting, VPS } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';

interface AppCardProps {
  app: MobileApp;
  client?: Client;
  domain?: Domain;
  hosting?: Hosting;
  vps?: VPS;
  company?: { id: string; name: string };
  emailCount: number;
  onEdit?: (app: MobileApp) => void;
  onDelete?: (app: MobileApp) => void;
  onStatusChange?: (id: string, status: MobileApp['status']) => void;
}

const APP_TYPE_ICON_COLOR: Record<string, string> = {
  android: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  ios: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  windows: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30',
};

export function AppCard({
  app, client, domain, hosting, vps, company, emailCount,
  onEdit, onDelete, onStatusChange,
}: AppCardProps) {
  const router = useRouter();
  const iconColor = APP_TYPE_ICON_COLOR[app.appType] ?? APP_TYPE_ICON_COLOR.android;

  const missingDomain = !app.domainId;
  const missingInfra = !app.hostingId && !app.vpsId;
  const hasWarnings = missingDomain || missingInfra;

  return (
    <Card className={cn(
      'group relative flex flex-col gap-0 overflow-hidden transition-all duration-200 hover:shadow-lg',
      hasWarnings ? 'ring-1 ring-amber-300/60' : 'hover:ring-1 hover:ring-primary/20',
    )}>
      {/* Top color stripe */}
      <div className={cn(
        'h-1 w-full',
        app.status === 'live' ? 'bg-emerald-400' :
        app.status === 'development' ? 'bg-amber-400' :
        app.status === 'suspended' ? 'bg-red-400' : 'bg-gray-300',
      )} />

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconColor)}>
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-snug truncate">{app.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span>{client?.name ?? 'Unknown Client'}</span>
                {company && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <span className="font-medium text-primary/70">{company.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AppStatusBadge status={app.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/dashboard/mobile-apps/${app.id}`)}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Manage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(app)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {app.status !== 'live' && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(app.id, 'live')} className="text-emerald-600">
                    <PlayCircle className="h-4 w-4 mr-2" /> Mark as Live
                  </DropdownMenuItem>
                )}
                {app.status !== 'suspended' && (
                  <DropdownMenuItem onClick={() => onStatusChange?.(app.id, 'suspended')} className="text-amber-600">
                    <PauseCircle className="h-4 w-4 mr-2" /> Suspend
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete?.(app)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <AppTypeBadge type={app.appType} />
          <AppFrameworkBadge framework={app.framework} />
          <AppPlanBadge plan={app.plan} />
        </div>

        {/* Services */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
            domain ? 'bg-muted/50' : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400',
          )}>
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs font-medium">
              {domain ? `${domain.name}${domain.tld}` : 'No domain'}
            </span>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
            (hosting || vps) ? 'bg-muted/50' : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400',
          )}>
            {vps ? <Server className="h-3.5 w-3.5 shrink-0" /> : <HardDrive className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate text-xs font-medium">
              {hosting ? hosting.planName : vps ? vps.planName : 'No server'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-muted/50">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium">
              {emailCount > 0 ? `${emailCount} email${emailCount > 1 ? 's' : ''}` : 'No emails'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-muted/50">
            <DollarSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium">
              {formatCurrency(app.price)} / {app.billingCycle === 'yearly' ? 'yr' : 'mo'}
            </span>
          </div>
        </div>

        {/* Expiry */}
        {app.expiryDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Expires {new Date(app.expiryDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
            {missingDomain && <p>⚠ No domain linked</p>}
            {missingInfra && <p>⚠ No hosting or VPS linked</p>}
          </div>
        )}

        {/* Action */}
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-auto"
          onClick={() => router.push(`/dashboard/mobile-apps/${app.id}`)}
        >
          Manage Application
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MobileAppStatus, MobileAppType, MobileAppPlan } from '@/lib/types';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MobileAppStatus, { label: string; className: string }> = {
  development: {
    label: 'Development',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  },
  live: {
    label: 'Live',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400',
  },
};

export function AppStatusBadge({ status }: { status: MobileAppStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.development;
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

// ─── App Type Badge (Platform) ─────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  android: {
    label: 'Android',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
    dot: 'bg-green-500',
  },
  ios: {
    label: 'iOS',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  windows: {
    label: 'Windows',
    className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
};

export function AppTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.android;
  return (
    <Badge variant="outline" className={cn('font-medium text-xs gap-1.5', config.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </Badge>
  );
}

// ─── Framework Badge ───────────────────────────────────────────────────────────

const FRAMEWORK_CONFIG: Record<string, { label: string; className: string }> = {
  flutter: {
    label: 'Flutter',
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
  },
  react_native: {
    label: 'React Native',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  kotlin: {
    label: 'Kotlin',
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  },
  swift: {
    label: 'Swift',
    className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
  },
  java: {
    label: 'Java',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  },
  dart: {
    label: 'Dart',
    className: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  },
  python: {
    label: 'Python',
    className: 'bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200',
  },
  nodejs: {
    label: 'Node.js',
    className: 'bg-lime-100 text-lime-900 border-lime-200 dark:bg-lime-900/30 dark:text-lime-200',
  },
  native: {
    label: 'Native',
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300',
  },
};

export function AppFrameworkBadge({ framework }: { framework: string }) {
  const config = FRAMEWORK_CONFIG[framework] ?? FRAMEWORK_CONFIG.native;
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

// ─── Plan Badge ────────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  basic: {
    label: 'Basic',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300',
  },
  pro: {
    label: 'Pro',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  },
  enterprise: {
    label: 'Enterprise',
    className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  },
};

export function AppPlanBadge({ plan }: { plan: string }) {
  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.basic;
  return (
    <Badge variant="outline" className={cn('font-medium text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

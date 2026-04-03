/**
 * Website Migration — shared constants, types, and pure helpers.
 * Safe to import in both client and server code (no Node.js built-ins).
 */

// ─── Migration type helpers ───────────────────────────────────────────────────

/** Returns the default TCP port to check for a given migration type. */
export function getMigrationPort(type: string): number {
  switch (type) {
    case 'cpanel':    return 2083; // cPanel HTTPS API
    case 'plesk':     return 8443; // Plesk HTTPS
    case 'ftp':       return 21;
    case 'wordpress': return 22;
    default:          return 22;
  }
}

export const MIGRATION_TYPES: Record<string, { label: string; port: number; description: string }> = {
  cpanel:    { label: 'cPanel Backup',  port: 2083, description: 'Transfer full cPanel account backup (files + databases + emails)' },
  plesk:     { label: 'Plesk Transfer', port: 8443, description: 'Transfer from Plesk-based hosting panel' },
  wordpress: { label: 'WordPress Only', port: 22,   description: 'Migrate WordPress files and database via SSH' },
  ftp:       { label: 'FTP/SFTP + SQL', port: 21,   description: 'Transfer files via FTP and import SQL dump' },
};

// ─── Status helpers ───────────────────────────────────────────────────────────

export type MigrationStatus =
  | 'pending'
  | 'analyzing'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const STATUS_LABELS: Record<MigrationStatus, string> = {
  pending:     'Pending',
  analyzing:   'Analyzing',
  ready:       'Ready',
  in_progress: 'In Progress',
  completed:   'Completed',
  failed:      'Failed',
  cancelled:   'Cancelled',
};

export const STATUS_COLORS: Record<MigrationStatus, string> = {
  pending:     'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  analyzing:   'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  ready:       'bg-green-500/10 text-green-700 dark:text-green-400',
  in_progress: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  completed:   'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  failed:      'bg-red-500/10 text-red-700 dark:text-red-400',
  cancelled:   'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

/** Returns the next allowed statuses an admin can manually advance to. */
export function getAllowedTransitions(current: MigrationStatus): MigrationStatus[] {
  switch (current) {
    case 'pending':     return ['analyzing', 'cancelled'];
    case 'analyzing':   return ['ready', 'failed', 'cancelled'];
    case 'ready':       return ['in_progress', 'cancelled'];
    case 'in_progress': return ['completed', 'failed', 'cancelled'];
    default:            return [];
  }
}

// ─── Log helpers ─────────────────────────────────────────────────────────────

export interface MigrationLog {
  time: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export function parseLogs(raw: string): MigrationLog[] {
  try {
    return JSON.parse(raw) as MigrationLog[];
  } catch {
    return [];
  }
}

export function appendLog(raw: string, message: string, level: MigrationLog['level'] = 'info'): string {
  const logs = parseLogs(raw);
  logs.push({ time: new Date().toISOString(), message, level });
  return JSON.stringify(logs);
}


import type { Hosting, VPS } from './types';

export interface StorageBreakdownItem {
  id: string;
  name: string;
  planName: string;
  storage: number;
  source: 'hosting' | 'vps';
  status: string;
}

export interface StorageSummary {
  hostingStorage: number;
  vpsStorage: number;
  totalStorage: number;
  totalServices: number;
  hostingShare: number;
  vpsShare: number;
}

const STORAGE_VALUE_REGEX = /(\d+(?:\.\d+)?)/;

export function parseStorageAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const match = value.match(STORAGE_VALUE_REGEX);
  return match ? Number(match[1]) : 0;
}

export function getHostingStorageTotal(hosting: Hosting[] = []): number {
  return hosting.reduce((sum, item) => sum + parseStorageAmount(item.resources?.storage), 0);
}

export function getVpsStorageTotal(vps: VPS[] = []): number {
  return vps.reduce((sum, item) => sum + parseStorageAmount(item.storage), 0);
}

export function getStorageSummary(hosting: Hosting[] = [], vps: VPS[] = []): StorageSummary {
  const hostingStorage = getHostingStorageTotal(hosting);
  const vpsStorage = getVpsStorageTotal(vps);
  const totalStorage = hostingStorage + vpsStorage;
  const hostingShare = totalStorage > 0 ? Math.round((hostingStorage / totalStorage) * 100) : 0;
  const vpsShare = totalStorage > 0 ? 100 - hostingShare : 0;

  return {
    hostingStorage,
    vpsStorage,
    totalStorage,
    totalServices: hosting.length + vps.length,
    hostingShare,
    vpsShare,
  };
}

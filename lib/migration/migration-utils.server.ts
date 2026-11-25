/**
 * Website Migration - server-only utilities (Node.js crypto + net).
 * NEVER import this from client components or pages with 'use client'.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { lookup } from 'dns/promises';
import * as net from 'net';
import { appendLog, getMigrationPort } from './migration-utils';

export { appendLog, getMigrationPort };

// ─── Encryption ───────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? 'dipencil-panel-super-secret-key-2026-change-me';
  return Buffer.from(secret.substring(0, 32).padEnd(32, '0'));
}

/** Encrypt a plain-text password. Returns `iv:ciphertext` (hex). */
export function encryptPassword(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt a password stored by `encryptPassword`. */
export function decryptPassword(stored: string): string {
  const [ivHex, dataHex] = stored.split(':');
  if (!ivHex || !dataHex) return ''; // legacy plain-text fallback
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// ─── TCP Port Check ───────────────────────────────────────────────────────────

/**
 * Returns `true` if the TCP port on `host` accepts connections within `timeoutMs`.
 */
export function checkPortOpen(host: string, port: number, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (result: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
    socket.connect(port, host);
  });
}

// ─── SSRF guard ───────────────────────────────────────────────────────────────

/** True for loopback, private, link-local, CGNAT and reserved IPv4 ranges. */
function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

/** True for loopback, unique-local, link-local, multicast and mapped IPv6. */
function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();

  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  if (value.startsWith('fc') || value.startsWith('fd')) return true; // fc00::/7 unique-local
  if (value.startsWith('ff')) return true; // multicast

  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (value.startsWith('::ffff:')) return true; // hex-mapped form: block conservatively

  return false;
}

function isPrivateAddress(address: string): boolean {
  return net.isIP(address) === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
}

/**
 * Resolve a host and reject anything that points at the local machine, a
 * private network, or a link-local metadata service. Prevents the migration
 * TCP probe from being used as an SSRF primitive.
 */
export async function assertPublicHost(host: string): Promise<void> {
  const trimmed = host.trim().toLowerCase();

  if (
    trimmed === 'localhost' ||
    trimmed.endsWith('.localhost') ||
    trimmed.endsWith('.local') ||
    trimmed.endsWith('.internal')
  ) {
    throw new Error('Host must be a public IP address or hostname');
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(trimmed, { all: true, verbatim: true });
  } catch {
    throw new Error('Host could not be resolved');
  }

  if (addresses.length === 0) {
    throw new Error('Host could not be resolved');
  }

  for (const entry of addresses) {
    if (isPrivateAddress(entry.address)) {
      throw new Error('Host resolves to a private or reserved address');
    }
  }
}

/**
 * Website Migration — server-only utilities (Node.js crypto + net).
 * NEVER import this from client components or pages with 'use client'.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
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

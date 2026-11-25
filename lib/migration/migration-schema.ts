import { z } from 'zod';

export const MIGRATION_TYPE_VALUES = ['cpanel', 'plesk', 'wordpress', 'ftp'] as const;

export const MIGRATION_STATUS_VALUES = [
  'pending',
  'analyzing',
  'ready',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
] as const;

/** Hostname or IP literal; the DNS/SSRF check runs after this validation. */
const HOST_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/;

export const createMigrationSchema = z.object({
  sourceIp: z
    .string()
    .trim()
    .min(1, 'Source host is required')
    .max(253, 'Source host is too long')
    .regex(HOST_PATTERN, 'Source host contains invalid characters'),
  username: z.string().trim().min(1, 'Username is required').max(128),
  password: z.string().min(1, 'Password is required').max(512),
  type: z.enum(MIGRATION_TYPE_VALUES),
  companyId: z.string().min(1).max(64),
  port: z.coerce.number().int().min(1).max(65535).optional(),
});

export const updateMigrationSchema = z.object({
  status: z.enum(MIGRATION_STATUS_VALUES).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const listMigrationsSchema = z.object({
  companyId: z.string().min(1).max(64),
});

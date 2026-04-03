'use server';

import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessEmailType = 'quotation' | 'contract' | 'project_start' | 'custom';
export type BusinessEmailStatus = 'draft' | 'sent';

export interface BusinessEmailRecord {
  id: string;
  companyId: string;
  clientId: string | null;
  type: BusinessEmailType;
  subject: string;
  body: string;
  status: BusinessEmailStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessEmailInput {
  companyId: string;
  clientId?: string | null;
  type: BusinessEmailType;
  subject: string;
  body: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getBusinessEmailById(id: string, companyId: string) {
  try {
    const data = await prisma.businessEmail.findFirst({ where: { id, companyId } });
    if (!data) return { success: false as const, error: 'Not found' };
    return {
      success: true as const,
      data: {
        ...data,
        type: data.type as BusinessEmailType,
        status: data.status as BusinessEmailStatus,
        sentAt: data.sentAt?.toISOString() ?? null,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      },
    };
  } catch (e) {
    return { success: false as const, error: String(e) };
  }
}

export async function getAllBusinessEmails(companyId: string) {
  try {
    const data = await prisma.businessEmail.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true as const,
      data: data.map((e) => ({
        ...e,
        type: e.type as BusinessEmailType,
        status: e.status as BusinessEmailStatus,
        sentAt: e.sentAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    };
  } catch (e) {
    return { success: false as const, error: String(e) };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createBusinessEmail(input: CreateBusinessEmailInput) {
  try {
    const data = await prisma.businessEmail.create({
      data: {
        companyId: input.companyId,
        clientId: input.clientId ?? null,
        type: input.type,
        subject: input.subject,
        body: input.body,
        status: 'draft',
      },
    });
    return {
      success: true as const,
      data: {
        ...data,
        type: data.type as BusinessEmailType,
        status: data.status as BusinessEmailStatus,
        sentAt: data.sentAt?.toISOString() ?? null,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      },
    };
  } catch (e) {
    return { success: false as const, error: String(e) };
  }
}

export async function updateBusinessEmail(
  id: string,
  companyId: string,
  input: Partial<Omit<CreateBusinessEmailInput, 'companyId'>>,
) {
  try {
    const existing = await prisma.businessEmail.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Email not found' };
    const data = await prisma.businessEmail.update({
      where: { id },
      data: {
        ...(input.clientId !== undefined && { clientId: input.clientId }),
        ...(input.type && { type: input.type }),
        ...(input.subject && { subject: input.subject }),
        ...(input.body !== undefined && { body: input.body }),
      },
    });
    return {
      success: true as const,
      data: {
        ...data,
        type: data.type as BusinessEmailType,
        status: data.status as BusinessEmailStatus,
        sentAt: data.sentAt?.toISOString() ?? null,
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      },
    };
  } catch (e) {
    return { success: false as const, error: String(e) };
  }
}

export async function deleteBusinessEmail(id: string, companyId: string) {
  try {
    const existing = await prisma.businessEmail.findFirst({ where: { id, companyId } });
    if (!existing) return { success: false as const, error: 'Email not found' };
    await prisma.businessEmail.delete({ where: { id } });
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: String(e) };
  }
}

// ─── Send ──────────────────────────────────────────────────────────────────────

export async function sendBusinessEmail(id: string, companyId: string, toEmail: string, cc: string[] = []) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT?.trim() || '465');

  if (!host || !user || !pass || !from) {
    return { success: false as const, error: 'SMTP is not configured.' };
  }

  try {
    const email = await prisma.businessEmail.findFirst({ where: { id, companyId } });
    if (!email) return { success: false as const, error: 'Email not found' };

    const company = await prisma.company.findUnique({ where: { id: companyId } });

    // Wrap plain body in a nice HTML email
    const bodyHtml = email.body
      .split('\n')
      .map((line) => `<p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">${line || '&nbsp;'}</p>`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="background:#ffffff;padding:28px 40px;text-align:center;border-bottom:1px solid #e5e7eb;">
        <img src="https://dipencil.com/wp-content/uploads/2023/07/pencil-1-Recovered.png" alt="${company?.name ?? 'diPencil Panel'}" width="140" style="max-width:140px;height:auto;display:block;margin:0 auto;border:0;" />
      </td></tr>
      <tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
      <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Pencil for E-Marketing Ltd &middot; Hosting &amp; Digital System Provider</p>
        <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">${company?.email ?? ''}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
    });

    const validCc = cc.map((e) => e.trim()).filter((e) => e && e !== toEmail);

    await transporter.sendMail({
      from: `"Pencil Studio" <${from}>`,
      to: toEmail,
      ...(validCc.length > 0 && { cc: validCc.join(', ') }),
      subject: email.subject,
      text: email.body,
      html,
    });

    await prisma.businessEmail.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });

    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

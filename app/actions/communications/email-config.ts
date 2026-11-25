'use server';

import { requireSession, requireTenantAccess } from '@/lib/auth/auth-guard';
import { prisma } from '@/lib/db/prisma';
import nodemailer from 'nodemailer';
import net from 'net';
import tls from 'tls';

export interface SmtpTestInput {
  companyId: string;
  testRecipient?: string;
  host?: string;
  port?: number;
  encryption?: string;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
  timeout?: number;
  authEnabled?: boolean;
}

export interface ImapTestInput {
  companyId: string;
  protocol?: string;
  host?: string;
  port?: number;
  encryption?: string;
  user?: string;
  pass?: string;
  mailbox?: string;
}

export async function testOutgoingSmtpAction(input: SmtpTestInput) {
  await requireTenantAccess(input.companyId);

  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });

    const host = input.host?.trim() || company?.smtpHost?.trim() || process.env.SMTP_HOST?.trim();
    const port = Number(input.port ?? company?.smtpPort ?? process.env.SMTP_PORT ?? 465);
    const encryption = input.encryption ?? company?.smtpEncryption ?? 'SSL';
    const user = input.user?.trim() || company?.smtpUser?.trim() || process.env.SMTP_USER?.trim();
    const pass = input.pass?.trim() || company?.smtpPass?.trim() || process.env.SMTP_PASS?.trim();
    const fromName = input.fromName?.trim() || company?.smtpFromName?.trim() || company?.name || 'diPencil Panel';
    const fromEmail = input.fromEmail?.trim() || company?.smtpFromEmail?.trim() || company?.email || process.env.SMTP_FROM?.trim() || user;
    const timeout = Number(input.timeout ?? company?.smtpTimeout ?? 30);
    const authEnabled = input.authEnabled ?? company?.smtpAuthEnabled ?? true;

    if (!host) {
      return { success: false as const, error: 'SMTP Host is required.' };
    }

    const secure = encryption === 'SSL' || port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: authEnabled && user ? { user, pass: pass || '' } : undefined,
      connectionTimeout: timeout * 1000,
      greetingTimeout: timeout * 1000,
      socketTimeout: timeout * 1000,
    });

    // 1. Verify connection
    await transporter.verify();

    // 2. If test recipient is provided, send real test email
    if (input.testRecipient && input.testRecipient.trim()) {
      const recipient = input.testRecipient.trim();
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail || user}>`,
        to: recipient,
        subject: `[Verification] diPencil Panel SMTP Outgoing Test`,
        text: `This is a test email sent from diPencil Panel to verify your outgoing SMTP configuration.\n\nHost: ${host}:${port} (${encryption})\nTimestamp: ${new Date().toISOString()}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #ecfdf5; color: #059669; font-size: 12px; font-weight: 600; border-radius: 9999px;">SMTP Connected</span>
            </div>
            <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px;">Outgoing Mail Verified</h2>
            <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.5;">
              Congratulations! Your SMTP settings in <strong>diPencil Panel</strong> have been tested and verified successfully.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 12px; color: #334155; line-height: 1.6;">
              <div><strong>Host:</strong> ${host}</div>
              <div><strong>Port:</strong> ${port} (${encryption})</div>
              <div><strong>Sender:</strong> ${fromName} &lt;${fromEmail}&gt;</div>
              <div><strong>Recipient:</strong> ${recipient}</div>
            </div>
            <p style="margin: 20px 0 0 0; font-size: 11px; color: #94a3b8;">
              diPencil Panel - System Verification Service
            </p>
          </div>
        `,
      });

      return {
        success: true as const,
        message: `SMTP connection verified and test email sent to ${recipient}.`,
      };
    }

    return {
      success: true as const,
      message: `SMTP connection to ${host}:${port} verified successfully.`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `SMTP Error: ${errorMsg}` };
  }
}

export async function testIncomingMailAction(input: ImapTestInput) {
  await requireTenantAccess(input.companyId);

  try {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });

    const host = input.host?.trim() || company?.imapHost?.trim();
    const port = Number(input.port ?? company?.imapPort ?? 993);
    const protocol = input.protocol || company?.imapProtocol || 'IMAP';
    const encryption = input.encryption ?? company?.imapEncryption ?? 'SSL';

    if (!host) {
      return { success: false as const, error: 'Incoming Host is required.' };
    }

    // Test network connection and TLS handshake
    const isTls = encryption === 'SSL' || port === 993 || port === 995;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection to ${host}:${port} timed out after 10 seconds.`));
      }, 10000);

      if (isTls) {
        const socket = tls.connect(
          {
            host,
            port,
            rejectUnauthorized: false,
            timeout: 8000,
          },
          () => {
            clearTimeout(timer);
            socket.end();
            resolve();
          },
        );
        socket.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
        socket.on('timeout', () => {
          clearTimeout(timer);
          socket.destroy();
          reject(new Error(`TLS connection to ${host}:${port} timed out.`));
        });
      } else {
        const socket = net.createConnection({ host, port, timeout: 8000 }, () => {
          clearTimeout(timer);
          socket.end();
          resolve();
        });
        socket.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
        socket.on('timeout', () => {
          clearTimeout(timer);
          socket.destroy();
          reject(new Error(`Socket connection to ${host}:${port} timed out.`));
        });
      }
    });

    return {
      success: true as const,
      message: `Incoming ${protocol} server (${host}:${port}) connection tested successfully.`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: `Incoming Mail Error: ${errorMsg}` };
  }
}


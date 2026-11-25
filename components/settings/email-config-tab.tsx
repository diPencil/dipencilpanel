'use client';

import React, { useState, useEffect } from 'react';
import type { Company } from '@/lib/core/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Mail,
  Send,
  Inbox,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Server,
} from 'lucide-react';
import { testOutgoingSmtpAction, testIncomingMailAction } from '@/app/actions/communications/email-config';

interface EmailConfigTabProps {
  company: Company;
  onSubmit: (data: Partial<Company>) => Promise<{ success: boolean; error?: string }> | void;
  isLoading?: boolean;
}

export function EmailConfigTab({
  company,
  onSubmit,
  isLoading: parentLoading,
}: EmailConfigTabProps) {
  const [formData, setFormData] = useState({
    smtpFromName: company.smtpFromName || company.name || '',
    smtpFromEmail: company.smtpFromEmail || company.email || '',
    smtpHost: company.smtpHost || '',
    smtpPort: company.smtpPort ?? 465,
    smtpEncryption: company.smtpEncryption || 'SSL',
    smtpUser: company.smtpUser || '',
    smtpPass: company.smtpPass || '',
    smtpTimeout: company.smtpTimeout ?? 30,
    smtpAuthEnabled: company.smtpAuthEnabled ?? true,
    imapProtocol: company.imapProtocol || 'IMAP',
    imapHost: company.imapHost || '',
    imapPort: company.imapPort ?? 993,
    imapEncryption: company.imapEncryption || 'SSL',
    imapUser: company.imapUser || '',
    imapPass: company.imapPass || '',
    imapMailbox: company.imapMailbox || 'INBOX',
  });

  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showImapPass, setShowImapPass] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isTestingImap, setIsTestingImap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      smtpFromName: company.smtpFromName || company.name || '',
      smtpFromEmail: company.smtpFromEmail || company.email || '',
      smtpHost: company.smtpHost || '',
      smtpPort: company.smtpPort ?? 465,
      smtpEncryption: company.smtpEncryption || 'SSL',
      smtpUser: company.smtpUser || '',
      smtpPass: company.smtpPass || '',
      smtpTimeout: company.smtpTimeout ?? 30,
      smtpAuthEnabled: company.smtpAuthEnabled ?? true,
      imapProtocol: company.imapProtocol || 'IMAP',
      imapHost: company.imapHost || '',
      imapPort: company.imapPort ?? 993,
      imapEncryption: company.imapEncryption || 'SSL',
      imapUser: company.imapUser || '',
      imapPass: company.imapPass || '',
      imapMailbox: company.imapMailbox || 'INBOX',
    });
  }, [
    company.id,
    company.name,
    company.email,
    company.smtpFromName,
    company.smtpFromEmail,
    company.smtpHost,
    company.smtpPort,
    company.smtpEncryption,
    company.smtpUser,
    company.smtpPass,
    company.smtpTimeout,
    company.smtpAuthEnabled,
    company.imapProtocol,
    company.imapHost,
    company.imapPort,
    company.imapEncryption,
    company.imapUser,
    company.imapPass,
    company.imapMailbox,
  ]);

  const isOutgoingConfigured = Boolean(formData.smtpHost && formData.smtpUser);
  const isIncomingConfigured = Boolean(formData.imapHost && formData.imapUser);

  const handleTestOutgoing = async () => {
    if (!formData.smtpHost.trim()) {
      toast.error('Please enter an SMTP Host before testing.');
      return;
    }

    setIsTestingSmtp(true);
    try {
      const res = await testOutgoingSmtpAction({
        companyId: company.id,
        testRecipient: testRecipient.trim() || undefined,
        host: formData.smtpHost.trim(),
        port: Number(formData.smtpPort),
        encryption: formData.smtpEncryption,
        user: formData.smtpUser.trim(),
        pass: formData.smtpPass,
        fromName: formData.smtpFromName.trim(),
        fromEmail: formData.smtpFromEmail.trim(),
        timeout: Number(formData.smtpTimeout),
        authEnabled: formData.smtpAuthEnabled,
      });

      if (res.success) {
        toast.success(res.message || 'SMTP connection tested successfully.');
      } else {
        toast.error(res.error || 'Failed to connect to SMTP server.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'SMTP connection test failed.');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleTestIncoming = async () => {
    if (!formData.imapHost.trim()) {
      toast.error('Please enter an Incoming Host before testing.');
      return;
    }

    setIsTestingImap(true);
    try {
      const res = await testIncomingMailAction({
        companyId: company.id,
        protocol: formData.imapProtocol,
        host: formData.imapHost.trim(),
        port: Number(formData.imapPort),
        encryption: formData.imapEncryption,
        user: formData.imapUser.trim(),
        pass: formData.imapPass,
        mailbox: formData.imapMailbox.trim(),
      });

      if (res.success) {
        toast.success(res.message || 'Incoming mail server connection verified.');
      } else {
        toast.error(res.error || 'Failed to connect to incoming mail server.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Incoming mail connection test failed.');
    } finally {
      setIsTestingImap(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        smtpFromName: formData.smtpFromName.trim(),
        smtpFromEmail: formData.smtpFromEmail.trim(),
        smtpHost: formData.smtpHost.trim(),
        smtpPort: Number(formData.smtpPort) || 465,
        smtpEncryption: formData.smtpEncryption,
        smtpUser: formData.smtpUser.trim(),
        smtpPass: formData.smtpPass,
        smtpTimeout: Number(formData.smtpTimeout) || 30,
        smtpAuthEnabled: formData.smtpAuthEnabled,
        imapProtocol: formData.imapProtocol,
        imapHost: formData.imapHost.trim(),
        imapPort: Number(formData.imapPort) || 993,
        imapEncryption: formData.imapEncryption,
        imapUser: formData.imapUser.trim(),
        imapPass: formData.imapPass,
        imapMailbox: formData.imapMailbox.trim() || 'INBOX',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = parentLoading || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Status Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outgoing Status */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Outgoing Email
            </span>
            <Badge
              variant="outline"
              className={
                isOutgoingConfigured
                  ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-[11px]'
                  : 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-[11px]'
              }
            >
              {isOutgoingConfigured ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Configured
                </span>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isOutgoingConfigured
              ? `SMTP active: ${formData.smtpHost}:${formData.smtpPort} (${formData.smtpEncryption})`
              : 'Configure SMTP host and credentials below to enable automated email dispatch.'}
          </p>
        </div>

        {/* Incoming Status */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Incoming Email
            </span>
            <Badge
              variant="outline"
              className={
                isIncomingConfigured
                  ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-[11px]'
                  : 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-[11px]'
              }
            >
              {isIncomingConfigured ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Configured
                </span>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isIncomingConfigured
              ? `${formData.imapProtocol} active: ${formData.imapHost}:${formData.imapPort}`
              : 'Configure incoming mailbox to receive and sync customer replies.'}
          </p>
        </div>
      </div>

      {/* ── Section 1: Sender Identity ── */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Sender Identity
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              From Name
            </label>
            <Input
              type="text"
              value={formData.smtpFromName}
              onChange={(e) => setFormData((prev) => ({ ...prev, smtpFromName: e.target.value }))}
              placeholder="e.g. Legendary Management MEA"
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Display name seen by email recipients.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              From Email
            </label>
            <Input
              type="email"
              value={formData.smtpFromEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, smtpFromEmail: e.target.value }))}
              placeholder="e.g. sales@legendarymea.com"
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Sender email address in email headers.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Outgoing Email - SMTP ── */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Outgoing Email (SMTP)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              SMTP Host
            </label>
            <Input
              type="text"
              value={formData.smtpHost}
              onChange={(e) => setFormData((prev) => ({ ...prev, smtpHost: e.target.value }))}
              placeholder="e.g. smtp.hostinger.com"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              SMTP Port
            </label>
            <Input
              type="number"
              value={formData.smtpPort}
              onChange={(e) => setFormData((prev) => ({ ...prev, smtpPort: parseInt(e.target.value) || 0 }))}
              placeholder="465"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Encryption
            </label>
            <Select
              value={formData.smtpEncryption}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, smtpEncryption: val }))}
              disabled={isBusy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select encryption" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSL">SSL</SelectItem>
                <SelectItem value="TLS">TLS / STARTTLS</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              SMTP Username
            </label>
            <Input
              type="text"
              value={formData.smtpUser}
              onChange={(e) => setFormData((prev) => ({ ...prev, smtpUser: e.target.value }))}
              placeholder="e.g. sales@legendarymea.com"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              SMTP Password
            </label>
            <div className="relative">
              <Input
                type={showSmtpPass ? 'text' : 'password'}
                value={formData.smtpPass}
                onChange={(e) => setFormData((prev) => ({ ...prev, smtpPass: e.target.value }))}
                placeholder={formData.smtpPass ? 'Configured - leave blank to keep existing' : 'Enter SMTP password'}
                disabled={isBusy}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Timeout (Seconds)
            </label>
            <Input
              type="number"
              value={formData.smtpTimeout}
              onChange={(e) => setFormData((prev) => ({ ...prev, smtpTimeout: parseInt(e.target.value) || 30 }))}
              placeholder="30"
              disabled={isBusy}
            />
          </div>
        </div>

        {/* Checkbox Authentication */}
        <div className="flex items-center gap-2 pt-2">
          <input
            id="smtpAuthEnabled"
            type="checkbox"
            checked={formData.smtpAuthEnabled}
            onChange={(e) => setFormData((prev) => ({ ...prev, smtpAuthEnabled: e.target.checked }))}
            disabled={isBusy}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
          />
          <label htmlFor="smtpAuthEnabled" className="text-xs font-medium text-foreground cursor-pointer select-none">
            Authentication enabled
          </label>
        </div>

        {/* Test Outgoing Block */}
        <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3 mt-3">
          <label className="block text-xs font-semibold text-foreground">
            Test Outgoing Dispatch
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Enter recipient email address for test message (e.g. your email)..."
              disabled={isBusy || isTestingSmtp}
              className="flex-1 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestOutgoing}
              disabled={isBusy || isTestingSmtp || !formData.smtpHost}
              className="gap-2 text-xs w-full sm:w-auto shrink-0"
            >
              {isTestingSmtp ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  Test Outgoing Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Incoming Email - IMAP / POP3 ── */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Inbox className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Incoming Email (IMAP / POP3)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Protocol
            </label>
            <Select
              value={formData.imapProtocol}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, imapProtocol: val }))}
              disabled={isBusy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IMAP">IMAP</SelectItem>
                <SelectItem value="POP3">POP3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Incoming Host
            </label>
            <Input
              type="text"
              value={formData.imapHost}
              onChange={(e) => setFormData((prev) => ({ ...prev, imapHost: e.target.value }))}
              placeholder="e.g. imap.hostinger.com"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Incoming Port
            </label>
            <Input
              type="number"
              value={formData.imapPort}
              onChange={(e) => setFormData((prev) => ({ ...prev, imapPort: parseInt(e.target.value) || 0 }))}
              placeholder="993"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Encryption
            </label>
            <Select
              value={formData.imapEncryption}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, imapEncryption: val }))}
              disabled={isBusy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select encryption" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSL">SSL</SelectItem>
                <SelectItem value="TLS">TLS / STARTTLS</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Incoming Username
            </label>
            <Input
              type="text"
              value={formData.imapUser}
              onChange={(e) => setFormData((prev) => ({ ...prev, imapUser: e.target.value }))}
              placeholder="e.g. sales@legendarymea.com"
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Incoming Password
            </label>
            <div className="relative">
              <Input
                type={showImapPass ? 'text' : 'password'}
                value={formData.imapPass}
                onChange={(e) => setFormData((prev) => ({ ...prev, imapPass: e.target.value }))}
                placeholder={formData.imapPass ? 'Configured - leave blank to keep existing' : 'Enter Incoming password'}
                disabled={isBusy}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowImapPass(!showImapPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showImapPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Mailbox / Folder
            </label>
            <Input
              type="text"
              value={formData.imapMailbox}
              onChange={(e) => setFormData((prev) => ({ ...prev, imapMailbox: e.target.value }))}
              placeholder="INBOX"
              disabled={isBusy}
            />
          </div>
        </div>

        {/* Incoming Footer Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Typical ports: IMAP 143/993, POP3 110/995.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestIncoming}
            disabled={isBusy || isTestingImap || !formData.imapHost}
            className="gap-2 text-xs w-full sm:w-auto"
          >
            {isTestingImap ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testing Server...
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                Test Incoming Mail
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Save Action ── */}
      <div className="flex items-center justify-end pt-4 border-t border-border">
        <Button type="submit" disabled={isBusy} className="gap-2">
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </form>
  );
}


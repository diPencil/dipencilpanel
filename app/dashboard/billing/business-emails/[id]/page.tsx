'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  ChevronLeft, Send, Edit, Trash2, CheckCircle, Clock,
  FileText, Handshake, Rocket, MessageSquare, X, Calendar, User,
} from 'lucide-react';
import {
  getBusinessEmailById, sendBusinessEmail, deleteBusinessEmail,
  type BusinessEmailRecord, type BusinessEmailType,
} from '@/app/actions/business-emails';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_TYPES: Record<BusinessEmailType, { label: string; icon: React.ReactNode; color: string }> = {
  quotation:     { label: 'Quotation',     icon: <FileText className="h-4 w-4" />,     color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
  contract:      { label: 'Contract',      icon: <Handshake className="h-4 w-4" />,    color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800' },
  project_start: { label: 'Project Start', icon: <Rocket className="h-4 w-4" />,       color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' },
  custom:        { label: 'Custom Email',  icon: <MessageSquare className="h-4 w-4" />, color: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700' },
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ─── Send Dialog ──────────────────────────────────────────────────────────────

function SendDialog({
  open, onOpenChange, defaultTo, onSend, sending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTo: string;
  onSend: (to: string, cc: string[]) => void;
  sending: boolean;
}) {
  const [sendTo, setSendTo] = useState(defaultTo);
  const [ccInput, setCcInput] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccError, setCcError] = useState('');
  const ccRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setSendTo(defaultTo); setCcEmails([]); setCcInput(''); } }, [open, defaultTo]);

  const addCc = (val: string) => {
    const t = val.trim().toLowerCase();
    if (!t) return;
    if (!isValidEmail(t)) { setCcError('Invalid email'); return; }
    if (t === sendTo.trim().toLowerCase()) { setCcError('Already the primary recipient'); return; }
    if (ccEmails.includes(t)) { setCcError('Already added'); return; }
    setCcError(''); setCcEmails((p) => [...p, t]); setCcInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Send Email</DialogTitle>
          <DialogDescription>Choose recipients and send this email.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</Label>
            <Input type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              CC <span className="normal-case font-normal">(optional)</span>
            </Label>
            <div
              className="min-h-[42px] flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background cursor-text focus-within:ring-2 focus-within:ring-ring transition"
              onClick={() => ccRef.current?.focus()}
            >
              {ccEmails.map((e) => (
                <span key={e} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  {e}
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); setCcEmails((p) => p.filter((x) => x !== e)); }}><X className="h-3 w-3 hover:text-red-500" /></button>
                </span>
              ))}
              <input
                ref={ccRef} type="email" value={ccInput}
                onChange={(e) => { setCcInput(e.target.value); setCcError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCc(ccInput); }
                  else if (e.key === 'Backspace' && !ccInput && ccEmails.length > 0) setCcEmails((p) => p.slice(0, -1));
                }}
                onBlur={() => { if (ccInput.trim()) addCc(ccInput); }}
                placeholder={ccEmails.length === 0 ? 'Type email and press Enter…' : ''}
                className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {ccError && <p className="text-xs text-destructive">{ccError}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={() => onSend(sendTo, ccEmails)} disabled={sending || !sendTo.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : `Send${ccEmails.length > 0 ? ` (+${ccEmails.length} CC)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BusinessEmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company, getClient } = useInvoiceData();

  const [email, setEmail] = useState<BusinessEmailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id || !company.id) return;
    setLoading(true);
    getBusinessEmailById(id, company.id).then((res) => {
      if (res.success && res.data) setEmail(res.data);
      else toast.error('Email not found');
      setLoading(false);
    });
  }, [id, company.id]);

  const handleSend = async (to: string, cc: string[]) => {
    if (!email) return;
    setSending(true);
    const res = await sendBusinessEmail(email.id, company.id, to, cc);
    if (res.success) {
      const ccText = cc.length > 0 ? ` + ${cc.length} CC` : '';
      toast.success(`Email sent to ${to}${ccText}`);
      setEmail((prev) => prev ? { ...prev, status: 'sent', sentAt: new Date().toISOString() } : prev);
      setSendOpen(false);
    } else {
      toast.error(res.error ?? 'Failed to send');
    }
    setSending(false);
  };

  const handleDelete = async () => {
    if (!email) return;
    const res = await deleteBusinessEmail(email.id, company.id);
    if (res.success) {
      toast.success('Email deleted');
      router.push('/dashboard/billing/business-emails');
    } else {
      toast.error(res.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Email not found.</p>
        <Link href="/dashboard/billing/business-emails">
          <Button variant="outline" className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
        </Link>
      </div>
    );
  }

  const client = email.clientId ? getClient(email.clientId) : null;
  const typeInfo = EMAIL_TYPES[email.type];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing/business-emails">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
              <ChevronLeft className="h-4 w-4" /> Back to Business Emails
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/billing/business-emails/${email.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setSendOpen(true)}
          >
            <Send className="h-4 w-4" />
            {email.status === 'sent' ? 'Resend' : 'Send'}
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content — styled like an email/letter */}
      <div className="w-full">
        {/* Meta header card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-4 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{email.subject}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant="outline" className={`gap-1.5 text-xs ${typeInfo.color}`}>
                {typeInfo.icon} {typeInfo.label}
              </Badge>
              {email.status === 'sent' ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-xs">
                  <CheckCircle className="h-3 w-3" /> Sent
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="h-3 w-3" /> Draft
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground shrink-0">
            {client && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{client.name}</span>
                <span className="opacity-60">{client.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {email.status === 'sent' && email.sentAt
                ? `Sent ${new Date(email.sentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                : `Created ${new Date(email.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
            </div>
          </div>
        </div>

        {/* Email body — letter style */}
        <div className="bg-white dark:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Letter header */}
          <div className="px-10 pt-10 pb-4 border-b border-border/40">
            <img
              src="https://dipencil.com/wp-content/uploads/2023/07/pencil-1-Recovered.png"
              alt="Pencil Studio"
              className="h-10 w-auto object-contain mb-6"
            />
            <div className="flex flex-wrap justify-between gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground text-sm">Pencil Studio</p>
                <p>info@dipencil.com</p>
              </div>
              {client && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide mb-1 font-semibold">To</p>
                  <p className="font-semibold text-foreground text-sm">{client.name}</p>
                  {client.email && <p>{client.email}</p>}
                  {client.phone && <p>{client.phone}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Subject line */}
          <div className="px-10 py-5 border-b border-border/40 bg-muted/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Subject</p>
            <p className="text-base font-semibold">{email.subject}</p>
          </div>

          {/* Body */}
          <div className="px-10 py-8">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{email.body}</pre>
          </div>

          {/* Footer */}
          <div className="px-10 py-5 border-t border-border/40 bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">Pencil for E-Marketing Ltd · Hosting &amp; Digital System Provider</p>
            <p className="text-xs text-muted-foreground/60 mt-1">info@dipencil.com</p>
          </div>
        </div>
      </div>

      {/* Send Dialog */}
      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        defaultTo={client?.email ?? ''}
        onSend={handleSend}
        sending={sending}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;<strong>{email.subject}</strong>&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-white border border-slate-200 text-red-600 hover:bg-red-50 shadow-sm"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

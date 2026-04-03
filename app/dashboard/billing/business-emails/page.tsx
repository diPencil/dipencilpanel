'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail, Plus, Search, Send, Eye, Edit, Trash2, MoreHorizontal,
  FileText, Clock, CheckCircle, X,
} from 'lucide-react';
import {
  getAllBusinessEmails,
  deleteBusinessEmail,
  sendBusinessEmail,
  type BusinessEmailRecord,
  type BusinessEmailType,
} from '@/app/actions/business-emails';
import {
  EMAIL_TYPES,
  BusinessEmailEditor,
} from '@/components/business-emails/business-email-editor';

// ─── Compose Dialog ───────────────────────────────────────────────────────────

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: BusinessEmailRecord | null;
  companyId: string;
  onSaved: (email: BusinessEmailRecord) => void;
}

function ComposeDialog({ open, onOpenChange, email, companyId, onSaved }: ComposeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {email ? 'Edit Email' : 'Compose Email'}
          </DialogTitle>
          <DialogDescription>
            {email ? 'Edit your email draft.' : 'Create a new business email or pick a template.'}
          </DialogDescription>
        </DialogHeader>

        <BusinessEmailEditor
          email={email}
          companyId={companyId}
          syncKey={`${open}-${email?.id ?? 'new'}`}
          onSaved={onSaved}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Dialog ───────────────────────────────────────────────────────────

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: BusinessEmailRecord | null;
  clientEmail: string;
  onSent: (id: string) => void;
  companyId: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function PreviewDialog({ open, onOpenChange, email, clientEmail, onSent, companyId }: PreviewDialogProps) {
  const [sendTo, setSendTo] = useState(clientEmail);
  const [ccInput, setCcInput] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccError, setCcError] = useState('');
  const [sending, setSending] = useState(false);
  const ccInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSendTo(clientEmail);
      setCcEmails([]);
      setCcInput('');
      setCcError('');
    }
  }, [open, clientEmail]);

  const addCc = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { setCcError('Invalid email address'); return; }
    if (trimmed === sendTo.trim().toLowerCase()) { setCcError('Already the primary recipient'); return; }
    if (ccEmails.includes(trimmed)) { setCcError('Already added'); return; }
    setCcError('');
    setCcEmails((prev) => [...prev, trimmed]);
    setCcInput('');
  };

  const removeCc = (e: string) => setCcEmails((prev) => prev.filter((x) => x !== e));

  const handleCcKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); addCc(ccInput); }
    else if (ev.key === 'Backspace' && !ccInput && ccEmails.length > 0) setCcEmails((prev) => prev.slice(0, -1));
  };

  const handleSend = async () => {
    if (!email) return;
    if (!sendTo.trim()) { toast.error('Enter a recipient email'); return; }
    setSending(true);
    const res = await sendBusinessEmail(email.id, companyId, sendTo.trim(), ccEmails);
    if (res.success) {
      const ccText = ccEmails.length > 0 ? ` + ${ccEmails.length} CC` : '';
      toast.success(`Email sent to ${sendTo}${ccText}`);
      onSent(email.id);
      onOpenChange(false);
    } else {
      toast.error(res.error ?? 'Failed to send');
    }
    setSending(false);
  };

  if (!email) return null;

  const typeInfo = EMAIL_TYPES.find((t) => t.value === email.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Preview & Send
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`gap-1.5 ${typeInfo?.color}`}>
              {typeInfo?.icon} {typeInfo?.label}
            </Badge>
            <Badge variant={email.status === 'sent' ? 'outline' : 'secondary'} className={email.status === 'sent' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
              {email.status === 'sent' ? <><CheckCircle className="h-3 w-3 mr-1" />Sent</> : <><Clock className="h-3 w-3 mr-1" />Draft</>}
            </Badge>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Subject</p>
            <p className="text-sm font-medium">{email.subject}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Message</p>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">{email.body}</pre>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <Label htmlFor="send-to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</Label>
            <Input id="send-to" type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="recipient@example.com" />
          </div>

          {/* CC */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              CC <span className="normal-case font-normal">(optional)</span>
            </Label>
            <div
              className="min-h-[42px] flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition"
              onClick={() => ccInputRef.current?.focus()}
            >
              {ccEmails.map((e) => (
                <span key={e} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  {e}
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); removeCc(e); }} className="hover:text-red-500 transition-colors ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                ref={ccInputRef}
                type="email"
                value={ccInput}
                onChange={(e) => { setCcInput(e.target.value); setCcError(''); }}
                onKeyDown={handleCcKeyDown}
                onBlur={() => { if (ccInput.trim()) addCc(ccInput); }}
                placeholder={ccEmails.length === 0 ? 'Type email and press Enter…' : ''}
                className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {ccError && <p className="text-xs text-destructive">{ccError}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Close</Button>
          <Button onClick={handleSend} disabled={sending || !sendTo.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : `Send${ccEmails.length > 0 ? ` (+${ccEmails.length} CC)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Send Dialog (Invoice-style) ────────────────────────────────────────

interface QuickSendDialogProps {
  email: BusinessEmailRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: (id: string) => void;
  companyId: string;
}

function QuickSendDialog({ email, open, onOpenChange, onSent, companyId }: QuickSendDialogProps) {
  const { getClient } = useInvoiceData();
  const [sendTo, setSendTo] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccError, setCcError] = useState('');
  const [sending, setSending] = useState(false);
  const ccRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && email) {
      const client = email.clientId ? getClient(email.clientId) : null;
      setSendTo(client?.email ?? '');
      setCcEmails([]);
      setCcInput('');
      setCcError('');
    }
  }, [open, email, getClient]);

  const addCc = (val: string) => {
    const t = val.trim().toLowerCase();
    if (!t) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) { setCcError('Invalid email'); return; }
    if (t === sendTo.trim().toLowerCase()) { setCcError('Already the primary recipient'); return; }
    if (ccEmails.includes(t)) { setCcError('Already added'); return; }
    setCcError(''); setCcEmails((p) => [...p, t]); setCcInput('');
  };

  const handleSend = async () => {
    if (!email || !sendTo.trim()) return;
    setSending(true);
    const res = await sendBusinessEmail(email.id, companyId, sendTo.trim(), ccEmails);
    if (res.success) {
      const ccText = ccEmails.length > 0 ? ` + ${ccEmails.length} CC` : '';
      toast.success(`Email sent to ${sendTo}${ccText}`);
      onSent(email.id);
      onOpenChange(false);
    } else {
      toast.error(res.error ?? 'Failed to send');
    }
    setSending(false);
  };

  const client = email?.clientId ? getClient(email.clientId) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Send Email
          </DialogTitle>
          <DialogDescription>
            Send <strong>{email?.subject}</strong> to the client and optionally add CC recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* TO */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {client?.name && <span className="text-foreground">{client.name} &mdash; </span>}
                <span className="text-muted-foreground">{sendTo || '—'}</span>
              </span>
            </div>
            {!sendTo && (
              <Input type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="recipient@example.com" className="mt-1" />
            )}
          </div>

          {/* CC */}
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
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); setCcEmails((p) => p.filter((x) => x !== e)); }}>
                    <X className="h-3 w-3 hover:text-red-500" />
                  </button>
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
          <Button onClick={handleSend} disabled={sending || !sendTo.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : `Send${ccEmails.length > 0 ? ` (+${ccEmails.length} CC)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BusinessEmailsPage() {
  const { company, clients, getClient } = useInvoiceData();
  const [emails, setEmails] = useState<BusinessEmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | BusinessEmailType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'sent'>('all');

  const [composeOpen, setComposeOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<BusinessEmailRecord | null>(null);
  const [previewEmail, setPreviewEmail] = useState<BusinessEmailRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [quickSendEmail, setQuickSendEmail] = useState<BusinessEmailRecord | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<BusinessEmailRecord | null>(null);

  const load = useCallback(async () => {
    if (!company.id) return;
    setLoading(true);
    const res = await getAllBusinessEmails(company.id);
    if (res.success) setEmails(res.data);
    else toast.error('Failed to load emails');
    setLoading(false);
  }, [company.id]);

  useEffect(() => { void load(); }, [load]);

  const filtered = emails.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const client = e.clientId ? getClient(e.clientId) : null;
      if (!e.subject.toLowerCase().includes(q) && !(client?.name.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const handleSaved = (saved: BusinessEmailRecord) => {
    setEmails((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = saved; return copy; }
      return [saved, ...prev];
    });
    setComposeOpen(false);
    setEditingEmail(null);
  };

  const handleSent = (id: string) => {
    setEmails((prev) =>
      prev.map((e) => e.id === id ? { ...e, status: 'sent', sentAt: new Date().toISOString() } : e),
    );
  };

  const handleDelete = async () => {
    if (!deletingEmail) return;
    const res = await deleteBusinessEmail(deletingEmail.id, company.id);
    if (res.success) {
      setEmails((prev) => prev.filter((e) => e.id !== deletingEmail.id));
      toast.success('Email deleted');
    } else {
      toast.error(res.error);
    }
    setDeletingEmail(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Business Emails
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage quotations, contracts, project kick-offs, and custom client communications
          </p>
        </div>
        <Button
          onClick={() => { setEditingEmail(null); setComposeOpen(true); }}
          className="gap-2 shadow-lg shadow-primary/20 self-start"
        >
          <Plus className="h-4 w-4" /> Compose Email
        </Button>
      </div>

      {/* Type quick-filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EMAIL_TYPES.map((t) => {
          const count = emails.filter((e) => e.type === t.value).length;
          return (
            <Card
              key={t.value}
              onClick={() => setFilterType((prev) => prev === t.value ? 'all' : t.value)}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${filterType === t.value ? 'ring-2 ring-primary' : ''}`}
            >
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border mb-2 ${t.color}`}>
                {t.icon} {t.label}
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by subject or client…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-20 animate-pulse" />Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No emails yet</p>
                    <p className="text-sm mt-1">Compose your first business email using the button above.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((email) => {
                  const client = email.clientId ? getClient(email.clientId) : null;
                  const typeInfo = EMAIL_TYPES.find((t) => t.value === email.type);
                  return (
                    <tr key={email.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{client?.name ?? <span className="text-muted-foreground/60">—</span>}</span>
                          {client?.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={`gap-1.5 text-xs ${typeInfo?.color}`}>
                          {typeInfo?.icon} {typeInfo?.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm truncate max-w-[200px] block">{email.subject}</span>
                      </td>
                      <td className="px-5 py-4">
                        {email.status === 'sent' ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                            <CheckCircle className="h-3 w-3" /> Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" /> Draft
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted-foreground">
                          {new Date(email.status === 'sent' && email.sentAt ? email.sentAt : email.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/billing/business-emails/${email.id}`}>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600 rounded-full"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="gap-2" onClick={() => { setEditingEmail(email); setComposeOpen(true); }}>
                                <Edit className="h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => setQuickSendEmail(email)}>
                                <Send className="h-4 w-4" /> Send
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setDeletingEmail(email)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
            {emails.filter((e) => e.status === 'sent').length} sent · {emails.filter((e) => e.status === 'draft').length} drafts
          </div>
        )}
      </Card>

      {/* Compose/Edit Dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={(v) => { setComposeOpen(v); if (!v) setEditingEmail(null); }}
        email={editingEmail}
        companyId={company.id}
        onSaved={handleSaved}
      />

      {/* Preview/Send Dialog */}
      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        email={previewEmail}
        clientEmail={previewEmail?.clientId ? (getClient(previewEmail.clientId)?.email ?? '') : ''}
        onSent={handleSent}
        companyId={company.id}
      />

      {/* Quick Send Dialog (Invoice-style) */}
      <QuickSendDialog
        email={quickSendEmail}
        open={!!quickSendEmail}
        onOpenChange={(v) => { if (!v) setQuickSendEmail(null); }}
        onSent={(id) => { handleSent(id); setQuickSendEmail(null); }}
        companyId={company.id}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingEmail} onOpenChange={(open) => !open && setDeletingEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;<strong>{deletingEmail?.subject}</strong>&rdquo; will be permanently deleted.
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

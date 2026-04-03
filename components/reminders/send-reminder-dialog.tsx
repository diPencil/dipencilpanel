'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, X, Users, Plus, Mail } from 'lucide-react';
import { useInvoiceData } from '@/context/InvoiceContext';
import type { ReminderItem } from '@/app/actions/reminder-emails';

interface SendReminderDialogProps {
  item: ReminderItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (item: ReminderItem, ccEmails: string[]) => Promise<void>;
  isSending: boolean;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function SendReminderDialog({
  item,
  open,
  onOpenChange,
  onSend,
  isSending,
}: SendReminderDialogProps) {
  const { clients, clientGroups } = useInvoiceData();
  const [ccInput, setCcInput] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const primaryEmail = item?.clientEmail?.trim() ?? '';

  const clientGroupsForClient = useMemo(() => {
    if (!item) return [];
    return clientGroups.filter((g) => g.clientIds.includes(item.clientId));
  }, [item, clientGroups]);

  const suggestedEmails = useMemo(() => {
    if (!item) return [];
    const emails = new Set<string>();
    for (const group of clientGroupsForClient) {
      for (const cid of group.clientIds) {
        if (cid === item.clientId) continue;
        const c = clients.find((cl) => cl.id === cid);
        if (c?.email?.trim() && isValidEmail(c.email.trim())) {
          emails.add(c.email.trim());
        }
      }
    }
    for (const e of ccEmails) emails.delete(e);
    if (primaryEmail) emails.delete(primaryEmail);
    return Array.from(emails);
  }, [item, clientGroupsForClient, clients, ccEmails, primaryEmail]);

  const addEmail = useCallback(
    (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;
      if (!isValidEmail(trimmed)) {
        setInputError('Invalid email address');
        return;
      }
      if (trimmed === primaryEmail.toLowerCase()) {
        setInputError('This is already the primary recipient');
        return;
      }
      if (ccEmails.includes(trimmed)) {
        setInputError('Already added');
        return;
      }
      setInputError('');
      setCcEmails((prev) => [...prev, trimmed]);
      setCcInput('');
    },
    [ccEmails, primaryEmail],
  );

  const removeEmail = useCallback((email: string) => {
    setCcEmails((prev) => prev.filter((e) => e !== email));
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(ccInput);
    } else if (e.key === 'Backspace' && !ccInput && ccEmails.length > 0) {
      setCcEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (!item) return;
    await onSend(item, ccEmails);
    setCcEmails([]);
    setCcInput('');
    setInputError('');
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setCcEmails([]);
      setCcInput('');
      setInputError('');
    }
    onOpenChange(next);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Send Reminder
          </DialogTitle>
          <DialogDescription>
            Send renewal reminder for <strong>{item.serviceName}</strong> to the client and optionally
            add CC recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              To
            </Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                <span className="text-foreground">{item.clientName} &mdash; </span>
                <span className="text-muted-foreground">{primaryEmail || '—'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reminder-cc-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              CC <span className="normal-case font-normal">(optional)</span>
            </Label>
            <div
              className="min-h-[42px] flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition"
              onClick={() => inputRef.current?.focus()}
            >
              {ccEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                >
                  {email}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEmail(email);
                    }}
                    className="hover:text-red-500 transition-colors ml-0.5"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                id="reminder-cc-input"
                type="email"
                value={ccInput}
                onChange={(e) => {
                  setCcInput(e.target.value);
                  setInputError('');
                }}
                onKeyDown={handleInputKeyDown}
                onBlur={() => {
                  if (ccInput.trim()) addEmail(ccInput);
                }}
                placeholder={ccEmails.length === 0 ? 'Type email and press Enter...' : ''}
                className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {inputError && <p className="text-xs text-destructive mt-1">{inputError}</p>}
            {ccInput && isValidEmail(ccInput.trim()) && (
              <button
                type="button"
                onClick={() => addEmail(ccInput)}
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <Plus className="h-3 w-3" /> Add &ldquo;{ccInput.trim()}&rdquo;
              </button>
            )}
          </div>

          {suggestedEmails.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" />
                Suggestions from client group
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedEmails.map((email) => {
                  const c = clients.find(
                    (cl) => cl.email?.trim().toLowerCase() === email.toLowerCase(),
                  );
                  return (
                    <button
                      key={email}
                      type="button"
                      onClick={() => addEmail(email)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-border hover:border-primary hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {c?.name ? `${c.name}` : email}
                      <span className="opacity-60">{c?.name ? ` (${email})` : ''}</span>
                    </button>
                  );
                })}
              </div>
              {clientGroupsForClient.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  From:{' '}
                  {clientGroupsForClient.map((g) => (
                    <Badge key={g.id} variant="outline" className="text-[10px] px-1.5 py-0 mr-1">
                      {g.name}
                    </Badge>
                  ))}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={isSending || !primaryEmail}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending…' : `Send${ccEmails.length > 0 ? ` (+${ccEmails.length} CC)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MoveLeft, Server, Shield, Zap, Loader2, History,
  Database, AlertTriangle, Wifi, WifiOff, RefreshCw, Trash2,
  ChevronDown, ChevronUp, Clock, FileText,
} from "lucide-react";
import Link from 'next/link';
import { toast } from "sonner";
import { useInvoiceData } from '@/context/InvoiceContext';
import type { MigrationStatus } from '@/lib/migration-utils';
import { STATUS_LABELS, STATUS_COLORS, MIGRATION_TYPES, getAllowedTransitions } from '@/lib/migration-utils';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MigrationLog {
  time: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

interface MigrationRecord {
  id: string;
  sourceIp: string;
  port: number;
  username: string;
  type: string;
  status: string;
  logs: string;
  dataSize: number;
  notes: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LOG_LEVEL_COLORS: Record<string, string> = {
  info:    'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error:   'text-red-600 dark:text-red-400',
};

function parseLogs(raw: string): MigrationLog[] {
  try { return JSON.parse(raw) as MigrationLog[]; }
  catch { return []; }
}

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status as MigrationStatus] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${colorClass}`}>
      {STATUS_LABELS[status as MigrationStatus] ?? status}
    </span>
  );
}

// â”€â”€â”€ Sub-component: Migration card with logs + admin actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MigrationCard({
  record,
  onUpdate,
  onDelete,
}: {
  record: MigrationRecord;
  onUpdate: (updated: MigrationRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const logs = parseLogs(record.logs);
  const allowed = getAllowedTransitions(record.status as MigrationStatus);

  const advanceStatus = async (newStatus: MigrationStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/websites/migrate/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: noteInput || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const updated: MigrationRecord = await res.json();
      onUpdate(updated);
      setNoteInput('');
      toast.success(`Migration advanced to "${STATUS_LABELS[newStatus]}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteMigration = async () => {
    if (!confirm('Delete this migration record permanently?')) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/websites/migrate/${record.id}`, { method: 'DELETE' });
      onDelete(record.id);
      toast.success('Migration deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-bold truncate">{record.sourceIp}:{record.port}</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">{MIGRATION_TYPES[record.type]?.label ?? record.type}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={record.status} />
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 p-3 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="space-y-1">
              <p className="text-muted-foreground">Username</p>
              <p className="font-medium">{record.username}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(record.createdAt).toLocaleString()}</p>
            </div>
            {record.errorMessage && (
              <div className="col-span-2 space-y-1">
                <p className="text-muted-foreground">Error</p>
                <p className="text-red-600 dark:text-red-400 font-medium">{record.errorMessage}</p>
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Activity Log
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto text-[11px] font-mono bg-muted/40 rounded-lg p-2">
              {logs.length === 0 ? (
                <p className="text-muted-foreground italic">No logs yet.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.time).toLocaleTimeString()}
                    </span>
                    <span className={LOG_LEVEL_COLORS[log.level] ?? ''}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Admin Actions */}
          {allowed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
                <Clock className="h-3 w-3" /> Admin Actions
              </p>
              <Textarea
                placeholder="Optional note (will be added to log)..."
                className="text-xs rounded-lg min-h-0 h-14 resize-none"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {allowed.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'cancelled' || s === 'failed' ? 'destructive' : 'outline'}
                    className="h-7 text-xs rounded-lg"
                    disabled={isUpdating}
                    onClick={() => advanceStatus(s)}
                  >
                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
              onClick={deleteMigration}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? 'Deletingâ€¦' : 'Delete record'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function WebsiteMigratePage() {
  const { currentCompany } = useInvoiceData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkResult, setCheckResult] = useState<{ reachable: boolean; port: number; message: string } | null>(null);
  const [history, setHistory] = useState<MigrationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    sourceIp: '',
    port: '',
    username: '',
    password: '',
    type: 'cpanel',
  });

  // Derive default port from selected type
  const defaultPort = MIGRATION_TYPES[formData.type]?.port ?? 22;
  const effectivePort = formData.port ? Number(formData.port) : defaultPort;

  const loadHistory = useCallback(async () => {
    if (!currentCompany?.id) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/websites/migrate?companyId=${currentCompany.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch {
      // silent
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id) return;

    setIsSubmitting(true);
    setCheckResult(null);
    toast.info(`Connecting to ${formData.sourceIp}:${effectivePort}â€¦`);

    try {
      const res = await fetch('/api/websites/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          port: effectivePort,
          companyId: currentCompany.id,
        }),
      });

      const result = await res.json();

      setCheckResult({
        reachable: result.reachable ?? false,
        port: result.port ?? effectivePort,
        message: result.message ?? result.error ?? 'Unknown error',
      });

      if (result.reachable) {
        toast.success('Server reachable â€” migration request created!');
        setFormData({ sourceIp: '', port: '', username: '', password: '', type: 'cpanel' });
        loadHistory();
      } else {
        toast.error(result.message ?? 'Server unreachable');
        if (result.id) loadHistory(); // failed record was still saved
      }
    } catch {
      toast.error('Network error â€” please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/websites">
          <Button variant="ghost" size="icon" className="rounded-full border border-border/50">
            <MoveLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Migration</h1>
          <p className="text-muted-foreground">Transfer a website from any provider. We verify connectivity in real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* â”€â”€ Left: Form + feature cards â”€â”€ */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border/50 overflow-hidden">
            <div className="h-1 bg-primary/20 w-full" />
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Source Server Details
              </CardTitle>
              <CardDescription>
                Enter the credentials of the server to migrate from. We'll run a live TCP check before saving.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Migration Type */}
                  <div className="space-y-2">
                    <Label>Migration Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={val => setFormData({ ...formData, type: val, port: '' })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MIGRATION_TYPES).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">{MIGRATION_TYPES[formData.type]?.description}</p>
                  </div>

                  {/* Source IP */}
                  <div className="space-y-2">
                    <Label htmlFor="source_ip">Server IP or Hostname</Label>
                    <Input
                      id="source_ip"
                      placeholder="1.2.3.4 or example.com"
                      required
                      className="rounded-xl"
                      value={formData.sourceIp}
                      onChange={e => setFormData({ ...formData, sourceIp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="root"
                      required
                      className="rounded-xl"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password / SSH Key</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      required
                      className="rounded-xl"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  {/* Port */}
                  <div className="space-y-2">
                    <Label htmlFor="port">Port <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      id="port"
                      type="number"
                      min="1"
                      max="65535"
                      placeholder={String(defaultPort)}
                      className="rounded-xl"
                      value={formData.port}
                      onChange={e => setFormData({ ...formData, port: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">Default: {defaultPort}</p>
                  </div>
                </div>

                {/* Connection result banner */}
                {checkResult && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${
                    checkResult.reachable
                      ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
                  }`}>
                    {checkResult.reachable
                      ? <Wifi className="h-5 w-5 shrink-0 mt-0.5" />
                      : <WifiOff className="h-5 w-5 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className="font-semibold">{checkResult.reachable ? 'Server reachable' : 'Server unreachable'}</p>
                      <p className="text-xs mt-0.5 opacity-90">{checkResult.message}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <Button type="submit" className="px-10 rounded-xl shadow-lg shadow-primary/20" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking connectivityâ€¦
                      </>
                    ) : (
                      'Verify & Start Migration'
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold hidden sm:block">
                    Live TCP check
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col items-center text-center group hover:border-primary/50 transition-colors">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <h4 className="font-bold text-sm">Encrypted Credentials</h4>
              <p className="text-[11px] text-muted-foreground mt-1">Passwords are AES-256 encrypted before storage.</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col items-center text-center group hover:border-yellow-500/50 transition-colors">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <h4 className="font-bold text-sm">Live Connectivity Check</h4>
              <p className="text-[11px] text-muted-foreground mt-1">Real TCP check before any data is saved.</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col items-center text-center group hover:border-green-500/50 transition-colors">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Database className="h-5 w-5 text-green-500" />
              </div>
              <h4 className="font-bold text-sm">Full Admin Workflow</h4>
              <p className="text-[11px] text-muted-foreground mt-1">Track every migration through its lifecycle.</p>
            </div>
          </div>
        </div>

        {/* â”€â”€ Right: History panel â”€â”€ */}
        <div className="space-y-6">
          <Card className="border-none shadow-md ring-1 ring-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Migration History
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={loadHistory}
                  disabled={isLoadingHistory}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic text-center py-8 bg-muted/30 rounded-xl border border-dashed">
                    {isLoadingHistory ? 'Loadingâ€¦' : 'No migrations yet.'}
                  </div>
                ) : (
                  history.map(record => (
                    <MigrationCard
                      key={record.id}
                      record={record}
                      onUpdate={updated =>
                        setHistory(prev => prev.map(r => r.id === updated.id ? updated : r))
                      }
                      onDelete={id =>
                        setHistory(prev => prev.filter(r => r.id !== id))
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status legend */}
          <Card className="border-none shadow-md ring-1 ring-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                Status Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between text-[11px]">
                    <StatusBadge status={key} />
                    <span className="text-muted-foreground text-right max-w-[130px]">
                      {key === 'pending' && 'Request received'}
                      {key === 'analyzing' && 'Server reachable, reviewing'}
                      {key === 'ready' && 'Ready for transfer'}
                      {key === 'in_progress' && 'Transfer underway'}
                      {key === 'completed' && 'Migration complete'}
                      {key === 'failed' && 'Connection or transfer error'}
                      {key === 'cancelled' && 'Cancelled by admin'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


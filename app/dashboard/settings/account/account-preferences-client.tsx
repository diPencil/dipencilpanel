'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, updateAccountAction } from '@/app/actions/auth';
import type { AccountActivityData } from '@/lib/account-activity-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  User,
  Mail,
  KeyRound,
  AtSign,
  ShieldCheck,
  Loader2,
  Save,
  Camera,
  LogIn,
  LogOut,
  Timer,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, formatTime } from '@/lib/formatting';

function formatDateTimeLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    return `${formatDate(iso)} · ${formatTime(iso)}`;
  } catch {
    return '—';
  }
}

function formatSessionDuration(startIso: string | null, nowMs: number): string {
  if (!startIso) return '—';
  try {
    const start = new Date(startIso).getTime();
    const ms = Math.max(0, nowMs - start);
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  } catch {
    return '—';
  }
}

export default function AccountPreferencesClient({
  activity,
}: {
  activity: AccountActivityData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { refreshUser } = useUser();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savedAvatar, setSavedAvatar] = useState('');
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const displayAvatar = avatarDraft !== null ? avatarDraft : savedAvatar;

  useEffect(() => {
    getCurrentUser().then((session) => {
      if (session) {
        setName(session.name);
        setUsername(session.username);
        setEmail(session.email);
        setSavedAvatar(session.avatar || '');
        setAvatarDraft(null);
      }
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSaveProfile = () => {
    startTransition(async () => {
      const result = await updateAccountAction({
        name,
        username,
        email,
        ...(avatarDraft !== null ? { avatar: avatarDraft } : {}),
      });
      if (result.success) {
        if (avatarDraft !== null) {
          setSavedAvatar(avatarDraft);
          setAvatarDraft(null);
        }
        await refreshUser();
        router.refresh();
        toast.success('Changes saved successfully!');
      } else {
        toast.error(result.error ?? 'Failed to update.');
      }
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword) return toast.error('Please enter your current password.');
    if (!newPassword) return toast.error('Please enter a new password.');
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');

    startTransition(async () => {
      const result = await updateAccountAction({ currentPassword, newPassword });
      if (result.success) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error ?? 'Failed to change password.');
      }
    });
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Image is too large. Max 2MB.');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDraft(reader.result as string);
      toast.message('Photo selected', { description: 'Click Save changes below to apply.' });
    };
    reader.readAsDataURL(file);
  };

  const nameInitials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Preferences</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage your admin profile, identity and security.</p>
        </div>
      </div>

      <Card className="relative overflow-hidden border-border/60 bg-linear-to-br from-card via-card to-muted/30 shadow-sm ring-1 ring-border/40 p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/6 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
          <div className="flex flex-col items-center shrink-0 mx-auto lg:mx-0 w-full max-w-34 lg:w-auto lg:self-start">
            <div className="relative group/avatar rounded-full ring-2 ring-border/50 shadow-md">
              <Avatar className="w-28 h-28 border-2 border-background transition-transform duration-300 group-hover/avatar:scale-[1.02]">
                <AvatarImage src={displayAvatar || undefined} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                  {nameInitials || 'A'}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
              >
                <Camera className="size-3.5" />
              </Label>
              <input
                id="avatar-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarFile}
                disabled={isPending}
              />
            </div>
            {!!displayAvatar && (
              <button
                type="button"
                className="mt-1.5 text-[10px] leading-none text-red-500 hover:text-red-600 hover:underline disabled:opacity-50"
                disabled={isPending}
                onClick={() => {
                  setAvatarDraft('');
                  toast.message('Photo removed', { description: 'Click Save changes to apply.' });
                }}
              >
                Remove photo
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2.5 text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
                {name || 'Admin User'}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <AtSign className="size-3.5 shrink-0 opacity-70" />
                  {username || 'admin'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Mail className="size-3.5 shrink-0 opacity-70" />
                  {email || 'admin@example.com'}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 sm:px-3">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground sm:gap-x-4 sm:text-xs lg:justify-start">
                <div className="inline-flex items-center gap-1">
                  <LogIn className="size-3 shrink-0 text-primary/60" />
                  <span className="font-medium text-foreground/75">Last opened:</span>
                  <span className="tabular-nums">{formatDateTimeLabel(activity?.lastLogin ?? null)}</span>
                </div>
                <span className="hidden h-3 w-px bg-border/70 sm:inline" aria-hidden />
                <div className="inline-flex items-center gap-1">
                  <LogOut className="size-3 shrink-0 text-primary/60" />
                  <span className="font-medium text-foreground/75">Last closed:</span>
                  <span className="tabular-nums">{formatDateTimeLabel(activity?.lastLogoutAt ?? null)}</span>
                </div>
                <span className="hidden h-3 w-px bg-border/70 sm:inline" aria-hidden />
                <div className="inline-flex items-center gap-1">
                  <Timer className="size-3 shrink-0 text-primary/60" />
                  <span className="font-medium text-foreground/75">This session:</span>
                  <span className="tabular-nums" suppressHydrationWarning>
                    {formatSessionDuration(activity?.sessionStartedAt ?? null, nowTick)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:shrink-0 lg:justify-end lg:pb-0.5">
            <Button
              onClick={handleSaveProfile}
              disabled={isPending}
              size="default"
              className="gap-2 font-semibold shadow-md shadow-primary/15"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="p-6 space-y-5 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Profile Information</h2>
              <p className="text-xs text-muted-foreground">Update your name, username and email</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Display Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="diPencil Panel"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
                Username
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dipencil"
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="noreply@dipencil.com"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-auto">
            <Button onClick={handleSaveProfile} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-5 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Change Password</h2>
              <p className="text-xs text-muted-foreground">Keep your account secure with a strong password</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                Current Password
              </Label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isPending}
                autoComplete="current-password"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="show-pass"
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="accent-primary cursor-pointer"
              />
              <label htmlFor="show-pass" className="text-sm text-muted-foreground cursor-pointer select-none">
                Show passwords
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-auto">
            <Button
              onClick={handleChangePassword}
              disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
              variant="outline"
              className="gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Update Password
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

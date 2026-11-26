'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { forceChangePasswordAction, logoutAction } from '@/app/actions/auth/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

interface ChangePasswordFormProps {
  username: string;
}

export default function ChangePasswordForm({ username }: ChangePasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, startSignOut] = useTransition();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await forceChangePasswordAction({ newPassword, confirmPassword });
      if (result.success) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }
      setError(result.error ?? 'Could not change the password. Please try again.');
    });
  };

  const handleSignOut = () => {
    startSignOut(async () => {
      await logoutAction();
    });
  };

  const busy = isPending || isSigningOut;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium text-foreground">{username}</span>. This
            account still uses a bootstrap password, so a new one is required before the panel
            unlocks.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  aria-invalid={error ? true : undefined}
                  aria-describedby="new-password-hint"
                  disabled={busy}
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p id="new-password-hint" className="text-xs text-muted-foreground">
                At least 8 characters, and different from the current password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={mismatch ? true : undefined}
                aria-describedby={mismatch ? 'confirm-password-error' : undefined}
                disabled={busy}
              />
              {mismatch && (
                <p id="confirm-password-error" className="text-xs text-destructive">
                  The passwords do not match.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={busy || !newPassword || !confirmPassword || mismatch}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save new password'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button type="button" variant="ghost" size="sm" onClick={handleSignOut} disabled={busy}>
              {isSigningOut ? 'Signing out...' : 'Sign out instead'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

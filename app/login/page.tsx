'use client';

import React, { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await loginAction(identifier, password, remember);
      if (result.success) {
        const from = searchParams.get('from') || '/dashboard';
        router.replace(from);
      } else {
        setError(result.error ?? 'Login failed.');
      }
    });
  };

  return (
    <>
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-500 rounded-2xl px-4 py-3 mb-5 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Username / Email */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <User className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Username or email"
            required
            autoComplete="username"
            disabled={isPending}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition-all disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            disabled={isPending}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pl-11 pr-12 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2 pt-1 pl-1">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={isPending}
            className="w-4 h-4 rounded border-slate-300 accent-slate-800 cursor-pointer"
          />
          <label htmlFor="remember" className="text-sm text-slate-500 cursor-pointer select-none">
            Remember me
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !identifier || !password}
          className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white font-semibold rounded-2xl py-3 px-4 text-sm transition-all mt-1 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            'Get Started'
          )}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-100 via-white to-white p-4">

      {/* Subtle background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-slate-200/60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-slate-200/60" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/60 px-8 py-10">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm p-1.5">
            <Image src="/favicon.png" alt="diPencil" width={44} height={44} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-7">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Sign in to diPencil Panel</h1>
          <p className="text-sm text-slate-400 mt-1.5">Enter your credentials to access the dashboard.</p>
        </div>

        <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-400 mt-8">
          diPencil Panel · Hosting & System Provider
        </p>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchJson, toUserMessage } from '@/app/lib/fetchJson';
import Icon from './Icon';

interface Props {
  mode: 'login' | 'signup';
  /** Where to go after success. Already validated server-side. */
  next: string;
  googleEnabled: boolean;
  /** `?error=` from a failed Google round-trip, if any. */
  initialError?: string;
}

const GOOGLE_ERRORS: Record<string, string> = {
  google: 'Google sign-in did not complete. Try again, or use your email and password.',
  google_unavailable: 'Google sign-in is not set up on this server yet. Use your email and password.',
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l8 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-8-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l8-6.2z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.8 2.3-6.2 0-11.5-4.1-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function AuthForm({ mode, next, googleEnabled, initialError }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ? GOOGLE_ERRORS[initialError] ?? '' : '');

  const isSignup = mode === 'signup';
  const other = isSignup ? 'login' : 'signup';
  const nextQuery = next !== '/interview' ? `?next=${encodeURIComponent(next)}` : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fetchJson(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      // refresh() re-runs Server Components (header, gated pages) with the new cookie.
      router.refresh();
      router.push(next);
    } catch (err) {
      setError(toUserMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel mx-auto w-full max-w-md rounded-[2rem] p-8 md:p-10">
      <div className="mb-8 text-center">
        <span className="badge mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed" />
          {isSignup ? 'Create account' : 'Welcome back'}
        </span>
        <h1 className="font-display text-headline-md text-on-surface md:text-headline-lg">
          {isSignup ? 'Start practising for free' : 'Sign in to continue'}
        </h1>
        <p className="mt-3 text-body-md text-on-surface-variant">
          {isSignup
            ? 'Five free interviews on us — no credit card required.'
            : 'Your transcripts, reports and remaining free interviews are waiting.'}
        </p>
      </div>

      {googleEnabled && (
        <>
          <a
            href={`/api/auth/google${nextQuery}`}
            className="btn-ghost flex w-full items-center justify-center gap-3 px-6 py-3 font-display text-label-md"
          >
            <GoogleMark />
            Continue with Google
          </a>
          <div className="my-6 flex items-center gap-4 text-label-sm text-on-surface-variant">
            <span className="h-px flex-1 bg-white/10" />
            or with email
            <span className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        {isSignup && (
          <label className="block">
            <span className="mb-1.5 block font-display text-label-sm text-on-surface-variant">Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className="field w-full px-4 py-3 text-body-md"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block font-display text-label-sm text-on-surface-variant">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field w-full px-4 py-3 text-body-md"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-display text-label-sm text-on-surface-variant">Password</span>
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
            className="field w-full px-4 py-3 text-body-md"
          />
        </label>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-error/30 bg-error-container/30 px-4 py-3 text-body-sm text-error"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="btn-accent flex w-full items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
        >
          {busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
          {!busy && <Icon name="arrow-right" className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        {isSignup ? 'Already have an account? ' : 'New here? '}
        <Link href={`/${other}${nextQuery}`} className="text-primary-fixed hover:underline">
          {isSignup ? 'Sign in' : 'Create a free account'}
        </Link>
      </p>
    </div>
  );
}

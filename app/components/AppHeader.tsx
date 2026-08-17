'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublicUser, Usage } from '@/app/lib/auth';
import Icon from './Icon';

/** Free-trial state, or the Pro badge. */
export function TrialPill({ usage }: { usage: Usage }) {
  if (usage.remaining === null) {
    return (
      <span className="badge">
        <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed" />
        Pro · unlimited interviews
      </span>
    );
  }
  const low = usage.remaining <= 1;
  return (
    <span className={`badge ${low ? 'border-error/40 text-error' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${low ? 'bg-error' : 'bg-primary-fixed'}`} />
      {usage.remaining} of {usage.limit} free interview{usage.limit === 1 ? '' : 's'} left
    </span>
  );
}

const NAV: { key: 'interview' | 'history'; href: string; label: string }[] = [
  { key: 'interview', href: '/interview', label: 'Interview' },
  { key: 'history', href: '/history', label: 'History' },
];

interface Props {
  user: PublicUser;
  usage?: Usage | null;
  /** Which signed-in section is on screen; its link is highlighted. */
  current?: 'interview' | 'history';
}

/** Header for the signed-in app pages (interview setup, history). */
export default function AppHeader({ user, usage, current }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.refresh();
      router.push('/');
    }
  };

  const linkClass = (active: boolean) =>
    `whitespace-nowrap rounded-md px-2 py-2 font-display text-label-md transition-colors hover:bg-white/5 hover:text-on-surface sm:px-3 ${
      active ? 'text-on-surface' : 'text-on-surface-variant'
    }`;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-white/10 bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-5 md:px-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center">
            <span className="whitespace-nowrap font-display text-label-md font-bold tracking-tight text-primary-fixed sm:text-headline-md">
              AI Interviewer
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="App">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={current === n.key ? 'page' : undefined}
                className={linkClass(current === n.key)}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          {usage && (
            <span className="hidden sm:inline">
              <TrialPill usage={usage} />
            </span>
          )}
          <span
            className="hidden max-w-[12rem] truncate font-display text-label-md text-on-surface-variant md:inline"
            title={user.email}
          >
            {user.name || user.email}
          </span>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="whitespace-nowrap rounded-md px-2 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface disabled:opacity-60 sm:px-3"
          >
            Sign out
          </button>
          <Link
            href="/"
            className="hidden items-center gap-2 rounded-md px-3 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface sm:flex"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </header>
  );
}

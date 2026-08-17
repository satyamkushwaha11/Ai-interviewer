'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCurrentUser } from '@/app/lib/useCurrentUser';
import Icon from './Icon';

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/interview', label: 'Interview' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useCurrentUser();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.refresh();
    if (pathname === '/interview' || pathname.startsWith('/history')) router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-surface/70 shadow-sm backdrop-blur-xl">
      <div className="relative mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 md:px-16">
        {/* Brand */}
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <span className="font-display text-headline-md font-bold tracking-tight text-primary-fixed">
            AI Interviewer
          </span>
        </Link>

        {/* Centred nav */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-2 font-display text-label-md transition-colors hover:bg-white/5 hover:text-on-surface ${
                pathname === n.href ? 'text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Actions — keep the slot width stable while /api/auth/me resolves */}
        <div className="hidden items-center gap-4 md:flex" aria-busy={loading}>
          {user ? (
            <>
              <span
                className="max-w-[12rem] truncate font-display text-label-md text-on-surface-variant"
                title={user.email}
              >
                {user.name || user.email}
              </span>
              <Link
                href="/history"
                className="rounded-md px-3 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
              >
                History
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md px-3 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
              >
                Sign out
              </button>
              <Link
                href="/interview"
                className="rounded-lg bg-primary-fixed px-4 py-2 font-display text-label-md font-medium text-on-primary-fixed transition-all hover:brightness-110"
              >
                Start interview
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-md px-3 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface ${loading ? 'invisible' : ''}`}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary-fixed px-4 py-2 font-display text-label-md font-medium text-on-primary-fixed transition-all hover:brightness-110"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="-mr-2 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary-fixed md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/10 bg-surface-container/95 px-5 py-4 backdrop-blur-xl md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block py-1 font-display text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <div className="truncate pt-1 font-display text-label-sm text-on-surface-variant" title={user.email}>
                {user.name || user.email}
              </div>
              <Link
                href="/history"
                className="block py-1 font-display text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
                onClick={() => setOpen(false)}
              >
                History
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="block py-1 font-display text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
              >
                Sign out
              </button>
              <Link
                href="/interview"
                className="mt-2 block w-full rounded-lg bg-primary-fixed px-4 py-2.5 text-center font-display text-label-md font-medium text-on-primary-fixed"
                onClick={() => setOpen(false)}
              >
                Start interview
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block py-1 font-display text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="mt-2 block w-full rounded-lg bg-primary-fixed px-4 py-2.5 text-center font-display text-label-md font-medium text-on-primary-fixed"
                onClick={() => setOpen(false)}
              >
                Start free
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

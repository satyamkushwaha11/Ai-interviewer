'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
            AI
          </div>
          <span className="font-semibold tracking-tight text-zinc-100">Interviewly</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link ${pathname === n.href ? 'text-zinc-100' : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/interview" className="nav-link">
            Sign in
          </Link>
          <Link href="/interview" className="btn-primary px-4 py-2 text-sm font-semibold">
            Start free
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden p-2 -mr-2 text-zinc-300 hover:text-white"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'}
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-800/60 bg-zinc-950/95 px-6 py-4 space-y-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block nav-link py-1"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/interview"
            className="btn-primary w-full block text-center px-4 py-2.5 text-sm font-semibold mt-2"
            onClick={() => setOpen(false)}
          >
            Start free
          </Link>
        </div>
      )}
    </header>
  );
}

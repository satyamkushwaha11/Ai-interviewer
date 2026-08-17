'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Icon from './components/Icon';

/**
 * Route-segment error boundary: catches runtime errors thrown while rendering
 * any page, so a crash shows this instead of a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <div className="glass-panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 sm:p-10">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-error/30 bg-error/10">
            <Icon name="close" className="h-6 w-6 text-error" />
          </div>

          <h1 className="font-display text-headline-md text-on-surface">Something broke</h1>

          <p className="max-w-md text-body-md leading-relaxed text-on-surface-variant">
            An unexpected error stopped this page from rendering. Your interview data is not lost —
            try again, or head back and start a new session.
          </p>

          {error.message && (
            <p className="w-full break-words rounded-xl border border-white/5 bg-surface-container-low px-4 py-3 text-left font-mono text-label-sm text-on-surface-variant/80">
              {error.message}
              {error.digest && <span className="block opacity-60">digest: {error.digest}</span>}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="btn-accent flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
            >
              <Icon name="replay" className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/"
              className="btn-ghost flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

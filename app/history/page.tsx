import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import AppHeader from '@/app/components/AppHeader';
import Icon from '@/app/components/Icon';
import LocalTime from '@/app/components/LocalTime';
import { getCurrentUser, getUsage, publicUser } from '@/app/lib/auth';
import { listSessions, type SessionListItem } from '@/app/lib/db';

export const metadata: Metadata = { title: 'History — AI Interviewer' };

const PAGE_SIZE = 50;

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** What the row's right-hand side says about the session's outcome. */
function outcome(s: SessionListItem): { label: string; tone: 'score' | 'muted' | 'warn'; score?: number } {
  if (s.status === 'completed' && s.overall_score !== null) {
    return { label: 'Graded', tone: 'score', score: Number(s.overall_score) };
  }
  if (s.answered) return { label: 'Not graded yet', tone: 'warn' };
  return { label: 'Not started', tone: 'muted' };
}

function scoreColor(n: number) {
  if (n >= 8) return 'text-primary-fixed';
  if (n >= 6) return 'text-primary-fixed-dim';
  return 'text-error';
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-container-low" />
      ))}
    </div>
  );
}

/** The list itself, streamed in under Suspense so the page shell (and any redirect) is not held up by the query. */
async function SessionList({ userId }: { userId: string }) {
  const sessions = await listSessions(userId, PAGE_SIZE);
  return (
    <>
      {sessions.length === 0 ? (
        <div className="glass-panel mx-auto max-w-lg rounded-[2rem] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-fixed/30 bg-primary-fixed/10">
            <Icon name="mic" className="h-6 w-6 text-primary-fixed" />
          </div>
          <h2 className="font-display text-headline-md text-on-surface">No interviews yet</h2>
          <p className="mx-auto mt-3 max-w-md text-body-md leading-relaxed text-on-surface-variant">
            Your transcripts and reports will show up here after your first session.
          </p>
          <Link
            href="/interview"
            className="btn-accent mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
          >
            Start your first interview
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const o = outcome(s);
            const title = s.role || s.role_family || 'General interview';
            return (
              <li key={s.id}>
                <Link
                  href={`/history/${s.id}`}
                  className="glass-card flex items-center gap-4 p-5 transition-colors hover:border-primary-fixed/40 hover:bg-surface-container"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="truncate font-display text-label-md font-semibold text-on-surface">
                        {title}
                      </h2>
                      {s.role && s.role_family && s.role_family !== s.role && (
                        <span className="font-display text-label-sm text-primary-fixed/80">{s.role_family}</span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-2 font-display text-label-sm text-on-surface-variant">
                      <LocalTime iso={s.created_at} />
                      <span aria-hidden="true">·</span>
                      <span>{capitalize(s.mode)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{capitalize(s.difficulty)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{s.duration_min} min</span>
                      {s.turns > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {s.turns} message{s.turns === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    {o.tone === 'score' && o.score !== undefined ? (
                      <span className={`font-display text-headline-md ${scoreColor(o.score)}`}>
                        {o.score}
                        <span className="text-label-sm text-on-surface-variant/60">/10</span>
                      </span>
                    ) : (
                      <span
                        className={`badge ${
                          o.tone === 'warn' ? 'border-primary-fixed/30 text-primary-fixed' : 'opacity-70'
                        }`}
                      >
                        {o.label}
                      </span>
                    )}
                    <Icon name="arrow-right" className="h-4 w-4 text-on-surface-variant" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {sessions.length >= PAGE_SIZE && (
        <p className="mt-6 text-center font-display text-label-sm text-on-surface-variant/60">
          Showing your {PAGE_SIZE} most recent interviews.
        </p>
      )}
    </>
  );
}

/**
 * Past interviews for the signed-in user. The auth gate runs first so a
 * signed-out visitor gets a real 307; the list streams in behind it.
 */
export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/history');
  const usage = await getUsage(user);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={publicUser(user)} usage={usage} current="history" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="badge mb-4">
              <Icon name="chart" className="h-4 w-4" />
              Your history
            </span>
            <h1 className="font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
              Past interviews
            </h1>
            <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
              Every session you have started, with its transcript and graded report.
            </p>
          </div>
          <Link
            href="/interview"
            className="btn-accent flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
          >
            New interview
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </div>

        <Suspense fallback={<ListSkeleton />}>
          <SessionList userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}

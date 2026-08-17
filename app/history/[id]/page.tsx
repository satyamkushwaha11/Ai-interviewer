import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AppHeader from '@/app/components/AppHeader';
import Icon from '@/app/components/Icon';
import LocalTime from '@/app/components/LocalTime';
import Report from '@/app/components/Report';
import Transcript from '@/app/components/Transcript';
import { getCurrentUser, getUsage, publicUser } from '@/app/lib/auth';
import { getSession, isUuid } from '@/app/lib/db';
import GradeNow from './GradeNow';

export const metadata: Metadata = { title: 'Interview report — AI Interviewer' };

function capitalize(s: string | null | undefined) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

/**
 * One past interview: report (if graded) and transcript. Ownership is enforced
 * in the query — another user's id is simply not found.
 */
export default async function HistoryDetailPage({ params }: PageProps<'/history/[id]'>) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/history/${id}`)}`);
  if (!isUuid(id)) notFound();

  const [usage, session] = await Promise.all([getUsage(user), getSession(user.id, id)]);
  if (!session) notFound();

  const transcript = Array.isArray(session.transcript) ? session.transcript : [];
  const answered = transcript.some((m) => m.role === 'candidate');
  const title = session.role || session.role_family || 'General interview';
  const facts = [
    // The title already falls back to the role family when there is no target role.
    session.role && session.role_family && session.role_family !== session.role ? session.role_family : null,
    capitalize(session.mode),
    `${capitalize(session.difficulty)} rigor`,
    session.focus ? `${capitalize(session.focus)} focus` : null,
    `${session.duration_min} min`,
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={publicUser(user)} usage={usage} current="history" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-6">
        <Link
          href="/history"
          className="mb-6 inline-flex items-center gap-2 font-display text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          All interviews
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">{title}</h1>
          <p className="mt-2 flex flex-wrap gap-x-2 font-display text-label-md text-on-surface-variant">
            <LocalTime iso={session.created_at} />
            {facts.map((f) => (
              <span key={f} className="flex gap-2">
                <span aria-hidden="true">·</span>
                {f}
              </span>
            ))}
          </p>
        </div>

        <div className="space-y-10">
          {session.report ? (
            <Report report={session.report} />
          ) : answered ? (
            <GradeNow sessionId={session.id} history={transcript} />
          ) : (
            <div className="glass-panel rounded-2xl p-6 text-center">
              <h2 className="font-display text-headline-md text-on-surface">Nothing to grade</h2>
              <p className="mx-auto mt-2 max-w-md text-body-md leading-relaxed text-on-surface-variant">
                This session ended before you answered a question, so there is no report.
              </p>
              <Link
                href="/interview"
                className="btn-accent mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
              >
                Start a new interview
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          )}

          <section aria-labelledby="transcript-heading">
            <h2
              id="transcript-heading"
              className="mb-4 font-display text-label-md uppercase tracking-widest text-on-surface-variant"
            >
              Transcript
            </h2>
            <div className="glass-card p-6">
              <Transcript history={transcript} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

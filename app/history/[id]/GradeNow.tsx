'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from '@/app/components/Icon';
import { useToast } from '@/app/components/Toast';
import { fetchJson, toUserMessage } from '@/app/lib/fetchJson';
import type { TurnMessage } from '@/app/lib/types';

interface Props {
  sessionId: string;
  /** The transcript stored server-side for this session. */
  history: TurnMessage[];
}

/**
 * Grade a session that ended without a report (closed tab, grader outage).
 * Posts the stored transcript to the same endpoint the live flow uses, then
 * re-renders the page so the report appears in place.
 */
export default function GradeNow({ sessionId, history }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { error: toastError, warning: toastWarning, success: toastSuccess } = useToast();

  const grade = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await fetchJson<{ degraded?: boolean; notice?: string }>('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, history }),
        signal: AbortSignal.timeout(120_000),
      });
      if (data.degraded && data.notice) toastWarning(data.notice, { title: 'Placeholder report' });
      else toastSuccess('Your report is ready.', { title: 'Graded' });
      // The report is persisted after the response is sent; the refresh below
      // re-reads the row. Persistence is best-effort, so a hiccup shows the
      // "not graded" state again rather than an error — the retry is one click.
      router.refresh();
    } catch (err) {
      const message = toUserMessage(err);
      setError(message);
      toastError(message, { title: 'Grading failed', key: 'grade-now' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 text-center">
      <h2 className="font-display text-headline-md text-on-surface">This interview was not graded</h2>
      <p className="mx-auto mt-2 max-w-md text-body-md leading-relaxed text-on-surface-variant">
        The transcript was saved. Grade it now to get your scorecard and per-question feedback.
      </p>
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl border border-error/30 bg-error-container/30 px-4 py-3 text-body-sm text-error">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={grade}
        disabled={busy}
        className="btn-accent mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
      >
        <Icon name="analysis" className="h-4 w-4" />
        {busy ? 'Grading…' : 'Grade this interview'}
      </button>
    </div>
  );
}

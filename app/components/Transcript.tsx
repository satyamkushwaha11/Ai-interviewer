import type { TurnMessage } from '@/app/lib/types';

/** Read-only transcript, interviewer turns accented. Server-safe (no hooks). */
export default function Transcript({ history }: { history: TurnMessage[] }) {
  if (history.length === 0) {
    return (
      <p className="font-display text-label-sm text-on-surface-variant/60">
        No transcript was recorded for this session.
      </p>
    );
  }
  return (
    <ol className="space-y-5">
      {history.map((m, i) => (
        <li
          key={i}
          className={`border-l-2 pl-4 ${
            m.role === 'interviewer' ? 'border-primary-fixed' : 'border-outline-variant'
          }`}
        >
          <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
            {m.role === 'interviewer' ? 'Interviewer' : 'You'}
          </div>
          <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">{m.content}</p>
        </li>
      ))}
    </ol>
  );
}

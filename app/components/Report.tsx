'use client';

import Link from 'next/link';
import Icon from './Icon';
import type { InterviewReport, ReportSection } from '@/app/lib/types';

interface Props {
  report: InterviewReport;
  /** Fresh interview in place (live flow). When absent, a link to /interview is shown instead. */
  onRestart?: () => void;
  /** Where "past reports" lives, if the caller wants that link shown. */
  historyHref?: string;
}

const RING_PATH =
  'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

function scoreColor(n: number) {
  if (n >= 8) return 'text-primary-fixed';
  if (n >= 6) return 'text-primary-fixed-dim';
  return 'text-error';
}

function ScoreCard({ label, section }: { label: string; section: ReportSection }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-display text-label-sm uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <span className={`font-display text-headline-md ${scoreColor(section.score)}`}>
          {section.score}
          <span className="text-label-sm text-on-surface-variant/60">/10</span>
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div
          className="h-full rounded-full bg-primary-fixed"
          style={{ width: `${Math.max(0, Math.min(10, section.score)) * 10}%` }}
        />
      </div>
      <p className="text-body-md leading-relaxed text-on-surface-variant">{section.notes}</p>
    </div>
  );
}

function OverallRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div className="relative mx-auto h-48 w-48">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <path className="circle-bg" d={RING_PATH} />
        <path className="circle-value" strokeDasharray={`${pct}, 100`} d={RING_PATH} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-glow font-display text-headline-lg font-bold text-primary-fixed">
          {score}
        </div>
        <div className="font-display text-label-sm uppercase tracking-widest text-on-surface-variant">
          out of 10
        </div>
      </div>
    </div>
  );
}

/** Report JSON comes from a model; render defensively so one missing field cannot blank the page. */
function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

const EMPTY_SECTION: ReportSection = { score: 0, notes: '' };

export default function Report({ report, onRestart, historyHref }: Props) {
  const strengths = list(report.strengths);
  const improvements = list(report.improvements);
  const perQuestion = Array.isArray(report.perQuestion) ? report.perQuestion : [];
  const restartClass =
    'btn-accent neon-glow shimmer relative flex w-full items-center justify-center gap-2 overflow-hidden py-4 font-display text-label-md';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Overall */}
      <div className="glass-panel relative overflow-hidden rounded-[2rem] p-8 text-center sm:p-10">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="relative">
          <div className="badge mx-auto mb-6 w-fit">
            <Icon name="analysis" className="h-4 w-4" />
            Analysis report
          </div>
          <OverallRing score={report.overall} />
          <p className="mx-auto mt-6 max-w-xl text-body-lg leading-relaxed text-on-surface">
            {report.summary}
          </p>
        </div>
      </div>

      {/* Dimension scores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Communication" section={report.communication ?? EMPTY_SECTION} />
        <ScoreCard label="Knowledge" section={report.knowledge ?? EMPTY_SECTION} />
        <ScoreCard label="Problem solving" section={report.problemSolving ?? EMPTY_SECTION} />
        <ScoreCard label="Role fit" section={report.roleFit ?? EMPTY_SECTION} />
      </div>

      {/* Strengths / improvements */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-label-md font-semibold text-primary-fixed">
            <Icon name="check-circle" className="h-4 w-4" />
            Strengths
          </h3>
          <ul className="space-y-3 text-body-md text-on-surface">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <Icon name="check" className="mt-1 h-4 w-4 flex-none text-primary-fixed" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-label-md font-semibold text-on-surface-variant">
            <Icon name="trending" className="h-4 w-4" />
            Improvements
          </h3>
          <ul className="space-y-3 text-body-md text-on-surface">
            {improvements.map((s, i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <Icon
                  name="arrow-right"
                  className="mt-1 h-4 w-4 flex-none text-on-surface-variant"
                />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Per-question */}
      <div>
        <h3 className="mb-4 font-display text-label-md uppercase tracking-widest text-on-surface-variant">
          Per-question feedback
        </h3>
        <div className="space-y-4">
          {perQuestion.map((q, i) => (
            <div key={i} className="glass-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="font-display text-label-md leading-relaxed text-on-surface">
                  <span className="mr-2 text-primary-fixed">Q{i + 1}.</span>
                  {q.question}
                </div>
                <span className={`shrink-0 font-display text-headline-md ${scoreColor(q.score)}`}>
                  {q.score}
                  <span className="text-label-sm text-on-surface-variant/60">/10</span>
                </span>
              </div>
              <div className="mb-4 border-l-2 border-outline-variant pl-4">
                <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
                  You said
                </div>
                <p className="text-body-md leading-relaxed text-on-surface-variant">{q.answer}</p>
              </div>
              <div className="border-l-2 border-primary-fixed pl-4">
                <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-primary-fixed/70">
                  Feedback
                </div>
                <p className="text-body-md leading-relaxed text-on-surface">{q.feedback}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {onRestart ? (
          <button type="button" onClick={onRestart} className={restartClass}>
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Icon name="replay" className="h-5 w-5" />
              Start a new interview
            </span>
          </button>
        ) : (
          <Link href="/interview" className={restartClass}>
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Icon name="replay" className="h-5 w-5" />
              Start a new interview
            </span>
          </Link>
        )}
        {historyHref && (
          <Link
            href={historyHref}
            className="btn-ghost flex w-full items-center justify-center gap-2 py-3 font-display text-label-md"
          >
            <Icon name="chart" className="h-4 w-4" />
            View past reports
          </Link>
        )}
      </div>
    </div>
  );
}

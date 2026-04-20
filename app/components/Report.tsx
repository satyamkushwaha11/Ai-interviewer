'use client';

import type { InterviewReport, ReportSection } from '@/app/lib/types';

interface Props {
  report: InterviewReport;
  onRestart: () => void;
}

function scoreColor(n: number) {
  if (n >= 8) return 'text-emerald-400';
  if (n >= 6) return 'text-amber-400';
  return 'text-rose-400';
}

function ScoreCard({ label, section }: { label: string; section: ReportSection }) {
  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
        <span className={`text-xl font-semibold ${scoreColor(section.score)}`}>{section.score}<span className="text-sm text-zinc-600">/10</span></span>
      </div>
      <div className="text-sm text-zinc-400 leading-relaxed">{section.notes}</div>
    </div>
  );
}

function OverallRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, score / 10));
  const circumference = 2 * Math.PI * 54;
  const dash = pct * circumference;
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(63,63,70,0.6)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold">{score}</div>
        <div className="text-xs text-zinc-500">out of 10</div>
      </div>
    </div>
  );
}

export default function Report({ report, onRestart }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card p-8 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">Overall performance</div>
        <OverallRing score={report.overall} />
        <p className="mt-6 text-zinc-300 max-w-xl mx-auto leading-relaxed">{report.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ScoreCard label="Communication" section={report.communication} />
        <ScoreCard label="Knowledge" section={report.knowledge} />
        <ScoreCard label="Problem solving" section={report.problemSolving} />
        <ScoreCard label="Role fit" section={report.roleFit} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-emerald-400 mb-3">Strengths</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-emerald-400 mt-0.5">✓</span>{s}</li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-medium text-amber-400 mb-3">Improvements</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {report.improvements.map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-amber-400 mt-0.5">→</span>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Per-question feedback</h3>
        <div className="space-y-3">
          {report.perQuestion.map((q, i) => (
            <div key={i} className="card p-5 text-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-violet-300 font-medium leading-relaxed">Q. {q.question}</div>
                <span className={`text-lg font-semibold shrink-0 ${scoreColor(q.score)}`}>{q.score}<span className="text-xs text-zinc-600">/10</span></span>
              </div>
              <div className="text-zinc-400 leading-relaxed mb-3"><span className="text-zinc-500">You said:</span> {q.answer}</div>
              <div className="text-zinc-300 leading-relaxed border-t border-zinc-800 pt-3"><span className="text-zinc-500">Feedback:</span> {q.feedback}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="btn-primary w-full py-3 text-sm"
      >
        Start new interview
      </button>
    </div>
  );
}

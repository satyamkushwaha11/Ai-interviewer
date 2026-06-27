import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features — Interviewly',
  description:
    'Resume-tuned questions, technical and behavioral focus modes, real follow-ups, a voice interviewer, and a graded report.',
};

const BLOCKS: { kicker: string; title: string; body: string; points: string[] }[] = [
  {
    kicker: 'Context-aware',
    title: 'Questions grounded in your actual background',
    body: 'Drop in your resume and the target job description. The interviewer maps your experience to the role and asks what a real panel would — no generic question bank.',
    points: ['Resume + JD tuning', 'Targeted or general mode', 'Role-aware probing'],
  },
  {
    kicker: 'Focus modes',
    title: 'Technical, behavioral, or a mixed loop',
    body: 'Pick how the room runs. Technical drills your stack, system design, debugging, and trade-offs. Behavioral runs STAR-style. Mixed alternates between the two.',
    points: ['Technical depth & design', 'STAR behavioral', 'Balanced mixed loop'],
  },
  {
    kicker: 'Pressure that adapts',
    title: 'From warm screener to FAANG bar-raiser',
    body: 'Choose the rigor. The interviewer scales difficulty and depth to match, follows up on your specific answers, and makes you reason aloud so rehearsed answers break down.',
    points: ['4 rigor levels', 'Adaptive follow-ups', 'One sharp question at a time'],
  },
  {
    kicker: 'Voice-first',
    title: 'Speak your answers, hear the interviewer',
    body: 'Answer out loud with speech-to-text, and hear questions in a natural voice. Practise the conversation the way it actually happens on the call.',
    points: ['Speech-to-text answers', 'Natural voice interviewer', 'Male or female voice'],
  },
  {
    kicker: 'Feedback that matters',
    title: 'A graded report after every session',
    body: 'Get a structured scorecard across communication, knowledge, problem-solving, and role fit — with per-question feedback and concrete things to improve next time.',
    points: ['Overall + per-dimension scores', 'Per-question feedback', 'Concrete next steps'],
  },
];

export default function FeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-20 pb-10">
      <div className="text-center mb-16">
        <span className="badge mb-5">Features</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight gradient-hero max-w-3xl mx-auto">
          Everything you need to walk in ready
        </h1>
        <p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto">
          Interviewly recreates the real loop end to end — from the first question to the final
          scorecard.
        </p>
      </div>

      <div className="space-y-6">
        {BLOCKS.map((b, i) => (
          <div
            key={b.title}
            className={`glass p-8 sm:p-10 grid md:grid-cols-2 gap-8 items-center ${
              i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''
            }`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] accent-grad">
                {b.kicker}
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">{b.title}</h2>
              <p className="mt-3 text-zinc-400 leading-relaxed">{b.body}</p>
            </div>
            <ul className="space-y-3">
              {b.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-zinc-200 bg-zinc-900/40 border border-zinc-800 rounded-lg px-4 py-3">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-center mt-16">
        <Link href="/interview" className="btn-primary btn-lg font-semibold">
          Try it now — free
        </Link>
      </div>
    </div>
  );
}

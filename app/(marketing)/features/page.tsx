import type { Metadata } from 'next';
import Link from 'next/link';
import Icon, { type IconName } from '@/app/components/Icon';

export const metadata: Metadata = {
  title: 'Features — AI Interviewer',
  description:
    'Resume-tuned questions, technical and behavioral focus modes, real follow-ups, a voice interviewer, and a graded report.',
};

const BLOCKS: { kicker: string; title: string; body: string; points: string[]; icon: IconName }[] = [
  {
    kicker: 'Context-aware',
    title: 'Questions grounded in your actual background',
    body: 'Drop in your resume and the target job description. The interviewer maps your experience to the role and asks what a real panel would — no generic question bank.',
    points: ['Resume + JD tuning', 'Targeted or general mode', 'Role-aware probing'],
    icon: 'doc',
  },
  {
    kicker: 'Focus modes',
    title: 'Technical, behavioral, or a mixed loop',
    body: 'Pick how the room runs. Technical drills your stack, system design, debugging, and trade-offs. Behavioral runs STAR-style. Mixed alternates between the two.',
    points: ['Technical depth & design', 'STAR behavioral', 'Balanced mixed loop'],
    icon: 'code',
  },
  {
    kicker: 'Pressure that adapts',
    title: 'From warm screener to FAANG bar-raiser',
    body: 'Choose the rigor. The interviewer scales difficulty and depth to match, follows up on your specific answers, and makes you reason aloud so rehearsed answers break down.',
    points: ['4 rigor levels', 'Adaptive follow-ups', 'One sharp question at a time'],
    icon: 'target',
  },
  {
    kicker: 'Voice-first',
    title: 'Speak your answers, hear the interviewer',
    body: 'Answer out loud with speech-to-text, and hear questions in a natural voice. Practise the conversation the way it actually happens on the call.',
    points: ['Speech-to-text answers', 'Natural voice interviewer', 'Male or female voice'],
    icon: 'mic',
  },
  {
    kicker: 'Feedback that matters',
    title: 'A graded report after every session',
    body: 'Get a structured scorecard across communication, knowledge, problem-solving, and role fit — with per-question feedback and concrete things to improve next time.',
    points: ['Overall + per-dimension scores', 'Per-question feedback', 'Concrete next steps'],
    icon: 'chart',
  },
];

export default function FeaturesPage() {
  return (
    <div className="relative mx-auto max-w-[1440px] px-5 pb-10 pt-20 md:px-16">
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-fixed/5 blur-[140px]" />

      <div className="mb-16 text-center">
        <span className="badge mb-5">Features</span>
        <h1 className="mx-auto max-w-3xl font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
          Everything you need to walk in ready
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-lg text-on-surface-variant">
          AI Interviewer recreates the real loop end to end — from the first question to the final
          scorecard.
        </p>
      </div>

      <div className="space-y-6">
        {BLOCKS.map((b, i) => (
          <div
            key={b.title}
            className={`glass-panel grid items-center gap-8 rounded-[2rem] p-8 sm:p-10 md:grid-cols-2 ${
              i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''
            }`}
          >
            <div>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary-fixed/30 bg-primary-fixed/10">
                <Icon name={b.icon} className="h-5 w-5 text-primary-fixed" />
              </div>
              <span className="font-display text-label-sm uppercase tracking-[0.2em] text-primary-fixed">
                {b.kicker}
              </span>
              <h2 className="mt-3 font-display text-headline-md text-tertiary">{b.title}</h2>
              <p className="mt-3 text-body-md leading-relaxed text-on-surface-variant">{b.body}</p>
            </div>
            <ul className="space-y-3">
              {b.points.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-surface-container-low px-4 py-3 text-body-md text-on-surface"
                >
                  <Icon name="check" className="h-4 w-4 flex-none text-primary-fixed" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/interview"
          className="btn-accent neon-glow inline-flex items-center gap-2 px-8 py-4 font-display text-label-md"
        >
          Try it now — free
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

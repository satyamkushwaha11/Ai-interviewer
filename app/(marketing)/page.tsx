import type { Metadata } from 'next';
import Link from 'next/link';
import Icon, { type IconName } from '@/app/components/Icon';

export const metadata: Metadata = {
  title: 'AI Interviewer — Realistic mock interviews',
  description:
    'Practice with a live AI interviewer tuned to your resume and target role. Technical and behavioral questions, real follow-ups, and a graded report.',
};

const FEATURES: { title: string; body: string; icon: IconName }[] = [
  {
    title: 'Tuned to your resume',
    body: 'Upload a resume and paste the job description. Every question is grounded in your actual background and the role you want.',
    icon: 'doc',
  },
  {
    title: 'Technical + behavioral',
    body: 'Choose Technical, Behavioral, or a Mixed loop. The interviewer probes your stack, system design, and trade-offs — not just "tell me about yourself".',
    icon: 'code',
  },
  {
    title: 'Real follow-ups',
    body: 'It builds on your last answer and makes you reason aloud, so memorized or AI-generated answers fall apart — just like a real loop.',
    icon: 'chat',
  },
  {
    title: 'Voice-first',
    body: 'Speak your answers and hear the interviewer respond with a natural voice. Practice the way the real conversation actually happens.',
    icon: 'mic',
  },
  {
    title: 'Calibrated rigor',
    body: 'From a warm screener to a FAANG bar-raiser. Pick the pressure and the interviewer scales depth and difficulty to match.',
    icon: 'trending',
  },
  {
    title: 'Graded report',
    body: 'Get a structured scorecard — communication, knowledge, problem-solving, role fit — with per-question feedback and concrete next steps.',
    icon: 'chart',
  },
];

/** Fixed bar heights (%) — deterministic so server and client markup match. */
const WAVEFORM = [
  22, 48, 34, 72, 58, 90, 44, 66, 30, 82, 52, 38, 74, 26, 60, 96, 42, 68, 34, 56, 78, 30, 50, 86,
  40, 62, 28, 70,
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Add your context',
    body: 'Paste or upload your resume, drop in the job description, and pick your role.',
  },
  {
    n: '02',
    title: 'Set the room',
    body: 'Choose focus (technical / behavioral / mixed), rigor, duration, and interviewer voice.',
  },
  {
    n: '03',
    title: 'Interview & review',
    body: 'Have a live back-and-forth, then get a graded report with specific, honest feedback.',
  },
];

export default function HomePage() {
  return (
    <div className="relative mx-auto max-w-[1440px] px-5 md:px-16">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute left-1/4 top-20 -z-10 h-96 w-96 rounded-full bg-primary-fixed/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-40 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary-fixed/5 blur-[150px]" />

      {/* Hero */}
      <section className="relative mb-24 flex min-h-[80vh] flex-col items-center justify-center gap-12 pt-16 md:flex-row md:pt-24">
        <div className="z-10 flex w-full flex-col items-start md:w-1/2">
          <div className="badge mb-6">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-fixed" />
            Mock interviews · Real prep
          </div>

          <h1 className="mb-6 font-display text-headline-lg-mobile text-tertiary md:text-headline-xl">
            Interview like <br />
            it&apos;s <span className="text-glow text-primary-fixed">real</span>.
          </h1>

          <p className="mb-10 max-w-lg text-body-lg leading-relaxed text-on-surface-variant">
            A live AI interviewer tuned to your resume and target role. It probes, follows up, and
            grades you like a hiring manager would — across technical and behavioral rounds.
          </p>

          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <Link
              href="/interview"
              className="btn-accent px-8 py-4 text-center font-display text-label-md shadow-[0_0_15px_rgba(185,246,0,0.4)]"
            >
              Start a mock interview
            </Link>
            <Link
              href="/pricing"
              className="btn-ghost flex items-center justify-center gap-2 px-8 py-4 text-center font-display text-label-md"
            >
              <Icon name="play-circle" />
              See pricing
            </Link>
          </div>

          <p className="mt-5 font-display text-label-sm text-on-surface-variant/60">
            No credit card required · Free during beta
          </p>
        </div>

        {/* Product preview */}
        <div className="relative z-10 flex w-full items-center justify-center md:h-[500px] md:w-1/2">
          <div className="glow-accent relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-surface-container-high transition-transform duration-500 md:h-full md:-rotate-3 md:scale-95 md:hover:rotate-0 md:hover:scale-100">
            <div className="tech-grid absolute inset-0 opacity-60" />

            <div className="relative flex h-full flex-col gap-6 p-6 pb-32 pt-16 lg:pt-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary-fixed-dim/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-outline/70" />
                <span className="ml-3 font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
                  Live session
                </span>
              </div>

              <div className="space-y-5 lg:pr-28">
                <div className="border-l-2 border-primary-fixed pl-4">
                  <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
                    Interviewer
                  </div>
                  <p className="text-body-md leading-relaxed text-on-surface">
                    You mentioned you scaled the payments service. What was the bottleneck, and how
                    did you decide between sharding and a read replica?
                  </p>
                </div>
                <div className="border-l-2 border-outline-variant pl-4">
                  <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
                    You
                  </div>
                  <p className="text-body-md leading-relaxed text-on-surface-variant">
                    Write latency was the constraint at peak, so I…
                    <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary-fixed align-middle" />
                  </p>
                </div>
              </div>

              {/* Voice waveform */}
              <div
                className="mt-auto flex h-24 items-center justify-center gap-1.5"
                aria-hidden="true"
              >
                {WAVEFORM.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 flex-none animate-pulse rounded-full bg-primary-fixed/40"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(i % 7) * 120}ms`,
                      animationDuration: `${1200 + (i % 5) * 260}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Speech analysis overlay */}
            <div className="glass-panel absolute bottom-6 left-6 right-6 flex items-center gap-4 rounded-xl p-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary-fixed shadow-[0_0_20px_rgba(185,246,0,0.35)]">
                <Icon name="mic" className="h-5 w-5 text-on-primary-fixed" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 font-display text-label-sm text-on-surface-variant">
                  Analyzing speech pattern…
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="relative h-full w-[78%] bg-primary-fixed">
                    <div className="absolute inset-0 animate-pulse bg-white/30" />
                  </div>
                </div>
              </div>
              <div className="ml-auto hidden whitespace-nowrap font-display text-label-md text-primary-fixed sm:block">
                78% Confidence
              </div>
            </div>
          </div>

          {/* Floating card */}
          <div className="glass-panel absolute -right-6 -top-4 hidden w-48 rounded-xl p-4 shadow-2xl lg:block">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="check-circle" className="h-4 w-4 text-primary-fixed" />
              <span className="font-display text-label-sm text-tertiary">Real-time feedback</span>
            </div>
            <div className="text-[10px] leading-relaxed text-on-surface-variant">
              STAR method detected. Strong structure.
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mb-12 text-center">
          <span className="font-display text-label-sm uppercase tracking-[0.2em] text-primary-fixed">
            Why AI Interviewer
          </span>
          <h2 className="mt-3 font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
            Prep that behaves like the real thing
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass-panel lift rounded-2xl p-6"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary-fixed/30 bg-primary-fixed/10">
                <Icon name={f.icon} className="h-5 w-5 text-primary-fixed" />
              </div>
              <h3 className="mb-2 font-display text-label-md font-semibold text-on-surface">
                {f.title}
              </h3>
              <p className="text-body-md leading-relaxed text-on-surface-variant">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mb-12 text-center">
          <span className="font-display text-label-sm uppercase tracking-[0.2em] text-primary-fixed">
            How it works
          </span>
          <h2 className="mt-3 font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
            From resume to graded report in minutes
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass-panel rounded-2xl p-6">
              <div className="mb-3 font-display text-headline-md font-bold text-primary-fixed">
                {s.n}
              </div>
              <h3 className="mb-2 font-display text-label-md font-semibold text-on-surface">
                {s.title}
              </h3>
              <p className="text-body-md leading-relaxed text-on-surface-variant">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="py-16">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-fixed/10 blur-[100px]" />
          <div className="relative z-10">
            <h2 className="font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
              Your next interview shouldn&apos;t be your first rep.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-body-lg text-on-surface-variant">
              Run a realistic loop today and walk in already warmed up.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/interview"
                className="btn-accent neon-glow px-8 py-4 font-display text-label-md"
              >
                Start free
              </Link>
              <Link href="/features" className="btn-ghost px-8 py-4 font-display text-label-md">
                Explore features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

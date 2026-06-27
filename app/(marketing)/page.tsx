import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Interviewly — Realistic AI mock interviews',
  description:
    'Practice with a live AI interviewer tuned to your resume and target role. Technical and behavioral questions, real follow-ups, and a graded report.',
};

const FEATURES: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: 'Tuned to your resume',
    body: 'Upload a resume and paste the job description. Every question is grounded in your actual background and the role you want.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m-7 4h8a2 2 0 002-2V8l-5-5H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
  {
    title: 'Technical + behavioral',
    body: 'Choose Technical, Behavioral, or a Mixed loop. The interviewer probes your stack, system design, and trade-offs — not just "tell me about yourself".',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    ),
  },
  {
    title: 'Real follow-ups',
    body: 'It builds on your last answer and makes you reason aloud, so memorized or AI-generated answers fall apart — just like a real loop.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
    ),
  },
  {
    title: 'Voice-first',
    body: 'Speak your answers and hear the interviewer respond with a natural voice. Practice the way the real conversation actually happens.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-14 0m7 7v4m0-4a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    ),
  },
  {
    title: 'Calibrated rigor',
    body: 'From a warm screener to a FAANG bar-raiser. Pick the pressure and the interviewer scales depth and difficulty to match.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    ),
  },
  {
    title: 'Graded report',
    body: 'Get a structured scorecard — communication, knowledge, problem-solving, role fit — with per-question feedback and concrete next steps.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  { n: '01', title: 'Add your context', body: 'Paste or upload your resume, drop in the job description, and pick your role.' },
  { n: '02', title: 'Set the room', body: 'Choose focus (technical / behavioral / mixed), rigor, duration, and interviewer voice.' },
  { n: '03', title: 'Interview & review', body: 'Have a live back-and-forth, then get a graded report with specific, honest feedback.' },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 sm:pt-28 text-center">
        <span className="badge mb-6">Mock interviews · Real prep</span>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight gradient-hero leading-[1.05] max-w-4xl mx-auto">
          Interview like it&apos;s real.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          A live AI interviewer tuned to your resume and target role. It probes, follows up, and
          grades you like a hiring manager would — across technical and behavioral rounds.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/interview" className="btn-primary btn-lg font-semibold">
            Start a mock interview
          </Link>
          <Link href="/pricing" className="btn-secondary btn-lg font-semibold">
            See pricing
          </Link>
        </div>
        <p className="mt-5 text-xs text-zinc-500">No credit card required · Free during beta</p>

        {/* Product preview */}
        <div className="mt-16 max-w-3xl mx-auto text-left">
          <div className="glass p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-[11px] uppercase tracking-widest text-zinc-500">Live session</span>
            </div>
            <div className="space-y-4">
              <div className="border-l-2 border-indigo-500 pl-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Interviewer</div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  You mentioned you scaled the payments service. What was the bottleneck, and how
                  did you decide between sharding and a read replica?
                </p>
              </div>
              <div className="border-l-2 border-zinc-600 pl-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">You</div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Write latency was the constraint at peak, so I…
                  <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400/80 align-middle rounded-sm animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] accent-grad">Why Interviewly</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Prep that behaves like the real thing
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass lift p-6">
              <div className="w-11 h-11 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {f.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] accent-grad">How it works</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            From resume to graded report in minutes
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="glass p-6">
              <div className="text-3xl font-bold accent-grad mb-3">{s.n}</div>
              <h3 className="font-semibold text-zinc-100 mb-2">{s.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="glass p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Your next interview shouldn&apos;t be your first rep.
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Run a realistic loop today and walk in already warmed up.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/interview" className="btn-primary btn-lg font-semibold">
                Start free
              </Link>
              <Link href="/features" className="btn-secondary btn-lg font-semibold">
                Explore features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

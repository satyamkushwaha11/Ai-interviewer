import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing — Interviewly',
  description: 'Simple plans for serious prep. Free during beta — paid plans launching soon.',
};

type Plan = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    tagline: 'Get a feel for real interview pressure.',
    features: [
      '3 mock interviews / month',
      'Technical & behavioral focus',
      'Resume + job-description tuning',
      'Graded report after each session',
    ],
    cta: 'Start free',
    href: '/interview',
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: 'per month',
    tagline: 'For active job seekers running daily reps.',
    features: [
      'Unlimited mock interviews',
      'All rigor levels incl. "Bar Raiser"',
      'Voice interviewer (natural TTS)',
      'Full transcript & report history',
      'Priority response speed',
    ],
    cta: 'Start Pro',
    href: '/interview',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$49',
    cadence: 'per month',
    tagline: 'For bootcamps, career coaches, and squads.',
    features: [
      'Everything in Pro',
      'Up to 5 seats',
      'Shared question banks',
      'Aggregate progress dashboard',
      'Dedicated support',
    ],
    cta: 'Contact sales',
    href: '#',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is it really free right now?',
    a: 'Yes. Billing launches soon — while we are in beta, every plan is free so you can practise without limits.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Interviewly runs in your browser. For voice answers, just allow microphone access when prompted.',
  },
  {
    q: 'Which roles does it support?',
    a: 'Any knowledge-worker role. It is strongest for software and technical roles, where it probes your stack, system design, and trade-offs.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Once paid plans launch, yes — monthly plans can be cancelled at any time, no questions asked.',
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-20 pb-10">
      <div className="text-center mb-14">
        <span className="badge mb-5">Pricing</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight gradient-hero">
          Simple plans for serious prep
        </h1>
        <p className="mt-5 text-lg text-zinc-400 max-w-xl mx-auto">
          Start free and upgrade when you are interviewing for real. No credit card required to
          begin.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Free for everyone during beta
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`glass p-7 relative ${
              plan.highlight ? 'ring-1 ring-indigo-500/60 lift' : ''
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge">Most popular</span>
            )}
            <h2 className="text-lg font-semibold text-zinc-100">{plan.name}</h2>
            <p className="text-sm text-zinc-500 mt-1 mb-5 min-h-[2.5rem]">{plan.tagline}</p>
            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-zinc-500">/ {plan.cadence}</span>
            </div>
            <Link
              href={plan.href}
              className={`${plan.highlight ? 'btn-primary' : 'btn-secondary'} w-full block text-center py-3 text-sm font-semibold`}
            >
              {plan.cta}
            </Link>
            <ul className="mt-7 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                  <svg className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mt-24">
        <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="glass p-6">
              <h3 className="font-semibold text-zinc-100 mb-2">{item.q}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

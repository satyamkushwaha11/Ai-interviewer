import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/app/components/Icon';

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
    <div className="relative mx-auto max-w-[1440px] px-5 pb-10 pt-20 md:px-16">
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-fixed/5 blur-[140px]" />

      <div className="mb-14 text-center">
        <span className="badge mb-5">Pricing</span>
        <h1 className="font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
          Simple plans for serious prep
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-body-lg text-on-surface-variant">
          Start free and upgrade when you are interviewing for real. No credit card required to
          begin.
        </p>
        <div className="badge mt-6">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-fixed" />
          Free for everyone during beta
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`glass-panel relative rounded-2xl p-7 ${
              plan.highlight ? 'glow-accent lift border-primary-fixed/40' : ''
            }`}
          >
            {plan.highlight && (
              <span className="badge absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-surface-container-high">
                Most popular
              </span>
            )}
            <h2 className="font-display text-headline-md text-on-surface">{plan.name}</h2>
            <p className="mb-5 mt-1 min-h-[2.5rem] text-body-md text-on-surface-variant/70">
              {plan.tagline}
            </p>
            <div className="mb-6 flex items-baseline gap-1.5">
              <span className="font-display text-headline-lg-mobile font-bold text-tertiary">
                {plan.price}
              </span>
              <span className="text-label-md text-on-surface-variant/70">/ {plan.cadence}</span>
            </div>
            <Link
              href={plan.href}
              className={`${
                plan.highlight ? 'btn-accent' : 'btn-ghost'
              } block w-full py-3 text-center font-display text-label-md`}
            >
              {plan.cta}
            </Link>
            <ul className="mt-7 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-body-md text-on-surface">
                  <Icon name="check" className="mt-1 h-4 w-4 flex-none text-primary-fixed" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="mb-10 text-center font-display text-headline-md text-tertiary">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="glass-panel rounded-2xl p-6">
              <h3 className="mb-2 font-display text-label-md font-semibold text-on-surface">
                {item.q}
              </h3>
              <p className="text-body-md leading-relaxed text-on-surface-variant">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

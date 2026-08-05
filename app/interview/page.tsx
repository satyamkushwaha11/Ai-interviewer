'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '../components/Icon';
import Interview from '../components/Interview';
import Report from '../components/Report';
import SetupForm from '../components/SetupForm';
import type { InterviewConfig, InterviewReport, TurnMessage } from '../lib/types';

type Step = 'setup' | 'preparing' | 'interview' | 'generating' | 'report';

const TURNS_PER_MIN = 0.8;

function Waiting({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="pulse-ring absolute inset-0 rounded-full border border-primary-fixed/30" />
        <div
          className="pulse-ring absolute inset-0 rounded-full border border-primary-fixed/20"
          style={{ animationDelay: '-0.5s' }}
        />
        <div className="ai-glow h-12 w-12 rounded-full bg-gradient-to-br from-primary-fixed to-surface-tint" />
      </div>
      <div className="font-display text-label-md text-primary-fixed">{label}</div>
    </div>
  );
}

export default function InterviewPage() {
  const [step, setStep] = useState<Step>('setup');
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState('');

  const handleStart = async (cfg: InterviewConfig) => {
    setError('');
    setStep('preparing');
    try {
      const res = await fetch('/api/summarize-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: cfg.resume, jd: cfg.jd, role: cfg.role, mode: cfg.mode }),
      });
      const data = await res.json();
      const targetTurns = Math.max(3, Math.round(cfg.durationMin * TURNS_PER_MIN));
      setConfig({ ...cfg, summary: data.summary, plan: data.plan, targetTurns });
      setStep('interview');
    } catch (e) {
      setError((e as Error).message);
      setStep('setup');
    }
  };

  const handleFinish = async (history: TurnMessage[]) => {
    if (!config) return;
    setStep('generating');
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, history }),
      });
      const data = await res.json();
      setReport(data.report);
      setStep('report');
    } catch (e) {
      setError((e as Error).message);
      setStep('setup');
    }
  };

  const handleRestart = () => {
    setStep('setup');
    setConfig(null);
    setReport(null);
  };

  // The live session takes over the whole viewport with its own chrome.
  if (step === 'interview' && config) {
    return <Interview config={config} onFinish={handleFinish} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 h-16 border-b border-white/10 bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-5 md:px-6">
          <Link href="/" className="flex items-center">
            <span className="font-display text-headline-md font-bold tracking-tight text-primary-fixed">
              Interviewly
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="hidden rounded-md px-3 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface sm:inline"
            >
              Pricing
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 font-display text-label-md text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-6">
        {step === 'setup' && (
          <>
            <div className="mb-10 text-center">
              <span className="badge mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed" />
                Step 1 · Configure
              </span>
              <h1 className="font-display text-headline-lg-mobile text-tertiary md:text-headline-lg">
                Set up your interview
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-body-lg text-on-surface-variant">
                Add your resume and target role, pick the focus and rigor, and we&apos;ll run a
                realistic, graded session.
              </p>
            </div>
            <div className="animate-fade-in-up">
              <SetupForm onStart={handleStart} />
            </div>
          </>
        )}

        {step === 'preparing' && <Waiting label="Preparing your interviewer…" />}
        {step === 'generating' && <Waiting label="Generating your report…" />}

        {step === 'report' && report && (
          <div className="animate-fade-in-up">
            <Report report={report} onRestart={handleRestart} />
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-error/30 bg-error-container/30 p-4 text-center text-body-md text-error">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

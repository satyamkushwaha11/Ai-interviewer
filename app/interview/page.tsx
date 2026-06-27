'use client';

import Link from 'next/link';
import { useState } from 'react';
import Interview from '../components/Interview';
import Report from '../components/Report';
import SetupForm from '../components/SetupForm';
import type { InterviewConfig, InterviewReport, TurnMessage } from '../lib/types';

type Step = 'setup' | 'preparing' | 'interview' | 'generating' | 'report';

const TURNS_PER_MIN = 0.8;

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
      setConfig({ ...cfg, summary: data.summary, targetTurns });
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-xs font-bold text-white">
              AI
            </div>
            <span className="font-semibold tracking-tight">Interviewly</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="nav-link hidden sm:inline">
              Pricing
            </Link>
            <Link href="/" className="nav-link">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {step === 'setup' && (
          <>
            <div className="text-center mb-10">
              <span className="badge mb-4">Step 1 · Configure</span>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Set up your interview
              </h1>
              <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
                Add your resume and target role, pick the focus and rigor, and we&apos;ll run a
                realistic, graded session.
              </p>
            </div>
            <div className="animate-fade-in-up">
              <SetupForm onStart={handleStart} />
            </div>
          </>
        )}
        {step === 'preparing' && (
          <div className="text-center py-24">
            <div className="inline-flex items-center gap-3 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-violet-400 dot-pulse" />
              Preparing your interviewer…
            </div>
          </div>
        )}
        {step === 'interview' && config && <Interview config={config} onFinish={handleFinish} />}
        {step === 'generating' && (
          <div className="text-center py-24">
            <div className="inline-flex items-center gap-3 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-violet-400 dot-pulse" />
              Generating your report…
            </div>
          </div>
        )}
        {step === 'report' && report && <Report report={report} onRestart={handleRestart} />}
        {error && <div className="mt-6 text-sm text-rose-400 text-center">{error}</div>}
      </main>
    </div>
  );
}

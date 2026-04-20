'use client';

import { useState } from 'react';
import Interview from './components/Interview';
import Report from './components/Report';
import SetupForm from './components/SetupForm';
import type { InterviewConfig, InterviewReport, TurnMessage } from './lib/types';

type Step = 'setup' | 'preparing' | 'interview' | 'generating' | 'report';

const TURNS_PER_MIN = 0.8;

export default function Home() {
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
    <div className="min-h-screen">
      <header className="border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-xs font-semibold">AI</div>
            <span className="font-semibold tracking-tight">Interviewer</span>
          </div>
          <span className="text-xs text-zinc-500 hidden sm:inline">Powered by OpenAI</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {step === 'setup' && (
          <>
            <div className="text-center mb-12">
              <div className="inline-block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">
                Mock interview · real prep
              </div>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight gradient-text">
                Interview like it&apos;s real.
              </h1>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                Upload your resume, paste the job, and get a live interviewer that probes, follows up, and grades you like a hiring manager would.
              </p>
            </div>
            <SetupForm onStart={handleStart} />
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
        {step === 'interview' && config && (
          <Interview config={config} onFinish={handleFinish} />
        )}
        {step === 'generating' && (
          <div className="text-center py-24">
            <div className="inline-flex items-center gap-3 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-violet-400 dot-pulse" />
              Generating your report…
            </div>
          </div>
        )}
        {step === 'report' && report && <Report report={report} onRestart={handleRestart} />}
        {error && (
          <div className="mt-6 text-sm text-rose-400 text-center">{error}</div>
        )}
      </main>
    </div>
  );
}

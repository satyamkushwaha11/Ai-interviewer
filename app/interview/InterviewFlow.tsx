'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppHeader from '../components/AppHeader';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { ApiError, fetchJson, toUserMessage } from '../lib/fetchJson';
import Interview from '../components/Interview';
import Report from '../components/Report';
import SetupForm from '../components/SetupForm';
import type { PublicUser, Usage } from '../lib/auth';
import type { InterviewConfig, InterviewReport, TurnMessage } from '../lib/types';

type Step = 'setup' | 'preparing' | 'interview' | 'generating' | 'report' | 'report-failed';

/**
 * Register the session and let the server build the tailored agenda. This is
 * also where the free trial is enforced (402 → ApiError 'trial_exhausted'), so
 * it must succeed before the interview can begin. Two model calls run behind
 * it, so allow a generous timeout.
 */
function createSession(config: InterviewConfig) {
  return fetchJson<{
    id: string;
    plan: InterviewConfig['plan'];
    targetTurns: number;
    usage: Usage;
    degraded?: boolean;
    notice?: string;
  }>('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
    signal: AbortSignal.timeout(90_000),
  });
}

function TrialExhausted({ usage }: { usage: Usage }) {
  return (
    <div className="glass-panel mx-auto max-w-lg rounded-[2rem] p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-fixed/30 bg-primary-fixed/10">
        <Icon name="spark" className="h-6 w-6 text-primary-fixed" />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">
        You&apos;ve used your {usage.limit} free interviews
      </h2>
      <p className="mx-auto mt-3 max-w-md text-body-md leading-relaxed text-on-surface-variant">
        Nice work getting the reps in. Upgrade to Pro for unlimited mock interviews, every rigor
        level, and your full report history.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/pricing"
          className="btn-accent flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
        >
          See Pro plans
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
        <Link href="/" className="btn-ghost px-6 py-3 font-display text-label-md">
          Back home
        </Link>
      </div>
    </div>
  );
}

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

interface Props {
  user: PublicUser;
  initialUsage: Usage;
}

export default function InterviewFlow({ user, initialUsage }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('setup');
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState('');
  const [lastHistory, setLastHistory] = useState<TurnMessage[] | null>(null);
  const { error: toastError, warning: toastWarning, info: toastInfo } = useToast();

  const exhausted = usage.remaining !== null && usage.remaining <= 0;

  const handleStart = async (cfg: InterviewConfig) => {
    setError('');
    setStep('preparing');
    try {
      const session = await createSession(cfg);
      if (session.degraded && session.notice) {
        toastWarning(session.notice, { title: 'Running in fallback mode' });
      }
      setConfig({ ...cfg, plan: session.plan, targetTurns: session.targetTurns });
      setSessionId(session.id);
      setUsage(session.usage);
      setStep('interview');
    } catch (e) {
      const message = toUserMessage(e);
      if (e instanceof ApiError && e.code === 'trial_exhausted') {
        // Server is the source of truth; flip the UI to the upgrade state.
        setUsage((u) => ({ ...u, remaining: 0 }));
        setStep('setup');
        return;
      }
      if (e instanceof ApiError && e.code === 'unauthorized') {
        router.push('/login?next=/interview');
        return;
      }
      setError(message);
      toastError(message, { title: 'Could not start the interview', key: 'start' });
      setStep('setup');
    }
  };

  const handleFinish = async (history: TurnMessage[]) => {
    if (!config || !sessionId) return;
    // Ending before answering anything: nothing to grade, so go straight back
    // to setup instead of showing a "report failed" screen.
    if (!history.some((m) => m.role === 'candidate')) {
      toastInfo('You ended the interview before answering, so there is nothing to grade.', {
        title: 'Interview ended',
      });
      handleRestart();
      return;
    }
    setLastHistory(history);
    setError('');
    setStep('generating');
    try {
      const data = await fetchJson<{
        report: InterviewReport;
        degraded?: boolean;
        notice?: string;
      }>('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, history }),
        signal: AbortSignal.timeout(120_000),
      });
      if (data.degraded && data.notice) {
        toastWarning(data.notice, { title: 'Placeholder report' });
      }
      setReport(data.report);
      setStep('report');
    } catch (e) {
      const message = toUserMessage(e);
      setError(message);
      toastError(message, { title: 'Report generation failed', key: 'report' });
      // Keep the transcript so grading can be retried without redoing the session.
      setStep('report-failed');
    }
  };

  const retryReport = () => {
    if (lastHistory) handleFinish(lastHistory);
  };

  const handleRestart = () => {
    setStep('setup');
    setConfig(null);
    setSessionId(null);
    setReport(null);
  };

  // The live session takes over the whole viewport with its own chrome.
  if (step === 'interview' && config && sessionId) {
    return <Interview config={config} sessionId={sessionId} onFinish={handleFinish} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} usage={usage} current="interview" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-6">
        {step === 'setup' && exhausted && (
          <div className="animate-fade-in-up">
            <TrialExhausted usage={usage} />
          </div>
        )}

        {step === 'setup' && !exhausted && (
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

        {step === 'report-failed' && (
          <div className="glass-panel mx-auto max-w-lg rounded-[2rem] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-error/30 bg-error/10">
              <Icon name="close" className="h-6 w-6 text-error" />
            </div>
            <h2 className="font-display text-headline-md text-on-surface">
              We couldn&apos;t grade the interview
            </h2>
            <p className="mx-auto mt-3 max-w-md text-body-md leading-relaxed text-on-surface-variant">
              {error || 'The grader was unavailable.'} Your transcript is safe — retry without
              redoing the session.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={retryReport}
                className="btn-accent flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
              >
                <Icon name="replay" className="h-4 w-4" />
                Retry grading
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="btn-ghost px-6 py-3 font-display text-label-md"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {step === 'report' && report && (
          <div className="animate-fade-in-up">
            <Report report={report} onRestart={handleRestart} historyHref="/history" />
          </div>
        )}

        {error && step === 'setup' && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-error/30 bg-error-container/30 p-4 text-center text-body-md text-error">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

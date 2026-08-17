/**
 * Turn the setup form's config into a full InterviewConfig: an interviewer-ready
 * profile summary, an ordered agenda (plan), and the turn budget.
 *
 * Runs once, server-side, when a session is created — so the plan and summary
 * are never round-tripped through (or accepted from) the browser.
 */

import { getAIProvider } from './ai';
import { buildPlanPrompt, buildProfileSummaryPrompt } from './prompts';
import { detectRolePlan, normalizePlan } from './rolePlans';
import type { InterviewConfig, InterviewPlan } from './types';
import type { SetupConfig } from './validate';

/** Roughly one question every 75 seconds once answers and follow-ups are counted. */
const TURNS_PER_MIN = 0.8;
const MIN_TURNS = 3;

export function targetTurnsFor(durationMin: number): number {
  return Math.max(MIN_TURNS, Math.round(durationMin * TURNS_PER_MIN));
}

/** Models sometimes wrap JSON in fences despite instructions. */
function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

export interface PreparedInterview {
  config: InterviewConfig;
  /** True when the AI provider was missing or failed and a stock plan was used. */
  degraded: boolean;
  /** Candidate-facing explanation, only set when `degraded`. */
  notice?: string;
}

/**
 * Both LLM calls failing means the provider is genuinely down; that is thrown
 * so the route can answer with a real status instead of silently starting an
 * interview the candidate believes was tailored to them.
 */
export async function prepareInterview(setup: SetupConfig): Promise<PreparedInterview> {
  const { resume, jd, role, mode } = setup;
  const targetTurns = targetTurnsFor(setup.durationMin);

  // Deterministic agenda from the static library; used as-is when there is no
  // AI provider, and as the fallback when plan generation fails.
  const fallbackPlan: InterviewPlan = detectRolePlan({ role, jd, resume });
  const fallbackSummary = `Candidate:\n- Background: (see resume)\n- Stack: (see resume)\n\n${
    mode === 'targeted' && jd ? `Role target:\n- Role: ${role || 'n/a'}\n- JD: ${jd.slice(0, 200)}\n` : ''
  }`;

  const ai = getAIProvider();
  if (!ai) {
    return {
      config: { ...setup, summary: fallbackSummary, plan: fallbackPlan, targetTurns },
      degraded: true,
      notice: `No AI provider configured — using the standard ${fallbackPlan.roleFamily} interview plan.`,
    };
  }

  const userBlock = [
    `Mode: ${mode}`,
    role ? `Target role: ${role}` : '',
    `Resume:\n${resume.slice(0, 8000)}`,
    mode === 'targeted' && jd ? `Job description:\n${jd.slice(0, 4000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // Summary and agenda are independent — run them together so setup stays fast.
  const [summaryResult, planResult] = await Promise.allSettled([
    ai.chat(
      [
        { role: 'system', content: buildProfileSummaryPrompt() },
        { role: 'user', content: userBlock },
      ],
      { temperature: 0.2, maxTokens: 500 },
    ),
    ai.chat(
      [
        { role: 'system', content: buildPlanPrompt() },
        { role: 'user', content: userBlock },
      ],
      { temperature: 0.3, maxTokens: 900, json: true },
    ),
  ]);

  if (summaryResult.status === 'rejected') console.error('[prepare] summary failed:', summaryResult.reason);
  if (planResult.status === 'rejected') console.error('[prepare] plan failed:', planResult.reason);
  if (summaryResult.status === 'rejected' && planResult.status === 'rejected') {
    throw planResult.reason;
  }

  const summary = (summaryResult.status === 'fulfilled' ? summaryResult.value : '') || fallbackSummary;
  const tailoredPlan =
    planResult.status === 'fulfilled' ? normalizePlan(parseJsonObject(planResult.value)) : null;

  return {
    config: { ...setup, summary, plan: tailoredPlan ?? fallbackPlan, targetTurns },
    degraded: !tailoredPlan,
    ...(tailoredPlan
      ? {}
      : { notice: `Could not tailor the plan to your resume — using the standard ${fallbackPlan.roleFamily} interview plan.` }),
  };
}

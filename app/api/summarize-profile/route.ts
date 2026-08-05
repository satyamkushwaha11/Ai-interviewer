import { getAIProvider } from '@/app/lib/ai';
import { buildPlanPrompt, buildProfileSummaryPrompt } from '@/app/lib/prompts';
import { detectRolePlan, normalizePlan } from '@/app/lib/rolePlans';
import type { InterviewMode, InterviewPlan } from '@/app/lib/types';

export const runtime = 'nodejs';

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

export async function POST(request: Request) {
  const { resume, jd, role, mode } = (await request.json()) as {
    resume: string;
    jd?: string;
    role?: string;
    mode: InterviewMode;
  };

  // Deterministic agenda from the static library; used as-is when there is no
  // AI provider, and as the fallback when plan generation fails.
  const fallbackPlan: InterviewPlan = detectRolePlan({ role, jd, resume });

  const fallbackSummary = () =>
    `Candidate:\n- Background: (see resume)\n- Stack: (see resume)\n\n${mode === 'targeted' && jd ? `Role target:\n- Role: ${role || 'n/a'}\n- JD: ${jd.slice(0, 200)}\n` : ''}`;

  const ai = getAIProvider();
  if (!ai) {
    return Response.json({ summary: fallbackSummary(), plan: fallbackPlan });
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
      { temperature: 0.2, maxTokens: 500 }
    ),
    ai.chat(
      [
        { role: 'system', content: buildPlanPrompt() },
        { role: 'user', content: userBlock },
      ],
      { temperature: 0.3, maxTokens: 900, json: true }
    ),
  ]);

  if (summaryResult.status === 'rejected') {
    console.error('summarize-profile summary failed:', summaryResult.reason);
  }
  if (planResult.status === 'rejected') {
    console.error('summarize-profile plan failed:', planResult.reason);
  }

  const summary =
    (summaryResult.status === 'fulfilled' ? summaryResult.value : '') || fallbackSummary();

  const plan =
    (planResult.status === 'fulfilled'
      ? normalizePlan(parseJsonObject(planResult.value))
      : null) ?? fallbackPlan;

  return Response.json({ summary, plan });
}

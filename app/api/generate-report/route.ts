import { after } from 'next/server';
import { getAIProvider } from '@/app/lib/ai';
import { errorResponse, handleRouteError, tooManyRequests } from '@/app/lib/apiError';
import { getSessionForTurn, isUuid, saveReport } from '@/app/lib/db';
import { hit } from '@/app/lib/rateLimit';
import { requireUser } from '@/app/lib/requireUser';
import { buildReportSystemPrompt } from '@/app/lib/prompts';
import { parseHistory, readJson } from '@/app/lib/validate';
import type { InterviewReport, TurnMessage } from '@/app/lib/types';

export const runtime = 'nodejs';

function stubReport(history: TurnMessage[]): InterviewReport {
  const pairs: InterviewReport['perQuestion'] = [];
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].role === 'interviewer' && history[i + 1]?.role === 'candidate') {
      pairs.push({
        question: history[i].content,
        answer: history[i + 1].content,
        feedback: 'Stubbed feedback (no AI provider configured).',
        score: 7,
      });
    }
  }
  return {
    overall: 7,
    summary: 'Stubbed report — set OPENAI_API_KEY or GEMINI_API_KEY for real analysis.',
    communication: { score: 7, notes: 'Stub' },
    knowledge: { score: 7, notes: 'Stub' },
    problemSolving: { score: 7, notes: 'Stub' },
    roleFit: { score: 7, notes: 'Stub' },
    strengths: ['Stub strength'],
    improvements: ['Stub improvement'],
    perQuestion: pairs,
  };
}

/** Store the graded report after the response is sent; never blocks or fails the grade. */
function persistReport(sessionId: string, history: TurnMessage[], report: InterviewReport) {
  after(async () => {
    try {
      await saveReport(sessionId, history, report);
    } catch (err) {
      console.error('[generate-report] failed to save report:', err);
    }
  });
}

/** Grade a finished interview. Body: `{ sessionId, history }`; config comes from the session row. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const limit = hit(`report:${auth.id}`, 10, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const body = (await readJson(request)) as { sessionId?: unknown; history?: unknown } | null;
  if (!body) return errorResponse('bad_request', 'Malformed request body', 'The grading request was malformed.');

  const parsedHistory = parseHistory(body.history);
  if (!parsedHistory.ok) return errorResponse('bad_request', 'invalid history', 'The grading request was malformed.');
  const history = parsedHistory.value;
  if (!history.some((m) => m.role === 'candidate')) {
    return errorResponse('bad_request', 'no answers', 'Nothing to grade — you have not answered any questions yet.');
  }

  const { sessionId } = body;
  if (!isUuid(sessionId)) return errorResponse('bad_request', 'unknown session', 'This interview session is not valid.');

  let session: Awaited<ReturnType<typeof getSessionForTurn>>;
  try {
    session = await getSessionForTurn(auth.id, sessionId);
  } catch (err) {
    return handleRouteError('generate-report:session', err);
  }
  if (!session) return errorResponse('bad_request', 'unknown session', 'This interview session is not valid.');
  const { config } = session;

  const ai = getAIProvider();
  if (!ai) {
    return Response.json({
      report: stubReport(history),
      degraded: true,
      notice: 'No AI provider configured — showing a placeholder report, not a real grade.',
    });
  }

  const transcript = history
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const contextBlock = `Mode: ${config.mode}\nRole: ${config.role || 'n/a'}\nDifficulty: ${config.difficulty}\n\nResume:\n${config.resume}\n\n${config.jd ? `Job description:\n${config.jd}\n\n` : ''}Transcript:\n${transcript}`;

  let raw: string;
  try {
    raw =
      (await ai.chat(
        [
          { role: 'system', content: buildReportSystemPrompt() },
          { role: 'user', content: contextBlock },
        ],
        { temperature: 0.2, maxTokens: 2500, json: true },
      )) || '{}';
  } catch (err) {
    // Don't dress a failure up as a 7/10 grade — surface it so the candidate
    // can retry against the transcript they just earned.
    return handleRouteError('generate-report', err);
  }

  // Models sometimes wrap JSON in ```json fences despite instructions.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let report: InterviewReport;
  try {
    report = JSON.parse(cleaned) as InterviewReport;
  } catch {
    console.error('[generate-report] unparseable model output:', cleaned.slice(0, 300));
    return errorResponse('parse_failed', 'malformed JSON', 'The grader returned an unreadable response. Try again.');
  }

  if (typeof report?.overall !== 'number' || !Array.isArray(report?.perQuestion)) {
    console.error('[generate-report] unexpected report shape:', cleaned.slice(0, 300));
    return errorResponse('parse_failed', 'unexpected shape', 'The grader returned an incomplete report. Try again.');
  }

  persistReport(sessionId, history, report);
  return Response.json({ report });
}

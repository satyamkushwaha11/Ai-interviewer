import { after } from 'next/server';
import { getAIProvider, type ChatMessage } from '@/app/lib/ai';
import { errorResponse, handleRouteError, tooManyRequests } from '@/app/lib/apiError';
import { getSessionForTurn, isUuid, saveTranscript } from '@/app/lib/db';
import { hit } from '@/app/lib/rateLimit';
import { requireUser } from '@/app/lib/requireUser';
import { buildAreaSteer, buildInterviewerSystemPrompt } from '@/app/lib/prompts';
import { parseHistory, readJson } from '@/app/lib/validate';
import type { TurnMessage } from '@/app/lib/types';

export const runtime = 'nodejs';

const END_TOKEN = 'END_INTERVIEW';
const HISTORY_WINDOW = 8; // keep last N messages (~4 turns)
const DEFAULT_TARGET_TURNS = 12;
/** A session may run a little past its target (closing remarks), never far past. */
const OVERRUN_TURNS = 3;

/**
 * Which agenda area this turn belongs to — turns are spread evenly across the
 * plan. Returns -1 when the session has no plan.
 */
function currentAreaIndex(asked: number, target: number, areaCount: number): number {
  if (areaCount <= 0) return -1;
  const perArea = Math.max(1, target / areaCount);
  return Math.min(areaCount - 1, Math.floor(asked / perArea));
}

/**
 * Persist the transcript once the response is on its way. Failures are logged,
 * never surfaced — the candidate's interview must not stall on a DB hiccup.
 */
function persistTranscript(sessionId: string, transcript: TurnMessage[]) {
  after(async () => {
    try {
      await saveTranscript(sessionId, transcript);
    } catch (err) {
      console.error('[interview-turn] failed to save transcript:', err);
    }
  });
}

/**
 * Next interviewer turn. The body is `{ sessionId, history }`; the interview
 * config (resume, plan, rigor…) is read from the session row, so the browser
 * cannot alter it mid-interview and does not re-upload it every turn.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const limit = hit(`turn:${auth.id}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const body = (await readJson(request)) as { sessionId?: unknown; history?: unknown } | null;
  if (!body) {
    return errorResponse('bad_request', 'Malformed request body', 'The interview request was malformed. Restart the session.');
  }
  const parsedHistory = parseHistory(body.history);
  if (!parsedHistory.ok) {
    return errorResponse('bad_request', 'invalid history', 'The session data was incomplete. Restart the session.');
  }
  const history = parsedHistory.value;
  const { sessionId } = body;
  if (!isUuid(sessionId)) {
    return errorResponse('bad_request', 'unknown session', 'This interview session is not valid. Restart the session.');
  }

  // Every turn must belong to a session this user started — that is what makes
  // the free-trial count in POST /api/sessions unskippable.
  let session: Awaited<ReturnType<typeof getSessionForTurn>>;
  try {
    session = await getSessionForTurn(auth.id, sessionId);
  } catch (err) {
    return handleRouteError('interview-turn:session', err);
  }
  if (!session) {
    return errorResponse('bad_request', 'unknown session', 'This interview session is not valid. Restart the session.');
  }
  if (session.status === 'completed') {
    return errorResponse('bad_request', 'session completed', 'This interview has already been graded. Start a new session.');
  }

  const { config } = session;
  const asked = history.filter((m) => m.role === 'interviewer').length;
  const target = config.targetTurns ?? DEFAULT_TARGET_TURNS;
  if (asked > target + OVERRUN_TURNS) {
    return errorResponse('bad_request', 'session over length', 'This interview has run its course. End it to get your report.');
  }

  // No provider configured: keep the app usable with a scripted stand-in.
  const ai = getAIProvider();
  if (!ai) {
    const stub =
      asked === 0
        ? "Hi, thanks for joining. Let's start — can you walk me through your background?"
        : asked >= target
          ? `Thanks for your time, that's all I have.\n${END_TOKEN}`
          : 'Interesting — can you give a specific example of that?';
    const stubQuestion = stub.replace(END_TOKEN, '').trim();
    persistTranscript(sessionId, [...history, { role: 'interviewer', content: stubQuestion }]);
    return Response.json({
      question: stubQuestion,
      done: stub.includes(END_TOKEN),
      degraded: true,
      notice: 'No AI provider configured — running scripted placeholder questions.',
    });
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: buildInterviewerSystemPrompt(config) },
    ...history.slice(-HISTORY_WINDOW).map((m) => ({
      role: (m.role === 'interviewer' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    })),
  ];

  // Appended last so the cached prefix (system + history) stays byte-stable
  // while the model still gets an explicit steer to the current agenda area.
  const areas = Array.isArray(config.plan?.areas) ? config.plan.areas : [];
  const areaIndex = currentAreaIndex(asked, target, areas.length);
  if (areaIndex >= 0 && asked < target) {
    messages.push({ role: 'system', content: buildAreaSteer(areas[areaIndex], areaIndex, areas.length) });
  }

  let raw: string;
  try {
    raw = (await ai.chat(messages, { temperature: 0.7, maxTokens: 200 })).trim();
  } catch (err) {
    // A real status, so the client can toast and offer a retry rather than the
    // interviewer "asking" the candidate about an API key.
    return handleRouteError('interview-turn', err);
  }

  const done = raw.includes(END_TOKEN);
  const question = raw.replace(END_TOKEN, '').trim();
  if (!question) return errorResponse('empty_response', 'Model returned no question text');

  persistTranscript(sessionId, [...history, { role: 'interviewer', content: question }]);
  return Response.json({ question, done });
}

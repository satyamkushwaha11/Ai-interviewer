import { errorResponse, handleRouteError, tooManyRequests } from '@/app/lib/apiError';
import { FREE_INTERVIEW_LIMIT, getUsage } from '@/app/lib/auth';
import { createSession, listSessions } from '@/app/lib/db';
import { prepareInterview } from '@/app/lib/prepare';
import { hit } from '@/app/lib/rateLimit';
import { requireUser } from '@/app/lib/requireUser';
import { parseSetupConfig, readJson } from '@/app/lib/validate';

export const runtime = 'nodejs';

/**
 * Start an interview: validate the setup, enforce the free trial, build the
 * tailored summary + agenda, and store the session row.
 *
 * Returns `{ id, plan, targetTurns, usage, degraded?, notice? }`. The trial is
 * checked before any model call so an exhausted account costs nothing.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const user = auth;

  // Session creation runs two model calls; keep one account from spamming it.
  const limit = hit(`sessions:${user.id}`, 10, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const body = (await readJson(request)) as { config?: unknown } | null;
  if (!body) return errorResponse('bad_request', 'Malformed request body');
  const parsed = parseSetupConfig(body.config);
  if (!parsed.ok) return errorResponse('bad_request', 'invalid config', parsed.message);

  try {
    const usage = await getUsage(user);
    if (usage.remaining !== null && usage.remaining <= 0) {
      return errorResponse(
        'trial_exhausted',
        `used ${usage.used}/${FREE_INTERVIEW_LIMIT}`,
        `You've used all ${FREE_INTERVIEW_LIMIT} free interviews. Upgrade to Pro to keep practising.`,
      );
    }

    const prepared = await prepareInterview(parsed.value);
    const id = await createSession(user.id, prepared.config);

    const used = usage.used + 1;
    return Response.json(
      {
        id,
        plan: prepared.config.plan,
        targetTurns: prepared.config.targetTurns,
        usage: {
          ...usage,
          used,
          remaining: usage.limit === null ? null : Math.max(0, usage.limit - used),
        },
        ...(prepared.degraded ? { degraded: true, notice: prepared.notice } : {}),
      },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError('sessions:create', err);
  }
}

/** The signed-in user's recent sessions (no resume/JD text). */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 20));
  try {
    return Response.json({ sessions: await listSessions(auth.id, limit) });
  } catch (err) {
    return handleRouteError('sessions:list', err);
  }
}

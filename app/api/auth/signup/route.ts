import { errorResponse, handleRouteError, tooManyRequests } from '@/app/lib/apiError';
import { getUsage, hashPassword, normalizeEmail, passwordProblem, publicUser, signIn } from '@/app/lib/auth';
import { createUser, isUniqueViolation } from '@/app/lib/db';
import { clientIp, hit } from '@/app/lib/rateLimit';
import { readJson } from '@/app/lib/validate';

export const runtime = 'nodejs';

/** Email + password registration. Signs the new user in immediately. */
export async function POST(request: Request) {
  // Each signup mints a fresh free trial, so throttle account farming.
  const ip = hit(`signup:ip:${clientIp(request)}`, 10, 60 * 60_000);
  if (!ip.ok) return tooManyRequests(ip.retryAfterSec);

  const body = (await readJson(request)) as { email?: unknown; password?: unknown; name?: unknown } | null;
  if (!body) return errorResponse('bad_request', 'Malformed request body');

  const email = normalizeEmail(body.email);
  if (!email) return errorResponse('bad_request', 'invalid email', 'Enter a valid email address.');
  const problem = passwordProblem(body.password);
  if (problem) return errorResponse('bad_request', 'weak password', problem);
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : null;

  try {
    const user = await createUser({ email, name, passwordHash: await hashPassword(body.password as string) });
    await signIn(user.id);
    // A brand-new account has started nothing; skip the count query.
    const usage = await getUsage(user, 0);
    return Response.json({ user: publicUser(user), usage }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) return errorResponse('email_taken');
    return handleRouteError('auth:signup', err);
  }
}

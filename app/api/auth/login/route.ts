import { errorResponse, handleRouteError, tooManyRequests } from '@/app/lib/apiError';
import { getUsage, normalizeEmail, publicUser, signIn, verifyPassword } from '@/app/lib/auth';
import { findUserByEmail } from '@/app/lib/db';
import { clientIp, hit } from '@/app/lib/rateLimit';
import { readJson } from '@/app/lib/validate';

export const runtime = 'nodejs';

/** Email + password sign-in. */
export async function POST(request: Request) {
  // Per-IP and per-account windows: the first blunts credential stuffing, the
  // second stops a distributed guess at one mailbox.
  const ip = hit(`login:ip:${clientIp(request)}`, 20, 10 * 60_000);
  if (!ip.ok) return tooManyRequests(ip.retryAfterSec);

  const body = (await readJson(request)) as { email?: unknown; password?: unknown } | null;
  if (!body) return errorResponse('bad_request', 'Malformed request body');

  const email = normalizeEmail(body.email);
  if (!email || typeof body.password !== 'string') return errorResponse('invalid_credentials');

  const account = hit(`login:email:${email}`, 10, 10 * 60_000);
  if (!account.ok) return tooManyRequests(account.retryAfterSec);

  try {
    const user = await findUserByEmail(email);
    // Same response whether the email is unknown or the password is wrong, and
    // the hash check still runs for unknown emails so timing does not reveal
    // which it was.
    const ok = await verifyPassword(body.password, user?.password_hash ?? null);
    if (!user || !ok) {
      if (user && !user.password_hash && user.google_sub) {
        return errorResponse('invalid_credentials', 'google-only account', 'This account uses Google sign-in. Continue with Google instead.');
      }
      return errorResponse('invalid_credentials');
    }
    await signIn(user.id);
    return Response.json({ user: publicUser(user), usage: await getUsage(user) });
  } catch (err) {
    return handleRouteError('auth:login', err);
  }
}

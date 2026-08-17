import { cookies } from 'next/headers';
import { safeNextPath } from '@/app/lib/auth';
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_TTL,
  buildAuthorizeUrl,
  isGoogleConfigured,
  newOAuthState,
} from '@/app/lib/google';

export const runtime = 'nodejs';

/** Step 1: `GET /api/auth/google?next=/interview` → redirect to Google. */
export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return Response.redirect(new URL('/login?error=google_unavailable', request.url), 302);
  }
  const next = safeNextPath(new URL(request.url).searchParams.get('next'));
  const state = newOAuthState(next);
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OAUTH_COOKIE_TTL,
  });
  return Response.redirect(buildAuthorizeUrl(request, state), 302);
}

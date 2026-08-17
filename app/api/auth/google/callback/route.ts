import { cookies } from 'next/headers';
import { safeNextPath, signIn } from '@/app/lib/auth';
import { createUser, findUserByEmail, findUserByGoogleSub, linkGoogle } from '@/app/lib/db';
import { OAUTH_COOKIE, fetchGoogleProfile, isGoogleConfigured, type OAuthState } from '@/app/lib/google';

export const runtime = 'nodejs';

/** Step 2: Google sends the user back here with `?code&state`. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => {
    console.error('[auth:google]', reason);
    return Response.redirect(new URL('/login?error=google', request.url), 302);
  };

  if (!isGoogleConfigured()) return fail('not configured');
  if (url.searchParams.get('error')) return fail(`google returned error=${url.searchParams.get('error')}`);

  const store = await cookies();
  let saved: OAuthState | null = null;
  try {
    saved = JSON.parse(store.get(OAUTH_COOKIE)?.value ?? 'null');
  } catch {
    saved = null;
  }
  store.delete(OAUTH_COOKIE);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!saved || !code || !state || state !== saved.state) return fail('state mismatch or missing code');

  try {
    const profile = await fetchGoogleProfile(request, code, saved.verifier);
    if (!profile.email_verified) return fail(`unverified google email ${profile.email}`);
    const email = profile.email.trim().toLowerCase();

    // 1) returning Google user  2) existing password account → link  3) brand new
    let user = await findUserByGoogleSub(profile.sub);
    if (!user) {
      const existing = await findUserByEmail(email);
      user = existing
        ? await linkGoogle(existing.id, profile.sub, { name: profile.name, avatarUrl: profile.picture })
        : await createUser({ email, name: profile.name ?? null, googleSub: profile.sub, avatarUrl: profile.picture ?? null });
    }

    await signIn(user.id);
    return Response.redirect(new URL(safeNextPath(saved.next), request.url), 302);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

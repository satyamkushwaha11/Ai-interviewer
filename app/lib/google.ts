/**
 * Google sign-in via plain OpenID Connect (authorization code + PKCE).
 * No SDK: three HTTPS calls and a couple of cookies.
 *
 * Setup (Google Cloud Console → APIs & Services → Credentials → OAuth client,
 * type "Web application"):
 *   Authorised redirect URI:  <APP_URL>/api/auth/google/callback
 *   .env.local:               GOOGLE_CLIENT_ID=..., GOOGLE_CLIENT_SECRET=...
 */

import { createHash, randomBytes } from 'node:crypto';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Short-lived cookie carrying CSRF state + PKCE verifier between redirect and callback. */
export const OAUTH_COOKIE = 'g_oauth';
export const OAUTH_COOKIE_TTL = 600; // 10 minutes

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Where Google should send the user back. Prefer an explicit APP_URL (needed
 * behind proxies / custom domains); otherwise use the origin of this request.
 */
export function redirectUri(request: Request): string {
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '');
  return `${base}/api/auth/google/callback`;
}

export interface OAuthState {
  state: string;
  verifier: string;
  next: string;
}

export function newOAuthState(next: string): OAuthState {
  return {
    state: randomBytes(16).toString('base64url'),
    verifier: randomBytes(32).toString('base64url'),
    next,
  };
}

export function buildAuthorizeUrl(request: Request, s: OAuthState): string {
  const challenge = createHash('sha256').update(s.verifier).digest('base64url');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    state: s.state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/** Exchange the code for tokens, then fetch the verified profile. Throws on any failure. */
export async function fetchGoogleProfile(request: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(request),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`google token exchange failed (${tokenRes.status}): ${(await tokenRes.text()).slice(0, 300)}`);
  }
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) throw new Error('google token response had no access_token');

  // The access token came straight from Google over TLS, so the userinfo
  // endpoint is authoritative — no need to verify the id_token signature.
  const infoRes = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!infoRes.ok) throw new Error(`google userinfo failed (${infoRes.status})`);
  const profile = (await infoRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) throw new Error('google userinfo missing sub/email');
  return profile;
}

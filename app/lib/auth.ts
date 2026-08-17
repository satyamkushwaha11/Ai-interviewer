/**
 * Authentication: email + password and Google sign-in, both ending in the same
 * opaque session token stored in Neon and carried in an httpOnly cookie.
 *
 * No JWTs and no signing secret: the cookie holds a random 256-bit token, the
 * database holds its SHA-256. Revoking a login is `delete from auth_sessions`.
 */

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { cookies } from 'next/headers';
import {
  countUserInterviews,
  createAuthSession,
  deleteAuthSession,
  findUserBySessionToken,
  type UserRow,
} from './db';

/** `util.promisify` drops the options overload, so wrap by hand. */
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const SESSION_COOKIE = 'ai_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Interviews a free account may start before it must upgrade. */
export const FREE_INTERVIEW_LIMIT = 5;

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/** `scrypt$N$r$p$salt$hash` — parameters travel with the hash so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64'), key.toString('base64')].join('$');
}

/**
 * A throwaway hash checked when the account does not exist (or has no
 * password), so a login attempt costs the same wall-clock time either way and
 * response timing does not reveal which emails are registered.
 */
const DUMMY_HASH_PROMISE = hashPassword('not-a-real-password');

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const hash = stored ?? (await DUMMY_HASH_PROMISE);
  const [scheme, n, r, p, saltB64, hashB64] = hash.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  // A dummy comparison can never succeed; `stored` being null is the tell.
  return stored !== null && key.length === expected.length && timingSafeEqual(key, expected);
}

/** Basic hygiene; the real defence is the hash, not the policy. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'Enter a password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 200) return 'That password is too long.';
  return null;
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const e = email.trim().toLowerCase();
  // Deliberately loose: real validation is the sign-in itself.
  if (e.length < 3 || e.length > 254 || !e.includes('@') || e.startsWith('@') || e.endsWith('@')) return null;
  return e;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Create a DB session for the user and set the cookie. Route Handlers only. */
export async function signIn(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await createAuthSession(hashToken(token), userId, expiresAt);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Revoke the current session (if any) and clear the cookie. Route Handlers only. */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await deleteAuthSession(hashToken(token));
    } catch (err) {
      console.error('[auth] failed to delete session row:', err);
    }
  }
  store.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Safe in Server Components and Route Handlers. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await findUserBySessionToken(hashToken(token));
  } catch (err) {
    console.error('[auth] session lookup failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Plans / free trial
// ---------------------------------------------------------------------------

export interface Usage {
  plan: UserRow['plan'];
  used: number;
  /** null = unlimited */
  limit: number | null;
  /** null = unlimited */
  remaining: number | null;
}

/** `knownUsed` skips the count query when the caller already knows it (e.g. a brand-new account). */
export async function getUsage(user: Pick<UserRow, 'id' | 'plan'>, knownUsed?: number): Promise<Usage> {
  const used = knownUsed ?? (await countUserInterviews(user.id));
  if (user.plan === 'pro') return { plan: user.plan, used, limit: null, remaining: null };
  return {
    plan: user.plan,
    used,
    limit: FREE_INTERVIEW_LIMIT,
    remaining: Math.max(0, FREE_INTERVIEW_LIMIT - used),
  };
}

/** What the browser is allowed to know about the account. */
export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    plan: user.plan,
    hasPassword: Boolean(user.password_hash),
    hasGoogle: Boolean(user.google_sub),
  };
}
export type PublicUser = ReturnType<typeof publicUser>;

/**
 * Only allow redirects back into this app: a same-origin path. Anything else
 * — absolute URLs, protocol-relative `//host`, backslash tricks, or control
 * characters that browsers strip before parsing (`/\t/evil.com` becomes
 * `//evil.com`) — falls back to `/interview`.
 */
export function safeNextPath(value: unknown, fallback = '/interview'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > 2048) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let parsed: URL;
  try {
    parsed = new URL(value, 'http://app.invalid');
  } catch {
    return fallback;
  }
  if (parsed.origin !== 'http://app.invalid') return fallback;
  return parsed.pathname + parsed.search + parsed.hash;
}

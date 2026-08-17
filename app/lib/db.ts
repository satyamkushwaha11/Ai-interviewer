/**
 * Neon Postgres access.
 *
 * Uses the HTTP driver from `@neondatabase/serverless`: one fetch per query, no
 * pooled connections to leak from serverless/edge functions, and it works with
 * `runtime = 'nodejs'` and Vercel alike.
 *
 * DATABASE_URL is required — accounts, logins, and the free-trial counter all
 * live here. `getDb()` throws a clear error when it is missing so a
 * misconfigured deploy fails loudly instead of silently letting everyone in.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { InterviewConfig, InterviewReport, TurnMessage } from './types';

export type Sql = NeonQueryFunction<false, false>;

let client: Sql | undefined;

/** True when DATABASE_URL is set. Cheap; safe to call per request. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lazily-created, module-cached tagged-template SQL client.
 * Usage: `const rows = await sql\`select 1\``.
 */
export function getDb(): Sql {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  client = neon(url);
  return client;
}

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  password_hash: string | null;
  google_sub: string | null;
  plan: 'free' | 'pro';
  created_at: string;
  updated_at: string;
}

const USER_COLUMNS = `
  id, email, name, avatar_url, password_hash, google_sub, plan, created_at, updated_at
`;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const sql = getDb();
  const rows = await sql`
    select ${sql.unsafe(USER_COLUMNS)} from users where email = ${email}
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

export async function findUserByGoogleSub(sub: string): Promise<UserRow | null> {
  const sql = getDb();
  const rows = await sql`
    select ${sql.unsafe(USER_COLUMNS)} from users where google_sub = ${sub}
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

/**
 * Insert a user. Throws with `code === '23505'` (unique_violation) when the
 * email is already registered — callers turn that into a 409.
 */
export async function createUser(input: {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  googleSub?: string | null;
  avatarUrl?: string | null;
}): Promise<UserRow> {
  const sql = getDb();
  const rows = await sql`
    insert into users (email, name, password_hash, google_sub, avatar_url)
    values (
      ${input.email},
      ${input.name ?? null},
      ${input.passwordHash ?? null},
      ${input.googleSub ?? null},
      ${input.avatarUrl ?? null}
    )
    returning ${sql.unsafe(USER_COLUMNS)}
  `;
  return rows[0] as UserRow;
}

/** Attach a Google identity to an existing (password) account with the same email. */
export async function linkGoogle(
  userId: string,
  googleSub: string,
  profile: { name?: string | null; avatarUrl?: string | null },
): Promise<UserRow> {
  const sql = getDb();
  const rows = await sql`
    update users
       set google_sub = ${googleSub},
           name = coalesce(name, ${profile.name ?? null}),
           avatar_url = coalesce(${profile.avatarUrl ?? null}, avatar_url),
           updated_at = now()
     where id = ${userId}::uuid
    returning ${sql.unsafe(USER_COLUMNS)}
  `;
  return rows[0] as UserRow;
}

/** Postgres unique_violation, surfaced by the Neon driver as `err.code`. */
export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505';
}

// ---------------------------------------------------------------------------
// auth_sessions
// ---------------------------------------------------------------------------

/**
 * Insert a session row. Also drops this user's expired sessions so the table
 * does not grow without bound — every sign-in cleans up after itself, and the
 * delete is bounded by the (user_id) index.
 */
export async function createAuthSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
  const sql = getDb();
  await sql`
    insert into auth_sessions (token_hash, user_id, expires_at)
    values (${tokenHash}, ${userId}::uuid, ${expiresAt.toISOString()}::timestamptz)
  `;
  await sql`
    delete from auth_sessions where user_id = ${userId}::uuid and expires_at <= now()
  `;
}

export async function deleteAuthSession(tokenHash: string): Promise<void> {
  const sql = getDb();
  await sql`delete from auth_sessions where token_hash = ${tokenHash}`;
}

/** Resolve a session token hash to its user, ignoring expired sessions. */
export async function findUserBySessionToken(tokenHash: string): Promise<UserRow | null> {
  const sql = getDb();
  const rows = await sql`
    select u.id, u.email, u.name, u.avatar_url, u.password_hash, u.google_sub, u.plan,
           u.created_at, u.updated_at
      from auth_sessions s
      join users u on u.id = s.user_id
     where s.token_hash = ${tokenHash}
       and s.expires_at > now()
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// interview_sessions
// ---------------------------------------------------------------------------

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface SessionRow {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  status: SessionStatus;
  mode: string;
  role: string | null;
  difficulty: string;
  duration_min: number;
  config: InterviewConfig;
  transcript: TurnMessage[];
  report: InterviewReport | null;
  overall_score: number | null;
}

/**
 * Columns safe to send back to the browser. The full `config` holds the raw
 * resume/JD text; only the few display fields below are lifted out of it.
 */
export interface SessionSummary extends Omit<SessionRow, 'config'> {
  /** `config.plan.roleFamily`, e.g. "Backend Engineer". */
  role_family: string | null;
  focus: string | null;
}

/** One row of the history list — no transcript or report payload. */
export interface SessionListItem {
  id: string;
  created_at: string;
  updated_at: string;
  status: SessionStatus;
  mode: string;
  role: string | null;
  role_family: string | null;
  difficulty: string;
  duration_min: number;
  overall_score: number | null;
  /** Messages in the stored transcript (interviewer + candidate). */
  turns: number;
  /** True once at least one candidate answer is stored — i.e. gradable. */
  answered: boolean;
}

const SUMMARY_COLUMNS = `
  id, user_id, created_at, updated_at, status, mode, role, difficulty, duration_min,
  transcript, report, overall_score,
  config->'plan'->>'roleFamily' as role_family,
  config->>'focus' as focus
`;

const LIST_COLUMNS = `
  id, created_at, updated_at, status, mode, role, difficulty, duration_min, overall_score,
  config->'plan'->>'roleFamily' as role_family,
  jsonb_array_length(transcript) as turns,
  (transcript @> '[{"role":"candidate"}]'::jsonb) as answered
`;

/** How many interviews this user has started (any status). Drives the free trial. */
export async function countUserInterviews(userId: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    select count(*)::int as count from interview_sessions where user_id = ${userId}::uuid
  `;
  return (rows[0] as { count: number }).count;
}

/** Insert a new session for the user and return its id. */
export async function createSession(userId: string, config: InterviewConfig): Promise<string> {
  const sql = getDb();
  const rows = await sql`
    insert into interview_sessions (user_id, mode, role, difficulty, duration_min, config)
    values (
      ${userId}::uuid,
      ${config.mode},
      ${config.role ?? null},
      ${config.difficulty},
      ${config.durationMin},
      ${JSON.stringify(config)}::jsonb
    )
    returning id
  `;
  return (rows[0] as { id: string }).id;
}

/**
 * The stored config and status of one of the user's sessions, or null when it
 * does not exist or is not theirs. The interview routes read the config from
 * here rather than trusting whatever the browser sends each turn.
 */
export async function getSessionForTurn(
  userId: string,
  sessionId: string,
): Promise<Pick<SessionRow, 'config' | 'status'> | null> {
  const sql = getDb();
  const rows = await sql`
    select config, status from interview_sessions
     where id = ${sessionId}::uuid and user_id = ${userId}::uuid
  `;
  return (rows[0] as Pick<SessionRow, 'config' | 'status'> | undefined) ?? null;
}

/**
 * Overwrite the transcript with the client's latest full history. The client
 * always sends the whole history, so this is idempotent and tolerates retries
 * and out-of-order arrivals.
 */
export async function saveTranscript(id: string, transcript: TurnMessage[]): Promise<void> {
  const sql = getDb();
  await sql`
    update interview_sessions
       set transcript = ${JSON.stringify(transcript)}::jsonb,
           updated_at = now()
     where id = ${id}::uuid
  `;
}

/** Store the graded report and mark the session complete. */
export async function saveReport(
  id: string,
  transcript: TurnMessage[],
  report: InterviewReport,
): Promise<void> {
  const sql = getDb();
  await sql`
    update interview_sessions
       set transcript = ${JSON.stringify(transcript)}::jsonb,
           report = ${JSON.stringify(report)}::jsonb,
           overall_score = ${report.overall},
           status = 'completed',
           updated_at = now()
     where id = ${id}::uuid
  `;
}

export async function getSession(userId: string, id: string): Promise<SessionSummary | null> {
  const sql = getDb();
  const rows = await sql`
    select ${sql.unsafe(SUMMARY_COLUMNS)}
      from interview_sessions
     where id = ${id}::uuid and user_id = ${userId}::uuid
  `;
  return (rows[0] as SessionSummary | undefined) ?? null;
}

/** The user's most recent sessions, newest first, without transcript/report payloads. */
export async function listSessions(userId: string, limit = 20): Promise<SessionListItem[]> {
  const sql = getDb();
  const rows = await sql`
    select ${sql.unsafe(LIST_COLUMNS)}
      from interview_sessions
     where user_id = ${userId}::uuid
     order by created_at desc
     limit ${limit}
  `;
  return rows as SessionListItem[];
}

/** RFC 4122 shape check so a bad id is a 400, not a Postgres cast error. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

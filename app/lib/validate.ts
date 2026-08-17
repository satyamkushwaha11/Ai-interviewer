/**
 * Request-body validation for the interview routes.
 *
 * Everything the browser sends is untrusted: enums are checked against their
 * allowed values and free text is capped so a hostile or buggy client cannot
 * push a multi-megabyte "resume" into every prompt (and every DB row).
 */

import type { Difficulty, Gender, InterviewConfig, InterviewFocus, InterviewMode, TurnMessage } from './types';

export const LIMITS = {
  resume: 20_000,
  jd: 10_000,
  role: 120,
  /** One spoken/typed answer or one interviewer question. */
  message: 6_000,
  /** Messages per transcript — well above any real 45-minute session. */
  history: 200,
  durationMin: { min: 5, max: 60 },
} as const;

const MODES: readonly InterviewMode[] = ['targeted', 'general'];
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'brutal'];
const FOCUSES: readonly InterviewFocus[] = ['mixed', 'technical', 'behavioral'];
const GENDERS: readonly Gender[] = ['male', 'female'];

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Trimmed string capped at `max`, or '' when not a string. */
function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export type Validated<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * The client-supplied half of an InterviewConfig (what the setup form
 * collects). Server-derived fields — summary, plan, targetTurns — are added by
 * `prepareInterview`, never accepted from the request.
 */
export type SetupConfig = Pick<
  InterviewConfig,
  'mode' | 'resume' | 'jd' | 'role' | 'difficulty' | 'focus' | 'durationMin' | 'gender'
>;

export function parseSetupConfig(raw: unknown): Validated<SetupConfig> {
  const c = (raw ?? {}) as Record<string, unknown>;

  if (!oneOf(c.mode, MODES)) return { ok: false, message: 'Choose a session mode.' };
  if (!oneOf(c.difficulty, DIFFICULTIES)) return { ok: false, message: 'Choose a rigor level.' };
  if (!oneOf(c.gender, GENDERS)) return { ok: false, message: 'Choose an interviewer voice.' };
  const focus: InterviewFocus = oneOf(c.focus, FOCUSES) ? c.focus : 'mixed';

  const durationMin = Number(c.durationMin);
  if (
    !Number.isInteger(durationMin) ||
    durationMin < LIMITS.durationMin.min ||
    durationMin > LIMITS.durationMin.max
  ) {
    return { ok: false, message: 'Choose a duration between 5 and 60 minutes.' };
  }

  const resume = text(c.resume, LIMITS.resume);
  if (resume.length < 20) {
    return { ok: false, message: 'Add your resume before starting — we need it to plan the interview.' };
  }

  const jd = c.mode === 'targeted' ? text(c.jd, LIMITS.jd) : '';
  if (c.mode === 'targeted' && jd.length < 20) {
    return { ok: false, message: 'Paste the job description, or switch to General mode.' };
  }

  const role = text(c.role, LIMITS.role);

  return {
    ok: true,
    value: {
      mode: c.mode,
      resume,
      ...(jd ? { jd } : {}),
      ...(role ? { role } : {}),
      difficulty: c.difficulty,
      focus,
      durationMin,
      gender: c.gender,
    },
  };
}

/** A transcript from the client: role-tagged, non-empty, bounded. */
export function parseHistory(raw: unknown): Validated<TurnMessage[]> {
  if (!Array.isArray(raw)) return { ok: false, message: 'Missing transcript.' };
  if (raw.length > LIMITS.history) return { ok: false, message: 'Transcript is too long.' };

  const history: TurnMessage[] = [];
  for (const item of raw) {
    const m = (item ?? {}) as Record<string, unknown>;
    if (m.role !== 'interviewer' && m.role !== 'candidate') {
      return { ok: false, message: 'Transcript contains an invalid entry.' };
    }
    const content = text(m.content, LIMITS.message);
    if (!content) return { ok: false, message: 'Transcript contains an empty entry.' };
    history.push({ role: m.role, content });
  }
  return { ok: true, value: history };
}

/** Largest JSON body any route accepts. A full 200-message transcript is well under this. */
export const JSON_BODY_LIMIT = 1_000_000;

/**
 * Parse a JSON body, returning null on malformed or oversized input instead of
 * throwing. The body is read in chunks and abandoned as soon as it passes
 * `maxBytes`, so a hostile client cannot make the server buffer gigabytes
 * before validation even runs.
 */
export async function readJson(request: Request, maxBytes = JSON_BODY_LIMIT): Promise<unknown | null> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > maxBytes) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

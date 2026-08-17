import { getDb, isDbConfigured } from '@/app/lib/db';
import { isGoogleConfigured } from '@/app/lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness + database reachability. `db` is one of:
 *   "ok"           — DATABASE_URL set and `select 1` round-tripped
 *   "unconfigured" — no DATABASE_URL (sign-in and interviews will fail)
 *   "error"        — configured but the query failed (see `detail`)
 */
export async function GET() {
  const google = isGoogleConfigured();
  if (!isDbConfigured()) return Response.json({ ok: false, db: 'unconfigured', google }, { status: 503 });

  const started = Date.now();
  try {
    await getDb()`select 1`;
    return Response.json({ ok: true, db: 'ok', google, latencyMs: Date.now() - started });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[health] db check failed:', detail);
    // Driver messages can name hosts and databases; keep them out of a public
    // endpoint in production — the server log has the full text.
    const isProd = process.env.NODE_ENV === 'production';
    return Response.json({ ok: false, db: 'error', google, ...(isProd ? {} : { detail }) }, { status: 503 });
  }
}

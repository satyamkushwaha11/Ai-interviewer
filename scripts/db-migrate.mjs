#!/usr/bin/env node
/**
 * Apply db/schema.sql to the Neon database in DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * Reads .env.local via Node's --env-file (see package.json), so no extra deps.
 * The schema is idempotent (IF NOT EXISTS everywhere), so re-running is safe.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local (Neon dashboard → Connect → connection string).');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(resolve(here, '../db/schema.sql'), 'utf8');

const sql = neon(url);
try {
  // The HTTP driver runs one statement per call, so split on top-level ';'.
  const statements = schema
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
  const [{ count }] = await sql`select count(*)::int as count from interview_sessions`;
  console.log(`✔ schema applied (${statements.length} statements). interview_sessions rows: ${count}`);
} catch (err) {
  console.error('✖ migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}

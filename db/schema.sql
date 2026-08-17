-- AI Interviewer — Neon Postgres schema.
-- Idempotent: safe to run repeatedly via `npm run db:migrate`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users: one row per person, whether they signed up with a password, Google,
-- or both (a Google login with a matching email links to the existing row).
-- ---------------------------------------------------------------------------
create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,          -- always stored lower-cased
  name           text,
  avatar_url     text,
  password_hash  text,                          -- null for Google-only accounts
  google_sub     text unique,                   -- Google's stable subject id
  plan           text not null default 'free'
                 check (plan in ('free', 'pro')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- auth_sessions: opaque bearer tokens in an httpOnly cookie. Only the SHA-256
-- of the token is stored, so a DB leak does not leak live logins.
-- ---------------------------------------------------------------------------
create table if not exists auth_sessions (
  token_hash  text primary key,
  user_id     uuid not null references users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists auth_sessions_user_id_idx on auth_sessions (user_id);

-- ---------------------------------------------------------------------------
-- interview_sessions: one row per interview run.
-- ---------------------------------------------------------------------------
create table if not exists interview_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  status         text not null default 'in_progress'
                 check (status in ('in_progress', 'completed', 'abandoned')),

  -- Denormalised from config for cheap listing/filtering.
  mode           text not null,
  role           text,
  difficulty     text not null,
  duration_min   integer not null,

  -- Full InterviewConfig (resume, JD, plan, summary, targetTurns...).
  config         jsonb not null,
  -- TurnMessage[] — overwritten with the full history on every turn.
  transcript     jsonb not null default '[]'::jsonb,
  -- InterviewReport, set once grading succeeds.
  report         jsonb,
  overall_score  numeric(4, 1)
);

-- For databases created before user_id existed.
alter table interview_sessions
  add column if not exists user_id uuid references users (id) on delete cascade;

create index if not exists interview_sessions_created_at_idx
  on interview_sessions (created_at desc);

create index if not exists interview_sessions_status_idx
  on interview_sessions (status);

-- Free-trial counting: "how many interviews has this user started?"
create index if not exists interview_sessions_user_id_idx
  on interview_sessions (user_id, created_at desc);

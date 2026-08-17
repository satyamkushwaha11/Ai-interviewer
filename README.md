# AI Interviewer

Realistic, voice-first mock interviews. Upload or paste a resume (and optionally
a job description), pick focus/rigor/duration, and a live AI interviewer works
through a role-specific agenda with real follow-ups — then grades you.

## Features

- Resume upload (PDF/DOCX) or paste, plus job-description targeting
- Server-built interview plan tailored to the resume and role
- Voice in / voice out (browser speech recognition; hosted or browser TTS)
- Calibrated rigor (easy → "bar raiser") and focus (technical / behavioral / mixed)
- Structured graded report with per-question feedback
- Accounts (email + password, optional Google), 5-interview free trial

## Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in an AI provider key and `DATABASE_URL`.
4. Create the schema: `npm run db:migrate`
5. Run the development server: `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The app supports either OpenAI or Google Gemini for its text features. Set at
least one provider's API key.

- `AI_PROVIDER` (optional): force a provider — `"openai"` or `"gemini"`. If
  unset, the app auto-selects OpenAI when `OPENAI_API_KEY` is present, otherwise
  Gemini when `GEMINI_API_KEY` is present.
- `OPENAI_API_KEY`: OpenAI API key. Also required for hosted text-to-speech.
- `OPENAI_BASE_URL` (optional): point the OpenAI SDK at an OpenAI-compatible
  gateway such as OpenRouter. Hosted TTS is disabled on gateways; the browser
  voice is used instead.
- `OPENAI_CHAT_MODEL` (optional): defaults to `gpt-4o-mini`.
- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_CHAT_MODEL` (optional): defaults to `gemini-1.5-flash`.

If no key is set, the routes return stubbed responses so the app still runs.

### Database (Neon Postgres — required)

Accounts, logins, and interview sessions (config, live transcript, graded
report) live in [Neon](https://neon.tech). `DATABASE_URL` is required.

1. Create a Neon project and copy the **pooled** connection string
   (Dashboard → Connect). It looks like
   `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`.
2. Add it to `.env.local`: `DATABASE_URL=postgresql://...`
3. Create the schema: `npm run db:migrate` (idempotent; see `db/schema.sql`).
4. Verify: `curl localhost:3000/api/health` → `{"ok":true,"db":"ok",...}`.

### Authentication & free trial

- **Email + password** — scrypt-hashed, stored in `users`.
- **Google sign-in** (optional) — plain OpenID Connect with PKCE, no SDK. Create
  an OAuth client (type *Web application*) in Google Cloud Console with the
  redirect URI `<APP_URL>/api/auth/google/callback`, then set
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. A Google login whose email
  matches an existing password account links to it. Set `APP_URL` if the app
  runs behind a proxy where the request origin is not the public URL.
- Sessions are opaque random tokens in an httpOnly cookie (`ai_session`);
  only the SHA-256 lives in `auth_sessions`. 30-day lifetime.
- **Free trial:** every free account can start `FREE_INTERVIEW_LIMIT` (5)
  interviews (`app/lib/auth.ts`). Enforced server-side in `POST /api/sessions`
  (402 `trial_exhausted`) *before* any model call. `interview-turn` and
  `generate-report` load the interview config from the session row and refuse
  any `sessionId` the user does not own or has already completed, so the limit
  cannot be bypassed and the browser cannot alter the config mid-interview.
  Set `plan = 'pro'` on a `users` row for unlimited.

Pages: `/login`, `/signup`, `/interview`, `/history`, `/history/:id` (the last
three redirect to `/login` when signed out). History shows every session with
its transcript and report; a session that ended without a report can be graded
from its detail page.

Endpoints (all except auth/health require a signed-in user):

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me` — current user + trial usage (`{ user: null }` when signed out)
- `GET /api/auth/google` → Google → `GET /api/auth/google/callback`
- `POST /api/sessions` `{ config }` — validate setup, enforce the trial, build the
  tailored summary + agenda, store the session → `{ id, plan, targetTurns, usage }`
- `GET /api/sessions?limit=20` — your sessions (index rows, no payloads), `GET /api/sessions/:id` — one session: transcript + report
- `POST /api/interview-turn` `{ sessionId, history }` — next question
- `POST /api/generate-report` `{ sessionId, history }` — graded report
- `POST /api/parse-resume` (multipart `file`) — PDF/DOCX → text
- `POST /api/tts` `{ text, gender, difficulty }` — hosted voice (501 on gateways)
- `GET /api/health` — liveness, DB reachability, whether Google is configured

Hardening: request bodies are validated and size-capped (`app/lib/validate.ts`);
auth, session, upload and model routes are rate-limited per IP/user
(`app/lib/rateLimit.ts`, in-process — per instance); baseline security headers
are set in `next.config.ts`. `interview-turn` and `generate-report` persist
after the response is sent (`after()` from `next/server`), so a slow database
never delays the interviewer.

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- OpenAI API / Google Gemini API
- Neon Postgres (`@neondatabase/serverless`)

## Deployment

Deploy on Vercel or any Node.js hosting platform.

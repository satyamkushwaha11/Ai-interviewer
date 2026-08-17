/**
 * One error vocabulary shared by the API routes and the client.
 *
 * Routes return `{ error: { code, message } }` with a real HTTP status; the
 * client maps the code to a toast. Messages are written for a candidate
 * mid-interview, not for a developer reading a stack trace.
 */

export type ApiErrorCode =
  | 'network'
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'provider_error'
  | 'bad_request'
  | 'unsupported_file'
  | 'file_too_large'
  | 'parse_failed'
  | 'empty_response'
  | 'unauthorized'
  | 'invalid_credentials'
  | 'email_taken'
  | 'trial_exhausted'
  | 'too_many_requests'
  | 'not_found'
  | 'server_error';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; detail?: string };
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  network: 503,
  missing_api_key: 503,
  invalid_api_key: 401,
  rate_limited: 429,
  provider_unavailable: 503,
  provider_error: 502,
  bad_request: 400,
  unsupported_file: 415,
  file_too_large: 413,
  parse_failed: 422,
  empty_response: 502,
  unauthorized: 401,
  invalid_credentials: 401,
  email_taken: 409,
  trial_exhausted: 402,
  too_many_requests: 429,
  not_found: 404,
  server_error: 500,
};

export const MESSAGE_BY_CODE: Record<ApiErrorCode, string> = {
  network: 'Network error — check your connection and try again.',
  missing_api_key:
    'No AI provider is configured. Add an OPENAI_API_KEY or GEMINI_API_KEY to .env.local.',
  invalid_api_key: 'The AI provider rejected the API key. Check the key in .env.local.',
  rate_limited: 'The AI provider is rate limiting us. Wait a moment and try again.',
  provider_unavailable: 'The AI provider is temporarily unavailable. Try again shortly.',
  provider_error: 'The AI provider returned an error. Try again.',
  bad_request: 'That request was not valid.',
  unsupported_file: 'Only PDF and DOCX resumes are supported.',
  file_too_large: 'That file is too large. Upload a resume under 10 MB.',
  parse_failed: 'We could not read that file. Try a text-based PDF or DOCX export.',
  empty_response: 'The AI provider returned an empty response. Try again.',
  unauthorized: 'Sign in to continue.',
  invalid_credentials: 'That email and password do not match.',
  email_taken: 'An account with that email already exists. Sign in instead.',
  trial_exhausted: 'You have used all your free interviews. Upgrade to keep practising.',
  too_many_requests: 'Too many requests. Wait a moment and try again.',
  not_found: 'We could not find that.',
  server_error: 'Something went wrong on our side. Try again.',
};

/**
 * Classify a thrown provider/runtime error. Provider SDKs and REST wrappers
 * report the same conditions in different shapes, so match on both status codes
 * and message text.
 */
export function classifyError(err: unknown): ApiErrorCode {
  const message = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  const status = (err as { status?: number; statusCode?: number })?.status ??
    (err as { statusCode?: number })?.statusCode;

  // Database failures are ours, not the AI provider's. The Neon driver throws
  // NeonDbError; a missing DATABASE_URL throws from getDb().
  if ((err as { name?: string })?.name === 'NeonDbError' || message.includes('database_url')) {
    return 'server_error';
  }

  if (status === 401 || status === 403) return 'invalid_api_key';
  if (status === 429) return 'rate_limited';
  if (status === 503 || status === 502) return 'provider_unavailable';

  if (message.includes('api key not valid') || message.includes('incorrect api key') ||
      message.includes('invalid api key') || message.includes('unauthorized') ||
      message.includes('401') || message.includes('403')) {
    return 'invalid_api_key';
  }
  if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
    return 'rate_limited';
  }
  if (message.includes('missing') && message.includes('key')) return 'missing_api_key';
  if (message.includes('fetch failed') || message.includes('econnrefused') ||
      message.includes('enotfound') || message.includes('etimedout') ||
      message.includes('network')) {
    return 'provider_unavailable';
  }
  if (message.includes('timeout') || message.includes('aborted')) return 'provider_unavailable';

  return 'provider_error';
}

/**
 * Build the JSON error response for a route.
 *
 * `message` overrides the generic per-code text when the route knows something
 * more useful — the client shows `message`, so a specific one must go there
 * rather than being buried in `detail`.
 */
export function errorResponse(
  code: ApiErrorCode,
  detail?: string,
  message?: string,
  headers?: HeadersInit,
): Response {
  const body: ApiErrorBody = {
    error: {
      code,
      message: message || MESSAGE_BY_CODE[code],
      ...(detail ? { detail: detail.slice(0, 500) } : {}),
    },
  };
  return Response.json(body, { status: STATUS_BY_CODE[code], headers });
}

/** 429 with a Retry-After header, for the in-process rate limiter. */
export function tooManyRequests(retryAfterSec: number): Response {
  return errorResponse('too_many_requests', undefined, undefined, {
    'Retry-After': String(retryAfterSec),
  });
}

/**
 * Classify then respond, logging the original for the server operator. The
 * raw message (driver/provider internals) is echoed as `detail` only outside
 * production — the candidate-facing `message` is always the friendly one.
 */
export function handleRouteError(context: string, err: unknown): Response {
  const code = classifyError(err);
  console.error(`[${context}] ${code}:`, err);
  const detail =
    process.env.NODE_ENV !== 'production' && err instanceof Error ? err.message : undefined;
  return errorResponse(code, detail);
}

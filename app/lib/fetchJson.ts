import { MESSAGE_BY_CODE, type ApiErrorBody, type ApiErrorCode } from './apiError';

/** A failed API call, already carrying a message fit to show the user. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly detail?: string;

  constructor(code: ApiErrorCode, status: number, message?: string, detail?: string) {
    super(message || MESSAGE_BY_CODE[code]);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 402) return 'trial_exhausted';
  if (status === 404) return 'not_found';
  if (status === 409) return 'email_taken';
  if (status === 413) return 'file_too_large';
  if (status === 415) return 'unsupported_file';
  if (status === 422) return 'parse_failed';
  if (status === 429) return 'rate_limited';
  if (status === 502) return 'provider_error';
  if (status === 503) return 'provider_unavailable';
  if (status >= 500) return 'server_error';
  return 'bad_request';
}

/**
 * fetch + JSON with every failure mode turned into an ApiError:
 * offline/DNS/CORS (fetch rejects), non-2xx, and bodies that are not JSON at
 * all (a proxy's HTML error page, for instance).
 */
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    // fetch only rejects on a transport failure — offline, DNS, CORS, abort.
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError('network', 0, 'The request was cancelled.');
    }
    throw new ApiError('network', 0);
  }

  const raw = await res.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null; // Non-JSON response (gateway HTML, plain text, etc.)
    }
  }

  if (!res.ok) {
    const parsed = body as Partial<ApiErrorBody> | null;
    const code = parsed?.error?.code ?? codeForStatus(res.status);
    const message = parsed?.error?.message ?? MESSAGE_BY_CODE[code];
    throw new ApiError(code, res.status, message, parsed?.error?.detail ?? raw.slice(0, 200));
  }

  if (body === null) {
    throw new ApiError('empty_response', res.status);
  }

  return body as T;
}

/** Any thrown value → a sentence worth showing the user. */
export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return MESSAGE_BY_CODE.server_error;
}

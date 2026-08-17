import { errorResponse } from './apiError';
import { getCurrentUser } from './auth';
import type { UserRow } from './db';

/**
 * Route-handler guard: the signed-in user, or a ready-to-return 401 Response.
 *
 *   const auth = await requireUser();
 *   if (auth instanceof Response) return auth;
 *   const user = auth;
 */
export async function requireUser(): Promise<UserRow | Response> {
  const user = await getCurrentUser();
  return user ?? errorResponse('unauthorized');
}

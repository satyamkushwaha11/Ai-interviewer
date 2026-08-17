import { errorResponse, handleRouteError } from '@/app/lib/apiError';
import { getSession, isUuid } from '@/app/lib/db';
import { requireUser } from '@/app/lib/requireUser';

export const runtime = 'nodejs';

/** One of the signed-in user's sessions: transcript + report (never the raw resume/JD). */
export async function GET(_request: Request, ctx: RouteContext<'/api/sessions/[id]'>) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  if (!isUuid(id)) return errorResponse('bad_request', 'Invalid session id');

  try {
    const session = await getSession(auth.id, id);
    if (!session) return errorResponse('not_found', 'Session not found');
    return Response.json({ session });
  } catch (err) {
    return handleRouteError('sessions:get', err);
  }
}

import { getCurrentUser, getUsage, publicUser } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who am I + free-trial usage. `user: null` when signed out (200, not 401 — the header polls this). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null, usage: null });
  return Response.json({ user: publicUser(user), usage: await getUsage(user) });
}

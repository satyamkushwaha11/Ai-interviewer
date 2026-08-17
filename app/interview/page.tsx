import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUsage, publicUser } from '@/app/lib/auth';
import InterviewFlow from './InterviewFlow';

export const metadata: Metadata = { title: 'Interview — AI Interviewer' };

/**
 * Auth gate for the interview. Reads the session cookie server-side so an
 * anonymous visitor never sees the setup form, and hands the client the
 * free-trial usage so it can render the right state on first paint.
 */
export default async function InterviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/interview');
  const usage = await getUsage(user);
  return <InterviewFlow user={publicUser(user)} initialUsage={usage} />;
}

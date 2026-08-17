import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthForm from '@/app/components/AuthForm';
import { getCurrentUser, safeNextPath } from '@/app/lib/auth';
import { isGoogleConfigured } from '@/app/lib/google';

export const metadata: Metadata = { title: 'Sign in — AI Interviewer' };

type SearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  // Already signed in — nothing to do here.
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="animate-fade-in-up w-full">
      <AuthForm mode="login" next={next} googleEnabled={isGoogleConfigured()} initialError={error} />
    </div>
  );
}

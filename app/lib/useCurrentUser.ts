'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicUser, Usage } from './auth';

interface Me {
  user: PublicUser | null;
  usage: Usage | null;
}

const SIGNED_OUT: Me = { user: null, usage: null };

/** Failures resolve to signed-out rather than throwing. */
async function fetchMe(): Promise<Me> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    return res.ok ? ((await res.json()) as Me) : SIGNED_OUT;
  } catch {
    return SIGNED_OUT;
  }
}

/**
 * Client-side "who am I" for components that live outside a gated server page
 * (e.g. the marketing header). `loading` is true until the first fetch settles.
 */
export function useCurrentUser() {
  const [me, setMe] = useState<Me>(SIGNED_OUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((result) => {
      if (cancelled) return;
      setMe(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setMe(await fetchMe());
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setMe(SIGNED_OUT);
    }
  }, []);

  return { ...me, loading, refresh, signOut };
}

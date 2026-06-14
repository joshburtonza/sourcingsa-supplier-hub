// Supabase browser client. Hardened 2026-06-14 (auth/session stress-test):
// localStorage can be blocked or partitioned (private mode, Safari/Brave ITP,
// corporate policy, privacy extensions). When a write throws, supabase-js would
// silently no-op session persistence, so the session vanishes on the next load
// and the user gets kicked to /login. We probe storage and fall back to an
// in-memory store (warning loudly) instead of failing silently.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function makeStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const probe = '__zah_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    console.warn(
      '[Supabase] localStorage is blocked on this browser — using in-memory session storage. ' +
      'Your sign-in will not persist across reloads here. Try a normal (non-private) window or another browser.',
    );
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k: string, v: string) => { mem.set(k, v); },
      removeItem: (k: string) => { mem.delete(k); },
      clear: () => { mem.clear(); },
      key: (i: number) => Array.from(mem.keys())[i] ?? null,
      get length() { return mem.size; },
    } as Storage;
  }
}

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  // storageKey is left at the default (sb-<ref>-auth-token) so existing
  // signed-in members are NOT logged out by this change.
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: makeStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

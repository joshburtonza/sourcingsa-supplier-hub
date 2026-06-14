// Supabase browser client. Hardened 2026-06-14 — CLOCK-SKEW PROOF.
//
// Why: supabase-js decides a token is "expired" using the DEVICE clock
// (GoTrueClient __loadSession: expires_at*1000 - Date.now() < EXPIRY_MARGIN_MS),
// and getSession() refreshes-on-read whenever it thinks so — regardless of the
// autoRefreshToken setting. A member whose desktop clock runs fast therefore sees
// every freshly-issued token as already expired, so getSession() (called on every
// server RPC by auth-attacher) triggers a refresh STORM — tokens rotate ~5×/second,
// race into "refresh token already used", the session is revoked, and they get
// kicked out, over and over. (louwrens: 132 refreshes in 3h vs 1-2 for everyone
// else; desktop-incognito reproduced, mobile was fine — i.e. purely the device clock.)
//
// Fix: token lifetime is driven by ELAPSED wall-clock time, never the device's
// absolute clock or the token's exp.
//   - autoRefreshToken: false  → no clock-driven background refresh.
//   - getAccessToken()         → returns the cached token, refreshing first only when
//                                it is stale by ELAPSED time (Date.now() deltas, which
//                                are correct even on a wrong-but-stable clock). So every
//                                request carries a token < REFRESH_MS old, and no path
//                                ever does a clock-based refresh-on-read.
//   - one forced refresh on load (the stored token's true age is unknown) + refresh
//     on a wall-clock interval and on focus/visibility/online, all deduped so a storm
//     is impossible (at most one refresh per REFRESH_MS of elapsed time).
//   - refreshSession() is validated SERVER-side, so a wrong client clock can't break it.
//   - localStorage probe + in-memory fallback for blocked/partitioned storage.
import { createClient, type Session } from '@supabase/supabase-js';
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

  // storageKey left at the default (sb-<ref>-auth-token) so existing signed-in
  // members are NOT logged out. autoRefreshToken OFF — see file header; refresh is
  // driven by elapsed wall-clock time instead, so a wrong device clock can't storm.
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: makeStorage(),
      persistSession: true,
      autoRefreshToken: false,
    },
  });
}

// ── Skew-proof session cache + elapsed-time refresh ──
// Refresh the access token if it hasn't been refreshed in the last REFRESH_MS of
// ELAPSED time. 45 min sits safely inside the 60-min server token TTL. Using
// Date.now() *deltas* (not absolute time vs exp) is correct even when the device
// clock is wrong, as long as it isn't actively drifting mid-session — the constant
// offset cancels in the subtraction.
const REFRESH_MS = 45 * 60 * 1000;

let cachedSession: Session | null = null;
let lastRefresh = 0;                       // elapsed-time anchor; 0 = "stale, refresh on next use"
let refreshing: Promise<void> | null = null;
let authManaged = false;

function getClient(): ReturnType<typeof createSupabaseClient> {
  if (!_supabase) {
    _supabase = createSupabaseClient();
    startSkewProofAuth(_supabase);
  }
  return _supabase;
}

// One in-flight refresh at a time (deduped). Server-validated, so it works on a
// wrong client clock. Always advances lastRefresh so the elapsed timer resets even
// if the network call failed (the next attempt waits REFRESH_MS rather than spinning).
function refreshNow(client: ReturnType<typeof createSupabaseClient>): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      await client.auth.refreshSession();
    } catch (e) {
      console.error('[Supabase] token refresh failed', e instanceof Error ? e.message : e);
    } finally {
      lastRefresh = Date.now();
      refreshing = null;
    }
  })();
  return refreshing;
}

function maybeRefresh(): Promise<void> | void {
  if (!cachedSession) return;
  if (Date.now() - lastRefresh < REFRESH_MS) return; // fresh enough by elapsed time
  return refreshNow(getClient());
}

function startSkewProofAuth(client: ReturnType<typeof createSupabaseClient>) {
  if (authManaged || typeof window === 'undefined') return;
  authManaged = true;

  let booted = false;
  client.auth.onAuthStateChange((_event, session) => {
    cachedSession = session;
    if (session) {
      lastRefresh = Date.now();
      // The stored token restored on load has an unknown true age, so force one
      // refresh to start from a known-fresh token. Deferred + once (the resulting
      // TOKEN_REFRESHED re-enters here but booted is already true → no loop).
      if (!booted) {
        booted = true;
        setTimeout(() => { void refreshNow(client); }, 0);
      }
    }
  });

  // Backups for the on-demand refresh in getAccessToken(): keep idle/foreground tabs
  // current, and refresh promptly when a slept/backgrounded tab returns. All deduped
  // + elapsed-gated, so none of these can storm.
  const wake = () => { if (!document.hidden) void maybeRefresh(); };
  setInterval(() => { void maybeRefresh(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
}

/** The current access token, refreshed first if it is stale by elapsed time. Use
 *  this in every hot path (per-request auth headers) instead of getSession() — it
 *  never does a clock-based refresh-on-read, so it cannot storm on a skewed clock,
 *  and it guarantees the returned token is < REFRESH_MS old for an active session. */
export async function getAccessToken(): Promise<string | null> {
  if (!cachedSession) {
    // Cold start before the first auth event seeded the cache. getSession() here can
    // refresh-on-read once on a fast clock, but it runs at most once (then the cache
    // is warm via onAuthStateChange), so it cannot storm.
    try {
      const { data } = await getClient().auth.getSession();
      cachedSession = data.session;
      // The stored token's true age is unknown, so normalize it with one forced
      // refresh (deduped with the boot refresh via the shared `refreshing` promise)
      // rather than assuming it's fresh — otherwise the very first request after a
      // cold load could carry an already-expired token. refreshNow sets lastRefresh.
      if (cachedSession) await refreshNow(getClient());
    } catch (e) {
      console.error('[Supabase] getAccessToken cold-start failed', e instanceof Error ? e.message : e);
    }
  } else {
    await maybeRefresh();
  }
  return cachedSession?.access_token ?? null;
}

/** The cached session object (no network, no clock check). Null until the first
 *  auth event fires (immediate on client init via INITIAL_SESSION). */
export function getCachedSession(): Session | null {
  return cachedSession;
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

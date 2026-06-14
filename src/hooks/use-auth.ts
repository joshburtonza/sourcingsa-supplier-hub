/**
 * Real Supabase Auth wrapper.
 *
 * Replaces the previous localStorage-only "portal session" gate (which
 * stored {email, verifiedAt} after a shared-code check that anyone with
 * the code could pass). This hook subscribes to live session updates,
 * resolves the `approved` / `admin` roles from `user_roles`, exposes the
 * `must_change_password` flag (set on bulk-provisioned accounts that share
 * a temporary password), and a signOut helper that fully clears the session.
 */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  fullName: string | null;
  email: string | null;
  /** True when the user has the `approved` or `admin` role on this account. */
  isApproved: boolean;
  /** True when the user has the `admin` role. */
  isAdmin: boolean;
  /** True when the account was provisioned with a shared temp password and must set its own. */
  mustChangePassword: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

type RoleRow = { role: "admin" | "approved" };

async function fetchRoles(userId: string): Promise<{ approved: boolean; admin: boolean; errored: boolean }> {
  try {
    const { data, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => Promise<{ data: RoleRow[] | null; error: unknown }>;
          };
        };
      }
    )
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) return { approved: false, admin: false, errored: true };
    const rows = data ?? [];
    return {
      approved: rows.some((r) => r.role === "approved" || r.role === "admin"),
      admin: rows.some((r) => r.role === "admin"),
      errored: false,
    };
  } catch {
    return { approved: false, admin: false, errored: true };
  }
}

async function fetchMustChange(userId: string): Promise<boolean> {
  try {
    const { data } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { must_change_password: boolean } | null }>;
            };
          };
        };
      }
    )
      .from("profiles")
      .select("must_change_password")
      .eq("id", userId)
      .maybeSingle();
    return Boolean(data?.must_change_password);
  } catch {
    return false;
  }
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<{ approved: boolean; admin: boolean }>({
    approved: false,
    admin: false,
  });
  const [mustChange, setMustChange] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate(userId: string) {
      let [r, mc] = await Promise.all([fetchRoles(userId), fetchMustChange(userId)]);
      // A transient role-read failure must NOT downgrade an approved member to
      // the pending-approval paywall. Retry once; if still errored, leave the
      // existing role state untouched rather than flipping approved to false.
      if (r.errored) {
        const r2 = await fetchRoles(userId);
        if (!r2.errored) r = r2;
        else console.error("[use-auth] role read failed after retry; leaving role state unchanged");
      }
      if (cancelled) return;
      if (!r.errored) setRoles({ approved: r.approved, admin: r.admin });
      setMustChange(mc);
    }

    const clearAuth = () => {
      setSession(null);
      setRoles({ approved: false, admin: false });
      setMustChange(false);
    };

    // Single source of truth: onAuthStateChange. We deliberately do NOT call
    // supabase.auth.getSession() to seed — getSession() refreshes-on-read against
    // the DEVICE clock and was part of the refresh-storm on skewed clocks (see
    // client.ts header). onAuthStateChange fires INITIAL_SESSION immediately on
    // subscribe with the stored session (no refresh, since autoRefreshToken is off),
    // so it both seeds the initial state and tracks every later change.
    //
    // The callback must stay synchronous and must NOT await a supabase query inside
    // itself: the v2 client holds a lock while running handlers, so a nested call
    // deadlocks (signInWithPassword hangs). Defer DB role reads with setTimeout(0).
    // A null session here is genuine (INITIAL_SESSION-not-logged-in or SIGNED_OUT);
    // TOKEN_REFRESHED always carries a session, so there are no spurious nulls to
    // guard once the clock-driven storm is gone.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      if (s) {
        setSession(s);
        const uid = s.user.id;
        setTimeout(() => {
          if (!cancelled) void hydrate(uid);
        }, 0);
      } else {
        clearAuth();
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    null;

  return {
    session,
    user,
    fullName,
    email: user?.email ?? null,
    isApproved: roles.approved,
    isAdmin: roles.admin,
    mustChangePassword: mustChange,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}

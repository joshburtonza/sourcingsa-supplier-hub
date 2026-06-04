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

async function fetchRoles(userId: string): Promise<{ approved: boolean; admin: boolean }> {
  try {
    const { data } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => Promise<{ data: RoleRow[] | null }>;
          };
        };
      }
    )
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const rows = data ?? [];
    return {
      approved: rows.some((r) => r.role === "approved" || r.role === "admin"),
      admin: rows.some((r) => r.role === "admin"),
    };
  } catch {
    return { approved: false, admin: false };
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
      const [r, mc] = await Promise.all([fetchRoles(userId), fetchMustChange(userId)]);
      if (!cancelled) {
        setRoles(r);
        setMustChange(mc);
      }
    }

    // Seed from the persisted session (Supabase already restored from
    // localStorage at this point, persistSession:true in the client).
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user?.id) await hydrate(data.session.user.id);
      if (!cancelled) setLoading(false);
    });

    // Live subscription, fires on sign-in, sign-out, token refresh, etc.
    //
    // The callback must stay synchronous and must NOT await a supabase query
    // inside itself. The v2 client holds an internal lock while running
    // onAuthStateChange handlers; calling another supabase method here needs
    // the same lock and deadlocks — signInWithPassword never resolves and the
    // UI hangs on "Signing in...". Deferring with setTimeout(0) runs the
    // queries after the lock releases.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      setSession(s);
      if (s?.user?.id) {
        const uid = s.user.id;
        setTimeout(() => {
          void hydrate(uid);
        }, 0);
      } else {
        setRoles({ approved: false, admin: false });
        setMustChange(false);
      }
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

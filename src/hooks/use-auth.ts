/**
 * Real Supabase Auth wrapper.
 *
 * Replaces the previous localStorage-only "portal session" gate (which
 * stored {email, verifiedAt} after a shared-code check that anyone with
 * the code could pass). This hook subscribes to live session updates,
 * resolves the `approved` / `admin` roles from `user_roles`, and exposes
 * a signOut helper that fully clears the session.
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
  loading: boolean;
  signOut: () => Promise<void>;
}

type RoleRow = { role: "admin" | "approved" };

async function fetchRoles(userId: string): Promise<{ approved: boolean; admin: boolean }> {
  try {
    // user_roles isn't in the generated Database type yet (migration is
    // pending application by the team). Cast through unknown so the
    // build doesn't choke before the types are regenerated.
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
    // Pre-migration the table doesn't exist → no roles. Caller treats
    // every signed-in user as "not yet approved" until the migration
    // runs and the user is granted.
    return { approved: false, admin: false };
  }
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<{ approved: boolean; admin: boolean }>({
    approved: false,
    admin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Seed from the persisted session (Supabase already restored from
    // localStorage at this point, persistSession:true in the client).
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        const r = await fetchRoles(data.session.user.id);
        if (!cancelled) setRoles(r);
      }
      if (!cancelled) setLoading(false);
    });

    // Live subscription, fires on sign-in, sign-out, token refresh, etc.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (cancelled) return;
      setSession(s);
      if (s?.user?.id) {
        const r = await fetchRoles(s.user.id);
        if (!cancelled) setRoles(r);
      } else {
        setRoles({ approved: false, admin: false });
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
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}

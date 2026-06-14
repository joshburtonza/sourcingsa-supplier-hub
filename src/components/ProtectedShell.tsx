import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getCachedSession } from "@/integrations/supabase/client";
import { CHECKOUT_URL } from "@/lib/checkout";
import { MemberShell } from "./MemberSidebar";
import { ChangePasswordGate } from "./ChangePasswordGate";

/**
 * Wraps every member-only page. Three render paths:
 *
 *   1. Loading              → spinner
 *   2. Not signed in        → redirect to /login
 *   3. Signed in, NOT approved → "Pending approval" screen pointing
 *      at the Shopify checkout. The user has an auth account but
 *      hasn't paid (no `approved` role on user_roles), so we don't
 *      expose the catalogue UI to them. RLS would block the queries
 *      anyway, this just gives them a clean message instead of an
 *      empty data table.
 *   4. Signed in, approved  → render the page inside MemberShell.
 */
export function ProtectedShell({ children }: { children: ReactNode }) {
  const { session, isApproved, mustChangePassword, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Do NOT bounce on a transient null. useAuth reports session:null briefly during
  // the SSR→hydrate handoff. Re-check the CACHED session once after a short grace
  // before redirecting, and only kick to /login if it is still null. We use the
  // skew-proof cache (getCachedSession), NOT supabase.auth.getSession() — getSession
  // refreshes-on-read against the device clock and was part of the refresh storm
  // that kicked clock-skewed members out (see client.ts header). (2026-06-14)
  useEffect(() => {
    if (loading || session) return;
    let alive = true;
    const t = setTimeout(() => {
      if (alive && !getCachedSession()) navigate({ to: "/login" });
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="grid min-h-screen place-items-center px-4 py-10">
        <div className="relative w-full max-w-md text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 40% at 50% 50%, var(--glow) 0%, transparent 70%)",
            }}
          />
          <div className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 glow-card">
            <h1 className="text-2xl font-semibold text-white">Pending Approval</h1>
            <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
              Your account is ready, but member access unlocks once your one-off
              payment lands. Use the link below to complete the purchase, you&apos;ll
              get in immediately.
            </p>
            <a
              href={CHECKOUT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
            >
              Get Instant Access, R99 once-off
            </a>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/login" }));
              }}
              className="mt-4 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mustChangePassword) {
    return <ChangePasswordGate userId={session.user.id} />;
  }

  return <MemberShell>{children}</MemberShell>;
}

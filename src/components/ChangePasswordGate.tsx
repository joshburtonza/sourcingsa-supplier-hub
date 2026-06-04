import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Blocking screen shown to accounts that were bulk-provisioned with a
 * shared temporary password (`profiles.must_change_password = true`).
 * They cannot reach the member area until they set their own password.
 *
 * On success: updates the auth password, clears the flag on their own
 * profile row (allowed by the "Update own profile" RLS policy), then
 * reloads so useAuth re-hydrates without the gate.
 */
export function ChangePasswordGate({ userId }: { userId: string }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password: pw });
      if (pwErr) {
        setErr(pwErr.message ?? "Could not update password.");
        return;
      }
      const { error: flagErr } = await (
        supabase as unknown as {
          from: (t: string) => {
            update: (v: Record<string, unknown>) => {
              eq: (c: string, val: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        }
      )
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);
      if (flagErr) {
        setErr(flagErr.message ?? "Could not finish setup.");
        return;
      }
      // Reload so useAuth re-reads the cleared flag and renders the app.
      if (typeof window !== "undefined") window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="relative w-full max-w-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 50%, var(--glow) 0%, transparent 70%)",
          }}
        />
        <div className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 glow-card">
          <h1 className="text-2xl font-semibold text-white">Set your password</h1>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Your account was set up with a temporary password. Choose your own
            to continue into the supplier portal.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                New password
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--primary)]"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3 py-2.5 text-sm text-white outline-none focus:border-[color:var(--primary)]"
                placeholder="Re-enter your new password"
              />
            </div>
            {err && (
              <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save password & continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

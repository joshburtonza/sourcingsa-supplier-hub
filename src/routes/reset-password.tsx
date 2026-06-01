import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set new password — ZA Supplier Hub" },
      { name: "description", content: "Set a new password for your ZA Supplier Hub account." },
    ],
  }),
});

/**
 * Landing page for the email link Supabase sends from
 * `resetPasswordForEmail`. The user arrives here with a recovery
 * session already active (Supabase exchanges the URL fragment on
 * page load and fires PASSWORD_RECOVERY on the auth state stream).
 * Once they submit a new password, sign them in and forward to
 * the dashboard.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Wait for Supabase to finish processing the recovery hash. The
  // PASSWORD_RECOVERY event fires after the URL fragment is exchanged
  // for a session; without it `updateUser` 401s.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check the current session in case the event already fired
    // before the listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!password || password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message ?? "Couldn't update your password.");
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, var(--glow) 0%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center pb-6">
          <img src={logo} alt="ZA Supplier Hub" className="h-auto w-[160px] object-contain" />
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 glow-card">
          <h1 className="text-2xl font-semibold text-white">Set a new password</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Pick a new password and you&apos;ll be signed in.
          </p>

          {!ready ? (
            <div className="mt-6 grid place-items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  New password
                </span>
                <div className="relative">
                  <input
                    required
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input focus-glow pr-11"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
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
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Back to{" "}
          <Link to="/login" className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

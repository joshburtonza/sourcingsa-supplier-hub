import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPage,
  head: () => ({
    meta: [
      { title: "Reset your password, ZA Supplier Hub" },
      { name: "description", content: "Reset your ZA Supplier Hub password." },
    ],
  }),
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email) {
      setErr("Enter your account email.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/reset-password`
              : undefined,
        },
      );
      if (error) {
        setErr(error.message ?? "Couldn't send the reset email.");
        return;
      }
      setDone(true);
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
          {done ? (
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-white">Check your email</h1>
              <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
                If an account exists for{" "}
                <span className="font-medium text-white">{email}</span>, we&apos;ve
                sent a reset link. Open it to set a new password.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Enter the email you signed up with, we&apos;ll send you a reset
                link.
              </p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input focus-glow"
                    placeholder="you@example.com"
                  />
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
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Remembered it?{" "}
          <Link to="/login" className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

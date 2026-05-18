import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign In — Supplier Portal" },
      { name: "description", content: "Sign in to access the supplier portal." },
    ],
  }),
});

function Logo() {
  return (
    <div className="mx-auto mb-6 flex flex-col items-center gap-3">
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          boxShadow: "0 0 32px -4px var(--glow-strong)",
        }}
      >
        <div className="h-5 w-5 rounded bg-black/80" />
      </div>
      <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
        Supplier Portal
      </span>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/" });
  }, [authLoading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setInfo(
          "Account created. Check your email to verify, then contact us on WhatsApp for approval.",
        );
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
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
        <Logo />
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 glow-card">
          <h1 className="text-2xl font-semibold text-white">
            {mode === "signin" ? "Welcome Back" : "Request Access"}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {mode === "signin"
              ? "Sign in to access the supplier portal"
              : "Create an account, then message us to be approved"}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Full Name">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input focus-glow"
                  placeholder="Your name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input focus-glow"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input focus-glow pr-11"
                  placeholder="••••••••"
                  minLength={6}
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
            </Field>

            {mode === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                  onClick={() => alert("Contact us on WhatsApp to reset your password.")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {err && (
              <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
                {err}
              </div>
            )}
            {info && (
              <div className="rounded-lg border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 px-3 py-2 text-sm text-[color:var(--foreground)]">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                  onClick={() => { setMode("signup"); setErr(null); setInfo(null); }}
                >
                  Request access
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                  onClick={() => { setMode("signin"); setErr(null); setInfo(null); }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Need access?{" "}
          <a
            href="https://wa.me/27723979430"
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
          >
            Contact us on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}

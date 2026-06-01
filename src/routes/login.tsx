import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CHECKOUT_URL } from "@/lib/checkout";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — ZA Supplier Hub" },
      { name: "description", content: "Member sign in for ZA Supplier Hub." },
    ],
  }),
});

type Tab = "password" | "magic";

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If already signed in, send them straight to the dashboard.
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, session, navigate]);

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (!email || !password) {
      setErr("Email and password are both required.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErr(error.message ?? "Sign in failed.");
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onMagicSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (!email) {
      setErr("Enter your email to receive the magic link.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          // We don't auto-create an account here — magic links only work
          // for existing accounts. Sign-up goes through the dedicated
          // signup flow so the user can pick a password.
          shouldCreateUser: false,
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        },
      });
      if (error) {
        setErr(error.message ?? "Couldn't send the magic link.");
        return;
      }
      setInfo("Magic link sent. Check your inbox.");
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
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Sign in to access the supplier portal.
          </p>

          {/* Tab toggle */}
          <div className="mt-6 flex gap-1 rounded-lg bg-white/5 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("password");
                setErr(null);
                setInfo(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "password"
                  ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
                  : "text-[color:var(--muted-foreground)] hover:text-white"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("magic");
                setErr(null);
                setInfo(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "magic"
                  ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
                  : "text-[color:var(--muted-foreground)] hover:text-white"
              }`}
            >
              Magic link
            </button>
          </div>

          {tab === "password" ? (
            <form onSubmit={onPasswordSubmit} className="mt-5 space-y-4">
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input focus-glow pr-11"
                    placeholder="••••••••"
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

              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"
                >
                  Forgot password?
                </Link>
              </div>

              {err && <ErrorBanner message={err} />}
              {info && <InfoBanner message={info} />}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={onMagicSubmit} className="mt-5 space-y-4">
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

              {err && <ErrorBanner message={err} />}
              {info && <InfoBanner message={info} />}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {busy ? "Sending…" : "Email me a magic link"}
              </button>
              <p className="text-center text-xs text-[color:var(--muted-foreground)]">
                One-click sign-in. No password needed.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 space-y-2 text-center text-sm text-[color:var(--muted-foreground)]">
          <p>
            New here?{" "}
            <Link to="/signup" className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
              Create your account
            </Link>
          </p>
          <p>
            Haven&apos;t paid yet?{" "}
            <a
              href={CHECKOUT_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
            >
              Get instant access — R99 once-off
            </a>
          </p>
        </div>
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
      {message}
    </div>
  );
}

function InfoBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
      {message}
    </div>
  );
}

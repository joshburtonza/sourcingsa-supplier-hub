import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CHECKOUT_URL } from "@/lib/checkout";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Activate your account | ZA Supplier Hub" },
      { name: "description", content: "Set your login details after paying for ZA Supplier Hub access." },
    ],
  }),
});

type RegisterResult = { ok: boolean; error?: string };

function SignupPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsPayment, setNeedsPayment] = useState(false);

  // Already signed in -> straight to the dashboard.
  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  // Prefill the email Shopify redirected with (?email=), if present.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("email");
    if (q) setEmail(q);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setNeedsPayment(false);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErr("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      // Payment-gated account creation. The DB function checks the email is
      // in paid_customers before it will create the account.
      const { data, error } = await (
        supabase as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: RegisterResult | null; error: { message: string } | null }>;
        }
      ).rpc("register_paid_user", {
        p_email: cleanEmail,
        p_password: password,
        p_full_name: fullName.trim() || null,
      });

      if (error) {
        setErr(error.message ?? "Sign up failed.");
        return;
      }

      const result = data ?? { ok: false, error: "unknown" };
      if (!result.ok) {
        if (result.error === "no_payment") {
          setNeedsPayment(true);
          return;
        }
        if (result.error === "exists") {
          setErr("You already have an account with this email. Please sign in instead.");
          return;
        }
        if (result.error === "invalid_input") {
          setErr("Please enter a valid email and a password of at least 8 characters.");
          return;
        }
        setErr("Sign up failed. Please try again.");
        return;
      }

      // Account created + approved. Sign in with the password they just set.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInErr) {
        // Account exists now; if auto sign-in hiccups, send them to login.
        navigate({ to: "/login" });
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
          <h1 className="text-2xl font-semibold text-white">Activate your account</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Paid already? Set your login details below to get instant access.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Full name">
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input focus-glow"
                placeholder="Your name"
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input focus-glow"
                placeholder="The email you paid with"
              />
            </Field>
            <Field label="Password">
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
            </Field>

            {needsPayment && (
              <div className="rounded-lg border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 px-3 py-3 text-sm text-white">
                We couldn&apos;t find a payment for this email. Access is a once-off R99.
                <a
                  href={CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                >
                  Get instant access, R99 once-off →
                </a>
                <span className="mt-2 block text-xs text-[color:var(--muted-foreground)]">
                  Just paid? Give it a moment and try again, or use the exact email from your receipt.
                </span>
              </div>
            )}

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
              {busy ? "Setting up your account…" : "Activate account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Already activated?{" "}
          <Link to="/login" className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[color:var(--muted-foreground)]">
          Haven&apos;t paid yet?{" "}
          <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            Get instant access, R99 once-off
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

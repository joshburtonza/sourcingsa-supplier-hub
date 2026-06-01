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
      { title: "Create your account — ZA Supplier Hub" },
      { name: "description", content: "Create your ZA Supplier Hub member account." },
    ],
  }),
});

function SignupPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email || !password) {
      setErr("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() || null },
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        },
      });
      if (error) {
        setErr(error.message ?? "Sign up failed.");
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
                We&apos;ve sent a confirmation link to{" "}
                <span className="font-medium text-white">{email}</span>. Click it
                to activate your account, then sign in.
              </p>
              <p className="mt-4 text-xs text-[color:var(--muted-foreground)]">
                Member access unlocks once your one-off payment lands.{" "}
                <a
                  href={CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                >
                  Get instant access — R99 once-off →
                </a>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white">Create your account</h1>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                Sign up to access the supplier portal after payment.
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
                    placeholder="you@example.com"
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
                  {busy ? "Creating your account…" : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Already have an account?{" "}
          <Link to="/login" className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]">
            Sign in
          </Link>
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

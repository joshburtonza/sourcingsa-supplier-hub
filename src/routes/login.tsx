import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { verifyAccess } from "@/lib/auth.functions";
import { useAuth, saveSession } from "@/hooks/use-auth";

const CHECKOUT_URL =
  "https://byjbdf-2k.myshopify.com/checkouts/cn/hWNCJl4hotDQ0n05xDu8oPnG/en-za?_r=AQABy_sDJ4mXBCFU5a7Bai_NPknqBl197qdTJdb9mCUKjEM&preview_theme_id=188057157949";

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
      <Link
        to="/"
        className="grid h-14 w-14 place-items-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          boxShadow: "0 0 32px -4px var(--glow-strong)",
        }}
      >
        <div className="h-5 w-5 rounded bg-black/80" />
      </Link>
      <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
        Supplier Portal
      </span>
    </div>
  );
}

type ErrState =
  | null
  | { kind: "code"; message: string }
  | { kind: "no-order"; message: string }
  | { kind: "generic"; message: string };

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const verify = useServerFn(verifyAccess);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ErrState>(null);

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/dashboard" });
  }, [authLoading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await verify({ data: { email, code } });
      if (res.ok) {
        saveSession(res.email);
        navigate({ to: "/dashboard" });
        return;
      }
      if (res.reason === "code") {
        setErr({ kind: "code", message: "Incorrect access code. Check your welcome email." });
      } else {
        setErr({
          kind: "no-order",
          message: "No active subscription found.",
        });
      }
    } catch (e: any) {
      setErr({ kind: "generic", message: e?.message ?? "Something went wrong" });
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
          <h1 className="text-2xl font-semibold text-white">Welcome Back</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Sign in to access the supplier portal
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <Field label="Access Code">
              <div className="relative">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input focus-glow pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)]"
                  aria-label={showPw ? "Hide code" : "Show code"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {err && (
              <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
                {err.message}{" "}
                {err.kind === "no-order" && (
                  <a
                    href={CHECKOUT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline hover:text-[color:var(--primary)]"
                  >
                    Click here to get access.
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Need access?{" "}
          <a
            href={CHECKOUT_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
          >
            Get instant access
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

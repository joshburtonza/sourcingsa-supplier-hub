import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, CheckCircle2, Link2, ShieldCheck, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/account")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Account, Members" },
      { name: "description", content: "Manage your profile and DropStore link." },
    ],
  }),
});

type Profile = {
  full_name: string | null;
  phone: string | null;
  store_name: string | null;
  store_url: string | null;
  id_number: string | null;
  dropstore_email: string | null;
  dropstore_account_id: string | null;
  dropstore_tier: string | null;
  dropstore_linked_at: string | null;
};

const PROFILE_COLS =
  "full_name, phone, store_name, store_url, id_number, dropstore_email, dropstore_account_id, dropstore_tier, dropstore_linked_at";

function Page() {
  const { user, email, isAdmin } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", store_name: "", store_url: "", id_number: "" });
  const [savedAt, setSavedAt] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // DropStore link state
  const [dsEmail, setDsEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[account] profile load failed", error.message);
        return;
      }
      const p = (data as Profile) ?? null;
      setProfile(p);
      if (p) {
        setForm({
          full_name: p.full_name ?? "",
          phone: p.phone ?? "",
          store_name: p.store_name ?? "",
          store_url: p.store_url ?? "",
          id_number: p.id_number ?? "",
        });
      }
      setDsEmail(p?.dropstore_email ?? email ?? "");
    })();
  }, [user?.id, email]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setProfileErr(null);
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          phone: form.phone.trim() || null,
          store_name: form.store_name.trim() || null,
          store_url: form.store_url.trim() || null,
          id_number: form.id_number.trim() || null,
        })
        .eq("id", user.id);
      if (error) {
        setProfileErr(error.message);
        return;
      }
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 3000);
    } finally {
      setSavingProfile(false);
    }
  }

  async function connectDropstore(e: FormEvent) {
    e.preventDefault();
    setLinkMsg(null);
    if (!dsEmail.trim()) {
      setLinkMsg({ ok: false, text: "Enter your DropStore email." });
      return;
    }
    setLinking(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        setLinkMsg({ ok: false, text: "Session expired, sign in again." });
        return;
      }
      const res = await fetch("/api/dropstore/link", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ dropstore_email: dsEmail.trim().toLowerCase() }),
      });
      const out = (await res.json()) as { ok: boolean; error?: string; verified?: boolean; tier?: string | null };
      if (!res.ok || !out.ok) {
        setLinkMsg({ ok: false, text: out.error ?? "Could not link your account." });
        return;
      }
      setLinkMsg({
        ok: true,
        text: out.verified
          ? `Linked and verified${out.tier ? ` · ${out.tier} plan` : ""}.`
          : "Linked. We'll match your order history to this DropStore email.",
      });
      // refresh profile, never null out the just-linked state on a failed
      // read (would show "Linked" while the banner disappears).
      if (user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_COLS)
          .eq("id", user.id)
          .maybeSingle();
        if (error) console.error("[account] profile refetch after link failed", error.message);
        else if (data) setProfile(data as Profile);
      }
    } catch {
      setLinkMsg({ ok: false, text: "Network error, try again." });
    } finally {
      setLinking(false);
    }
  }

  const linked = Boolean(profile?.dropstore_linked_at);

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Your profile, store details and DropStore link.</p>
      </header>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-[color:var(--muted-foreground)]">Signed in as</div>
            <div className="text-white">{email}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--primary)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--primary)]">
            <ShieldCheck className="h-3.5 w-3.5" /> {isAdmin ? "Admin" : "Member · Lifetime access"}
          </span>
        </div>
      </section>

      <form onSubmit={saveProfile} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Store className="h-5 w-5 text-[color:var(--primary)]" /> Your details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className="input focus-glow" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Your name" /></Field>
          <Field label="Phone"><input className="input focus-glow" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="071 234 5678" /></Field>
          <Field label="Store name"><input className="input focus-glow" value={form.store_name} onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))} placeholder="Your store" /></Field>
          <Field label="Store URL"><input className="input focus-glow" value={form.store_url} onChange={(e) => setForm((f) => ({ ...f, store_url: e.target.value }))} placeholder="https://yourstore.co.za" /></Field>
        </div>
        <div className="mt-4 rounded-xl border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/[0.06] p-4">
          <Field label="ID number (for customs clearance)">
            <input
              className="input focus-glow"
              value={form.id_number}
              onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value.replace(/[^0-9]/g, "").slice(0, 13) }))}
              placeholder="13-digit SA ID number"
              inputMode="numeric"
              autoComplete="off"
            />
          </Field>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
            Your orders ship from international suppliers, so South African customs needs the recipient's ID number to
            clear each parcel. Add yours here and we can place and ship your orders. It's used only for customs clearance
            and delivery, stored securely, and never shared beyond the courier and customs authorities.
          </p>
        </div>
        {profileErr && <div className="mt-4 rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{profileErr}</div>}
        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={savingProfile} className="flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save details
          </button>
          {savedAt && <span className="flex items-center gap-1.5 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
        </div>
      </form>

      <form onSubmit={connectDropstore} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Link2 className="h-5 w-5 text-[color:var(--primary)]" /> DropStore account</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Link your DropStore course account so your order history ties to your DropStore profile.
        </p>

        {linked && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Linked to {profile?.dropstore_email}
            {profile?.dropstore_account_id ? " · verified" : ""}
            {profile?.dropstore_tier ? ` · ${profile.dropstore_tier} plan` : ""}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input className="input focus-glow flex-1" type="email" value={dsEmail} onChange={(e) => setDsEmail(e.target.value)} placeholder="your-dropstore@email.com" />
          <button type="submit" disabled={linking} className="flex items-center justify-center gap-2 rounded-lg border border-[color:var(--primary)]/50 bg-[color:var(--primary)]/15 px-5 py-2.5 text-sm font-semibold text-[color:var(--primary)] transition-colors hover:bg-[color:var(--primary)]/25 disabled:opacity-60">
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {linked ? "Update link" : "Connect"}
          </button>
        </div>
        {linkMsg && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${linkMsg.ok ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 text-[color:var(--destructive)]"}`}>
            {linkMsg.text}
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</span>
      {children}
    </label>
  );
}

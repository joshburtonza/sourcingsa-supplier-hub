import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, MessageCircle, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/ProtectedShell";
import { useAuth } from "@/hooks/use-auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/support")({
  component: () => (
    <ProtectedShell>
      <Page />
    </ProtectedShell>
  ),
  head: () => ({
    meta: [
      { title: "Support — Members" },
      { name: "description", content: "Get help with your account and orders." },
    ],
  }),
});

const FAQS = [
  { q: "How do I place an order?", a: "Browse Find Products or Trending Products, choose a product, click Order Now, and enter your customer's delivery details. We ship straight to them and you track it under Orders." },
  { q: "How long does delivery take?", a: "Most local SA orders are processed within 24 hours and delivered to your customer within a few business days, depending on the courier and location." },
  { q: "Can I request a product that's not listed?", a: "Yes. Use the Request a Product page and we'll source it from a vetted SA supplier within 48 hours." },
  { q: "What do I pay?", a: "You pay the cost price shown on each product. You keep whatever your own customer paid you — that difference is your profit." },
  { q: "How do I get help with a specific order?", a: "Open a ticket below with your order ID, or WhatsApp us, and we'll respond during business hours." },
];

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-amber-500/15 text-amber-300" },
  answered: { label: "Answered", cls: "bg-emerald-500/15 text-emerald-300" },
  closed: { label: "Closed", cls: "bg-zinc-500/15 text-zinc-400" },
};

function Page() {
  const { email } = useAuth();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function load() {
    if (!email) return;
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, admin_reply, created_at")
      .order("created_at", { ascending: false });
    if (error) console.error("[tickets] load failed", error.message);
    setTickets((data as Ticket[]) ?? []);
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email) return;
    if (!form.subject.trim() || !form.message.trim()) {
      setErr("Add a subject and a message.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        email: email.toLowerCase(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setForm({ subject: "", message: "" });
      setDone(true);
      void load();
      setTimeout(() => setDone(false), 4000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Support</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Answers to common questions, and a direct line to our team.</p>
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Frequently asked</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-5">
                <Accordion type="single" collapsible>
                  <AccordionItem value={String(i)} className="border-b-0">
                    <AccordionTrigger className="text-left text-white hover:no-underline">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-[color:var(--muted-foreground)]">{f.a}</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>
        </div>

        <div>
          <form onSubmit={onSubmit} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 glow-card">
            <h2 className="text-lg font-semibold text-white">Open a ticket</h2>
            <div className="mt-5 space-y-4">
              <Field label="Subject *">
                <input className="input focus-glow" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Order #A1B2C3 delivery question" required />
              </Field>
              <Field label="Message *">
                <textarea className="input focus-glow min-h-[120px] resize-y" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="How can we help?" required />
              </Field>
              {err && <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}
              {done && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Ticket submitted — we&apos;ll reply by email.
                </div>
              )}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Sending…" : "Submit ticket"}
              </button>
            </div>
          </form>

          {tickets.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Your tickets</h3>
              {tickets.map((t) => {
                const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
                return (
                  <div key={t.id} className="rounded-xl border border-[color:var(--border)] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-white">{t.subject}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    {t.admin_reply && (
                      <p className="mt-2 rounded-lg bg-[color:var(--primary)]/10 px-3 py-2 text-sm text-white">{t.admin_reply}</p>
                    )}
                    <div className="mt-2 text-xs text-[color:var(--muted-foreground)]">{new Date(t.created_at).toLocaleDateString("en-ZA")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <a href="mailto:sa.dropstore@gmail.com" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[color:var(--primary)]">
          <Mail className="h-4 w-4" /> Email Support
        </a>
        <a href="https://wa.me/27723979430" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600">
          <MessageCircle className="h-4 w-4" /> WhatsApp Support
        </a>
      </section>

      <section className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
        <Clock className="h-5 w-5 text-[color:var(--primary)]" />
        <div>
          <div className="text-sm font-semibold text-white">Business hours</div>
          <div className="text-sm text-[color:var(--muted-foreground)]">Monday to Friday, 8am – 6pm SAST</div>
        </div>
      </section>
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

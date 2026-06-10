import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/members")({
  component: () => (
    <AdminShell>
      <AdminMembers />
    </AdminShell>
  ),
  head: () => ({ meta: [{ title: "Members, Admin" }] }),
});

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  store_name: string | null;
  id_number: string | null;
  dropstore_email: string | null;
  dropstore_account_id: string | null;
  created_at: string;
};
type Role = "admin" | "approved";

function AdminMembers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, Set<Role>>>({});
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadErr(null);
    const [{ data: profs, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, store_name, id_number, dropstore_email, dropstore_account_id, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) console.error("[admin/members] profiles failed", pErr.message);
    if (rErr) console.error("[admin/members] roles failed", rErr.message);
    if (pErr || rErr) setLoadErr((pErr ?? rErr)?.message ?? "Failed to load members.");
    setProfiles((profs as Profile[]) ?? []);
    const map: Record<string, Set<Role>> = {};
    for (const r of (roleRows as { user_id: string; role: Role }[]) ?? []) {
      (map[r.user_id] ??= new Set()).add(r.role);
    }
    setRoles(map);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  async function toggleRole(userId: string, role: Role) {
    setBusyId(userId);
    const has = roles[userId]?.has(role);
    const res = has
      ? await supabase.from("user_roles").delete().match({ user_id: userId, role })
      : await supabase.from("user_roles").insert({ user_id: userId, role });
    if (res.error) {
      console.error("[admin/members] toggle failed", res.error.message);
      alert(res.error.message);
    } else {
      setRoles((prev) => {
        const next = { ...prev };
        const set = new Set(next[userId] ?? []);
        if (has) set.delete(role);
        else set.add(role);
        next[userId] = set;
        return next;
      });
    }
    setBusyId(null);
  }

  const filtered = useMemo(
    () => profiles.filter((p) => !search || (p.email ?? "").toLowerCase().includes(search.toLowerCase()) || (p.full_name ?? "").toLowerCase().includes(search.toLowerCase())),
    [profiles, search],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Members</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{profiles.length} accounts. Grant access (approved) or admin rights.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name…" className="input focus-glow pl-11" />
      </div>

      {loadErr && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-4 py-3 text-sm text-[color:var(--destructive)]">
          <span>Couldn&apos;t load members: {loadErr}</span>
          <button onClick={() => void load()} className="rounded-lg border border-[color:var(--destructive)]/40 px-3 py-1 text-xs font-semibold hover:bg-[color:var(--destructive)]/10">Retry</button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {loading ? (
          <div className="grid place-items-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>
        ) : loadErr ? (
          <p className="p-10 text-center text-sm text-[color:var(--muted-foreground)]">Unable to display members right now.</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--muted-foreground)]">No members.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">ID number</th>
                  <th className="px-5 py-3">DropStore</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Access</th>
                  <th className="px-5 py-3">Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const set = roles[p.id] ?? new Set<Role>();
                  const approved = set.has("approved") || set.has("admin");
                  const admin = set.has("admin");
                  return (
                    <tr key={p.id} className="border-t border-[color:var(--border)]">
                      <td className="px-5 py-3">
                        <div className="text-white">{p.email ?? "-"}</div>
                        <div className="text-xs text-[color:var(--muted-foreground)]">{p.full_name || p.store_name || ""}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-[color:var(--muted-foreground)]">{p.id_number || "-"}</td>
                      <td className="px-5 py-3 text-[color:var(--muted-foreground)]">
                        {p.dropstore_email ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Link2 className="h-3.5 w-3.5" /> {p.dropstore_email}{p.dropstore_account_id ? " ✓" : ""}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-5 py-3 text-[color:var(--muted-foreground)]">{new Date(p.created_at).toLocaleDateString("en-ZA")}</td>
                      <td className="px-5 py-3">
                        <Toggle on={approved} disabled={busyId === p.id} onClick={() => toggleRole(p.id, "approved")} label={approved ? "Approved" : "Grant"} />
                      </td>
                      <td className="px-5 py-3">
                        <Toggle on={admin} disabled={busyId === p.id} onClick={() => toggleRole(p.id, "admin")} label={admin ? "Admin" : "Make admin"} icon />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, disabled, label, icon }: { on: boolean; onClick: () => void; disabled?: boolean; label: string; icon?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${on ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)] border border-[color:var(--primary)]/30" : "border border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-white"}`}
    >
      {icon && <ShieldCheck className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

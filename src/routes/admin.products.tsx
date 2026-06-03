import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Plus, X, Loader2, Save, Trash2, Upload, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { fmtZAR, PRODUCT_CATEGORIES } from "@/lib/orders";
import type { Product } from "@/components/ProductCard";

export const Route = createFileRoute("/admin/products")({
  component: () => (
    <AdminShell>
      <AdminProducts />
    </AdminShell>
  ),
  head: () => ({ meta: [{ title: "Products — Admin" }] }),
});

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) console.error("[admin/products] load failed", error.message);
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Products</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{products.length} in catalogue · add, edit, upload images.</p>
        </div>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </header>

      {loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--primary)]" /></div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-[color:var(--muted-foreground)]" />
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">No products yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.image_url || p.images?.[0] || null;
            return (
              <button key={p.id} onClick={() => setEditing(p)} className="group flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] text-left hover:border-[color:var(--primary)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.03]">
                  {img ? <img src={img} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-white/30"><Package className="h-10 w-10" /></div>}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {!p.active && <span className="rounded bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">Hidden</span>}
                    {p.trending && <span className="rounded bg-[color:var(--primary)]/90 px-2 py-0.5 text-[10px] font-semibold text-white">Trending</span>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{p.name}</span>
                  </div>
                  <span className="text-xs text-[color:var(--muted-foreground)]">{p.category}</span>
                  <div className="mt-1 text-sm text-white">{fmtZAR(p.cost_price)} <span className="text-[color:var(--muted-foreground)]">→ {fmtZAR(p.sell_price)}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <ProductEditor
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
          onDeleted={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

const STOCK_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

function ProductEditor({ product, onClose, onSaved, onDeleted }: { product: Product | null; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? PRODUCT_CATEGORIES[0],
    cost_price: product?.cost_price != null ? String(product.cost_price) : "",
    sell_price: product?.sell_price != null ? String(product.sell_price) : "",
    description: product?.description ?? "",
    supplier_note: (product as { supplier_note?: string | null })?.supplier_note ?? "",
    stock_status: product?.stock_status ?? "in_stock",
    image_url: product?.image_url ?? "",
    active: product?.active ?? true,
    trending: product?.trending ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        setErr(`Image upload failed: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setField("image_url", data.publicUrl);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setErr(null);
    const cost = Number(form.cost_price);
    const sell = Number(form.sell_price);
    if (!form.name.trim()) return setErr("Name is required.");
    if (!Number.isFinite(cost) || cost <= 0) return setErr("Enter a valid cost price.");
    if (!Number.isFinite(sell) || sell <= 0) return setErr("Enter a valid sell price.");

    setBusy(true);
    const row = {
      name: form.name.trim(),
      category: form.category,
      cost_price: cost,
      sell_price: sell,
      description: form.description.trim() || null,
      supplier_note: form.supplier_note.trim() || null,
      stock_status: form.stock_status,
      image_url: form.image_url.trim() || null,
      active: form.active,
      trending: form.trending,
    };
    const res = product
      ? await supabase.from("products").update(row).eq("id", product.id)
      : await supabase.from("products").insert(row);
    setBusy(false);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    onSaved();
  }

  async function del() {
    if (!product) return;
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onDeleted();
  }

  const img = form.image_url || null;
  const profit = Number(form.sell_price) - Number(form.cost_price);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative h-full w-full max-w-lg overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--card)] p-6">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        <h2 className="text-xl font-semibold text-white">{product ? "Edit product" : "Add product"}</h2>

        <div className="mt-6 space-y-4">
          {/* Image */}
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-white/[0.03]">
              {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="h-7 w-7 text-white/30" />}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-white hover:border-[color:var(--primary)] disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? "Uploading…" : "Upload image"}
              </button>
              <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">JPG/PNG/WebP.</p>
            </div>
          </div>

          <Field label="Name"><input className="input focus-glow" value={form.name} onChange={(e) => setField("name", e.target.value)} /></Field>
          <Field label="Category">
            <select className="input focus-glow" value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[color:var(--card)]">{c}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost price (R)"><input className="input focus-glow" inputMode="decimal" value={form.cost_price} onChange={(e) => setField("cost_price", e.target.value)} /></Field>
            <Field label="Sell price (R)"><input className="input focus-glow" inputMode="decimal" value={form.sell_price} onChange={(e) => setField("sell_price", e.target.value)} /></Field>
          </div>
          {Number.isFinite(profit) && profit !== 0 && (
            <div className="text-xs text-[color:var(--muted-foreground)]">Member profit: <span className="text-emerald-300">{fmtZAR(profit)}</span></div>
          )}

          <Field label="Description"><textarea className="input focus-glow min-h-[72px] resize-y" value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>
          <Field label="Supplier note (internal)"><input className="input focus-glow" value={form.supplier_note} onChange={(e) => setField("supplier_note", e.target.value)} placeholder="Not shown to members" /></Field>
          <Field label="Stock">
            <select className="input focus-glow" value={form.stock_status} onChange={(e) => setField("stock_status", e.target.value)}>
              {STOCK_OPTIONS.map((s) => <option key={s.value} value={s.value} className="bg-[color:var(--card)]">{s.label}</option>)}
            </select>
          </Field>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm text-white">
              <input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" /> Visible to members
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm text-white">
              <input type="checkbox" checked={form.trending} onChange={(e) => setField("trending", e.target.checked)} className="h-4 w-4 accent-[color:var(--primary)]" /> Trending
            </label>
          </div>

          {err && <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">{err}</div>}

          <div className="flex items-center gap-3 pt-2">
            <button onClick={save} disabled={busy || uploading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {product ? "Save changes" : "Add product"}
            </button>
            {product && (
              <button onClick={del} disabled={busy} className="grid h-11 w-11 place-items-center rounded-lg border border-[color:var(--destructive)]/40 text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10 disabled:opacity-60" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
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

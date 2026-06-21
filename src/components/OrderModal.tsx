import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, CheckCircle2, Truck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtZAR, SA_PROVINCES } from "@/lib/orders";
import {
  getVariantOptions,
  initialVariantSelection,
  isCompleteSelection,
  variantSelectionLabel,
  type VariantSelection,
} from "@/lib/product-variants";
import type { Product } from "./ProductCard";

/**
 * In-app ordering. The member enters THEIR customer's delivery details and
 * the quantity; we record the order via the `place_order` RPC, which
 * computes the amount from the product's real cost price server-side (the
 * client cannot tamper with what is charged/recorded). The hub then ships
 * direct to the customer and the member tracks it under Orders.
 */
export function OrderModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const variantOptions = getVariantOptions(product);
  const [selectedOptions, setSelectedOptions] = useState<VariantSelection>(() => initialVariantSelection(variantOptions));
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_address: "",
    shipping_city: "",
    shipping_province: "",
    shipping_postal_code: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);

  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const total = Number(product.cost_price) * qty;
  const completeSelection = isCompleteSelection(variantOptions, selectedOptions);
  const selectionLabel = variantSelectionLabel(selectedOptions);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.customer_name.trim() || !form.shipping_address.trim() || !form.shipping_city.trim()) {
      setErr("Customer name, address and city are required.");
      return;
    }
    if (!completeSelection) {
      setErr("Choose the product option before placing the order.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("place_order", {
        p_product_id: product.id,
        p_quantity: qty,
        p_customer_name: form.customer_name,
        p_customer_phone: form.customer_phone,
        p_customer_email: form.customer_email,
        p_shipping_address: form.shipping_address,
        p_shipping_city: form.shipping_city,
        p_shipping_province: form.shipping_province,
        p_shipping_postal_code: form.shipping_postal_code,
        p_notes: form.notes,
        p_variant_selection: selectedOptions,
      });
      if (error) {
        setErr(error.message || "Could not place the order. Try again.");
        return;
      }
      setPlacedId(data as string);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-2xl sm:rounded-2xl glow-card">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {placedId ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">Order placed</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--muted-foreground)]">
              We&apos;ll confirm payment and ship <span className="text-white">{product.name}</span> straight
              to your customer. Track its status any time under Orders.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/orders"
                onClick={onClose}
                className="rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn"
              >
                View orders
              </Link>
              <button
                onClick={onClose}
                className="rounded-lg border border-[color:var(--border)] px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Keep browsing
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 pr-8">
              <Truck className="h-5 w-5 text-[color:var(--primary)]" />
              <h2 className="text-lg font-semibold text-white">Order for your customer</h2>
            </div>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              {product.name} · we ship direct to their door anywhere in SA.
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              {/* Quantity + cost */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-white/[0.03] p-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    Your cost · {fmtZAR(product.cost_price)} each
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white">{fmtZAR(total)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-white hover:bg-white/5"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-lg font-semibold text-white">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(999, q + 1))}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-white hover:bg-white/5"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {variantOptions.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {variantOptions.map((option) => (
                    <Field key={option.name} label={`${option.name} *`}>
                      <select
                        className="input focus-glow"
                        value={selectedOptions[option.name] ?? ""}
                        onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [option.name]: e.target.value }))}
                        required
                      >
                        {option.values.map((value) => (
                          <option key={value} value={value} className="bg-[color:var(--card)]">{value}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Customer name *">
                  <input className="input focus-glow" value={form.customer_name} onChange={set("customer_name")} placeholder="Full name" required />
                </Field>
                <Field label="Customer phone">
                  <input className="input focus-glow" value={form.customer_phone} onChange={set("customer_phone")} placeholder="071 234 5678" inputMode="tel" />
                </Field>
              </div>

              <Field label="Delivery address *">
                <textarea className="input focus-glow min-h-[64px] resize-y" value={form.shipping_address} onChange={set("shipping_address")} placeholder="Street address, unit / complex" required />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="City / Town *">
                  <input className="input focus-glow" value={form.shipping_city} onChange={set("shipping_city")} placeholder="City" required />
                </Field>
                <Field label="Province">
                  <select className="input focus-glow" value={form.shipping_province} onChange={set("shipping_province")}>
                    <option value="" className="bg-[color:var(--card)]">Select…</option>
                    {SA_PROVINCES.map((p) => (
                      <option key={p} value={p} className="bg-[color:var(--card)]">{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Postal code">
                  <input className="input focus-glow" value={form.shipping_postal_code} onChange={set("shipping_postal_code")} placeholder="0000" inputMode="numeric" />
                </Field>
              </div>

              <Field label="Order notes (optional)">
                <input className="input focus-glow" value={form.notes} onChange={set("notes")} placeholder="Anything we should know" />
              </Field>

              {err && (
                <div className="rounded-lg border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Placing order…" : `Place order · ${fmtZAR(total)}`}
              </button>
              <p className="text-center text-xs text-[color:var(--muted-foreground)]">
                You pay the cost price, you keep whatever your customer paid you.
                {selectionLabel ? <> Selected: <span className="text-[color:var(--primary)]">{selectionLabel}</span>.</> : null}
              </p>
            </form>
          </>
        )}
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

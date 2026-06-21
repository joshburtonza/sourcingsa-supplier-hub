import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  selectedVariantId,
  variantLineKey,
  variantSelectionLabel,
  type ProductVariantMapEntry,
  type ProductVariantOption,
  type VariantSelection,
} from "@/lib/product-variants";

/**
 * Client-side cart. Members add products + quantities, then check out once on
 * Shopify via a multi-item cart permalink (/cart/v1:q1,v2:q2,...). Persisted to
 * localStorage. SSR-safe: starts empty on the server, hydrates on the client.
 */

const STORE_BASE = "https://byjbdf-2k.myshopify.com/cart/";
const KEY = "zash_cart_v1";
const MAX_QTY = 999;

export type CartItem = {
  id: string;
  productId?: string;
  name: string;
  image: string | null;
  cost_price: number;
  sell_price: number;
  variantId: string;
  qty: number;
  selectedOptions?: VariantSelection;
};

type AddInput = {
  id: string;
  name: string;
  image_url?: string | null;
  images?: string[] | null;
  cost_price: number | string;
  sell_price: number | string;
  checkout_url?: string | null;
  shopify_url?: string | null;
  variant_options?: ProductVariantOption[] | unknown;
  variant_map?: ProductVariantMapEntry[] | unknown;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  totalCost: number;
  add: (p: AddInput, qty?: number, selectedOptions?: VariantSelection) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  checkoutUrl: () => string | null;
  email: string | null;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children, email = null }: { children: ReactNode; email?: string | null }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on the client only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore corrupt cart */
    }
    setHydrated(true);
  }, []);

  // Persist after hydration (never clobber storage with the empty SSR state).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage full / unavailable */
    }
  }, [items, hydrated]);

  const add: CartCtx["add"] = (p, qty = 1, selectedOptions = {}) => {
    const variantId = selectedVariantId(p, selectedOptions);
    if (!variantId) return false;
    const add = Math.max(1, Math.min(qty, MAX_QTY));
    const lineId = variantLineKey(p.id, selectedOptions);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === lineId);
      if (existing) {
        return prev.map((i) =>
          i.id === lineId ? { ...i, qty: Math.min(i.qty + add, MAX_QTY) } : i,
        );
      }
      return [
        ...prev,
        {
          id: lineId,
          productId: p.id,
          name: p.name,
          image: p.image_url ?? p.images?.[0] ?? null,
          cost_price: Number(p.cost_price),
          sell_price: Number(p.sell_price),
          variantId,
          qty: add,
          selectedOptions,
        },
      ];
    });
    setOpen(true);
    return true;
  };

  const setQty: CartCtx["setQty"] = (id, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, MAX_QTY) } : i)),
    );
  };

  const remove: CartCtx["remove"] = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const checkoutUrl = () => {
    if (items.length === 0) return null;
    const base = STORE_BASE + items.map((i) => `${i.variantId}:${i.qty}`).join(",");
    // Carry the member's hub email so the orders/paid webhook can attribute the
    // order to their hub login even if they use a different email at checkout.
    const selections = items
      .map((i) => {
        const label = variantSelectionLabel(i.selectedOptions);
        return label ? `${i.name} (${label}) x${i.qty}` : "";
      })
      .filter(Boolean);
    const note = [email ? `ZASH:${email}` : "", selections.length ? `Selections: ${selections.join("; ")}` : ""]
      .filter(Boolean)
      .join(" | ");
    return note ? `${base}?note=${encodeURIComponent(note)}` : base;
  };

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      totalCost: items.reduce((s, i) => s + i.cost_price * i.qty, 0),
      add,
      setQty,
      remove,
      clear,
      checkoutUrl,
      email,
      open,
      setOpen,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, open, email],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Returns the cart context, or null when rendered outside a CartProvider
 *  (e.g. the admin shell), so consumers can degrade gracefully. */
export function useCart(): CartCtx | null {
  return useContext(Ctx);
}

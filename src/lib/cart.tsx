import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  name: string;
  image: string | null;
  cost_price: number;
  sell_price: number;
  variantId: string;
  qty: number;
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
};

type CartCtx = {
  items: CartItem[];
  count: number;
  totalCost: number;
  add: (p: AddInput, qty?: number) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  checkoutUrl: () => string | null;
  email: string | null;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

function variantFrom(p: AddInput): string | null {
  const u = p.checkout_url ?? p.shopify_url ?? "";
  const m = u.match(/\/cart\/(\d+):/);
  return m ? m[1] : null;
}

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

  const add: CartCtx["add"] = (p, qty = 1) => {
    const variantId = variantFrom(p);
    if (!variantId) return false;
    const add = Math.max(1, Math.min(qty, MAX_QTY));
    setItems((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.id === p.id ? { ...i, qty: Math.min(i.qty + add, MAX_QTY) } : i,
        );
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          image: p.image_url ?? p.images?.[0] ?? null,
          cost_price: Number(p.cost_price),
          sell_price: Number(p.sell_price),
          variantId,
          qty: add,
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
    return email ? `${base}?note=${encodeURIComponent(`ZASH:${email}`)}` : base;
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

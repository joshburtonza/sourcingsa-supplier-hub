import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, ShoppingBag, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { fmtZAR } from "@/lib/orders";
import { variantSelectionLabel } from "@/lib/product-variants";

/** Slide-in cart. Lives in the member shell. */
export function CartDrawer() {
  const cart = useCart();
  if (!cart) return null;
  const { items, open, setOpen, count, totalCost, setQty, remove, checkoutUrl } = cart;

  const checkout = () => {
    const url = checkoutUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShoppingCart className="h-5 w-5 text-[color:var(--primary)]" /> Your order
            {count > 0 && <span className="text-sm font-normal text-[color:var(--muted-foreground)]">({count})</span>}
          </h2>
          <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted-foreground)] hover:text-white" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-[color:var(--muted-foreground)]" />
            <p className="mt-4 text-sm text-[color:var(--muted-foreground)]">Your order is empty. Add products to order them in one go.</p>
            <Link to="/products" onClick={() => setOpen(false)} className="mt-5 rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--primary-hover)] glow-btn">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {items.map((i) => (
                  <div key={i.id} className="flex gap-3 rounded-xl border border-[color:var(--border)] bg-white/[0.02] p-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                      {i.image ? <img src={i.image} alt={i.name} className="h-full w-full object-contain" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium text-white">{i.name}</div>
                      {variantSelectionLabel(i.selectedOptions) && (
                        <div className="mt-0.5 text-xs text-[color:var(--primary)]">{variantSelectionLabel(i.selectedOptions)}</div>
                      )}
                      <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{fmtZAR(i.cost_price)} each</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-[color:var(--border)]">
                          <button onClick={() => setQty(i.id, i.qty - 1)} className="grid h-7 w-7 place-items-center text-[color:var(--muted-foreground)] hover:text-white" aria-label="Decrease">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-white">{i.qty}</span>
                          <button onClick={() => setQty(i.id, i.qty + 1)} className="grid h-7 w-7 place-items-center text-[color:var(--muted-foreground)] hover:text-white" aria-label="Increase">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button onClick={() => remove(i.id)} className="grid h-7 w-7 place-items-center text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold text-white">{fmtZAR(i.cost_price * i.qty)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[color:var(--border)] px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--muted-foreground)]">Your total cost</span>
                <span className="text-lg font-bold text-white">{fmtZAR(totalCost)}</span>
              </div>
              <button
                onClick={checkout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[color:var(--primary-hover)] glow-btn"
              >
                <ShoppingBag className="h-5 w-5" /> Checkout on Shopify
              </button>
              <p className="mt-2 text-center text-xs text-[color:var(--muted-foreground)]">Secure Shopify checkout · all items in one order</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/** Cart button with a live count badge. */
export function CartButton({ className = "" }: { className?: string }) {
  const cart = useCart();
  if (!cart) return null;
  return (
    <button
      onClick={() => cart.setOpen(true)}
      className={`relative grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--foreground)] transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] ${className}`}
      aria-label="Open cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {cart.count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[color:var(--primary)] px-1 text-[10px] font-bold text-white">
          {cart.count}
        </span>
      )}
    </button>
  );
}

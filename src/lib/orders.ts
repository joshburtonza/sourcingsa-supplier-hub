/**
 * Shared order + catalogue metadata used across member and admin views.
 * Single source of truth so a status colour or province list never drifts
 * between two screens.
 */
import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "unfulfilled",
  "processing",
  "in_transit",
  "delivered",
  "cancelled",
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; cls: string; dot: string }
> = {
  unfulfilled: {
    label: "Unfulfilled",
    cls: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
    dot: "bg-amber-400",
  },
  processing: {
    label: "Processing",
    cls: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
    dot: "bg-blue-400",
  },
  in_transit: {
    label: "In Transit",
    cls: "bg-[color:var(--primary)]/15 text-[color:var(--primary)] border border-[color:var(--primary)]/25",
    dot: "bg-[color:var(--primary)]",
  },
  delivered: {
    label: "Delivered",
    cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
    dot: "bg-zinc-400",
  },
};

export const STOCK_META: Record<string, { label: string; cls: string }> = {
  in_stock: { label: "In stock", cls: "text-emerald-300" },
  low_stock: { label: "Low stock", cls: "text-amber-300" },
  out_of_stock: { label: "Out of stock", cls: "text-red-300" },
};

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export const PRODUCT_CATEGORIES = [
  "Fitness",
  "Beauty",
  "Hair Care",
  "Skincare",
  "Jewellery",
  "Home & Kitchen",
  "Tech",
  "Pet Products",
  "Fashion",
  "Men's Grooming",
  "Baby & Mom",
];

export const fmtZAR = (n: number) =>
  `R${Number(n || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

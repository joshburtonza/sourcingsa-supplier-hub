/**
 * Single source of truth for the Shopify checkout link the "Get Instant
 * Access" buttons point at.
 *
 * Reads from `VITE_SHOPIFY_CHECKOUT_URL` (set in `.env`) so the live
 * production checkout URL can be swapped without touching code. Falls
 * back to the original preview-theme draft URL the project was
 * scaffolded with, so dev still works on a fresh clone, but a loud
 * console warning fires if the fallback is in use so it can't silently
 * ship to production pointing at the draft.
 */

const PREVIEW_FALLBACK =
  "https://byjbdf-2k.myshopify.com/checkouts/cn/hWNCJl4hotDQ0n05xDu8oPnG/en-za?_r=AQABy_sDJ4mXBCFU5a7Bai_NPknqBl197qdTJdb9mCUKjEM&preview_theme_id=188057157949"

const fromEnv =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_SHOPIFY_CHECKOUT_URL as string | undefined)
    : undefined

export const CHECKOUT_URL: string = fromEnv?.trim() || PREVIEW_FALLBACK

// Loud warning when running on the preview URL, visible in the console
// during dev + in any production console log so a missed env config is
// noticed before launch.
if (typeof window !== "undefined" && !fromEnv) {
  console.warn(
    "[checkout] Using the preview Shopify checkout URL. Set " +
      "VITE_SHOPIFY_CHECKOUT_URL in your environment with the live " +
      "production checkout URL before going live.",
  )
}

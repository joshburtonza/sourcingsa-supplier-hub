export type VariantSelection = Record<string, string>

export type ProductVariantOption = {
  name: string
  values: string[]
}

export type ProductVariantMapEntry = {
  variant_id?: string | number | null
  id?: string | number | null
  checkout_url?: string | null
  options?: VariantSelection | null
}

export type VariantProduct = {
  name?: string | null
  category?: string | null
  description?: string | null
  checkout_url?: string | null
  shopify_url?: string | null
  variant_options?: ProductVariantOption[] | unknown
  variant_map?: ProductVariantMapEntry[] | unknown
}

function cleanText(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""
}

const COLOR_NAMES = [
  "Black", "White", "Cream", "Beige", "Khaki", "Brown", "Coffee", "Grey", "Gray",
  "Light Grey", "Green", "Sage", "Sage Green", "Mint", "Blue", "Sky Blue", "Navy",
  "Pink", "Blush", "Blush Pink", "Red", "Yellow", "Orange", "Purple", "Coral",
  "Clear", "Gold", "Silver",
]

const NURSING_COVER_COLORS = ["Cream", "Sage Green", "Blush Pink", "Sky Blue", "Light Grey"]

function unique(values: string[]): string[] {
  return [...new Set(values.map(cleanText).filter(Boolean))]
}

function splitValues(raw: string): string[] {
  return unique(
    raw
      .replace(/\bAvailable:\s*.*$/i, "")
      .replace(/\band\b/gi, ",")
      .replace(/\bor\b/gi, ",")
      .split(/[,|;]/)
      .map((v) => v.trim().replace(/\.$/, "")),
  )
}

function inferName(values: string[], haystack: string): string {
  const lower = haystack.toLowerCase()
  const joined = values.join(" ").toLowerCase()
  if (/\b(size|sizes|xs|xxl|newborn|months?|years?)\b/i.test(`${lower} ${joined}`)) return "Size / Age"
  if (/\b(xs|s|m|l|xl|xxl|xxxl|newborn|[0-9]+-[0-9]+m|[0-9]+-[0-9]+y)\b/i.test(joined)) return "Size / Age"
  if (/\b(ml|litre|liter|oz|capacity)\b/.test(`${lower} ${joined}`)) return "Capacity"
  if (/\b(colou?r|multi-?colou?r)\b/.test(lower) || COLOR_NAMES.some((c) => joined.includes(c.toLowerCase()))) return "Color"
  return "Option"
}

function addOption(options: ProductVariantOption[], option: ProductVariantOption): void {
  if (option.values.length < 2 || options.some((o) => o.name === option.name)) return
  options.push(option)
}

function inferredOptions(product: VariantProduct | null | undefined): ProductVariantOption[] {
  const name = cleanText(product?.name)
  const category = cleanText(product?.category)
  const description = cleanText(product?.description)
  const haystack = `${name} ${category} ${description}`
  if (/silicone remote control teething toy/i.test(haystack)) {
    return [{ name: "Color", values: ["Blue", "Black"] }]
  }
  const optionsMatch = description.match(/\bOptions:\s*([^.]*)\./i)
  if (optionsMatch?.[1]) {
    const values = splitValues(optionsMatch[1])
    if (values.length > 1) return [{ name: inferName(values, haystack), values }]
  }

  if (/(nursing|breastfeeding).*(cover|scarf|shawl|cape)/i.test(haystack)) {
    return [{ name: "Color", values: NURSING_COVER_COLORS }]
  }

  const options: ProductVariantOption[] = []

  const availableMatch = description.match(/\bAvailable in\s+([^.;]+)/i)
  if (availableMatch?.[1]) {
    const values = splitValues(availableMatch[1])
    const colourValues = values.filter((v) => COLOR_NAMES.some((c) => c.toLowerCase() === v.toLowerCase()))
    addOption(options, { name: "Color", values: colourValues })
  }

  const appendedAvailableMatch = description.match(/\bAvailable:\s*([^.]*)/i)
  if (appendedAvailableMatch?.[1]) {
    const values = splitValues(appendedAvailableMatch[1]).filter((v) => v.length <= 30)
    addOption(options, { name: inferName(values, haystack), values })
  }

  const foundColours = unique(
    COLOR_NAMES.filter((color) => new RegExp(`\\b${color.replace(/\s+/g, "\\s+")}\\b`, "i").test(haystack)),
  )
  addOption(options, { name: "Color", values: foundColours })

  return options.slice(0, 3)
}

export function getVariantOptions(product: VariantProduct | null | undefined): ProductVariantOption[] {
  const raw = product?.variant_options
  if (!Array.isArray(raw)) return inferredOptions(product)
  const parsed = raw
    .map((o) => {
      if (!o || typeof o !== "object") return null
      const rec = o as Record<string, unknown>
      const name = cleanText(rec.name) || "Option"
      const values = Array.isArray(rec.values)
        ? rec.values.map(cleanText).filter(Boolean)
        : []
      const deduped = unique(values)
      return deduped.length > 1 ? { name, values: deduped } : null
    })
    .filter((o): o is ProductVariantOption => Boolean(o))
    .slice(0, 3)
  return parsed.length ? parsed : inferredOptions(product)
}

export function initialVariantSelection(options: ProductVariantOption[]): VariantSelection {
  return Object.fromEntries(options.map((o) => [o.name, o.values[0] ?? ""]).filter(([, v]) => v))
}

export function isCompleteSelection(options: ProductVariantOption[], selection: VariantSelection): boolean {
  return options.every((o) => Boolean(cleanText(selection[o.name])))
}

export function variantSelectionLabel(selection: VariantSelection | null | undefined): string {
  if (!selection) return ""
  return Object.entries(selection)
    .filter(([, value]) => cleanText(value))
    .map(([name, value]) => `${name}: ${value}`)
    .join(" / ")
}

export function variantLineKey(productId: string, selection: VariantSelection | null | undefined): string {
  const label = variantSelectionLabel(selection)
  return label ? `${productId}::${label}` : productId
}

function checkoutVariantId(url: string | null | undefined): string | null {
  const m = String(url ?? "").match(/\/cart\/(\d+):/)
  return m ? m[1] : null
}

function variantMap(product: VariantProduct | null | undefined): ProductVariantMapEntry[] {
  return Array.isArray(product?.variant_map) ? (product.variant_map as ProductVariantMapEntry[]) : []
}

export function matchingVariant(product: VariantProduct, selection: VariantSelection = {}): ProductVariantMapEntry | null {
  for (const entry of variantMap(product)) {
    const opts = entry.options ?? {}
    const matches = Object.entries(opts).every(([name, value]) => cleanText(selection[name]) === cleanText(value))
    if (matches) return entry
  }
  return null
}

export function selectedVariantId(product: VariantProduct, selection: VariantSelection = {}): string | null {
  const mapped = matchingVariant(product, selection)
  const id = mapped?.variant_id ?? mapped?.id ?? null
  if (id) return String(id)
  return checkoutVariantId(product.checkout_url ?? product.shopify_url)
}

export function checkoutUrlFor(
  product: VariantProduct,
  qty: number,
  selection: VariantSelection = {},
  email?: string | null,
): string | null {
  const mapped = matchingVariant(product, selection)
  const baseUrl = mapped?.checkout_url ?? product.checkout_url ?? product.shopify_url ?? ""
  const variantId = selectedVariantId(product, selection)
  const safeQty = Math.max(1, Math.min(Number(qty) || 1, 999))
  let url = baseUrl

  if (variantId) {
    url = `https://byjbdf-2k.myshopify.com/cart/${variantId}:${safeQty}`
  } else if (url.includes("/cart/")) {
    url = url.replace(/:\d+(?=$|[?&])/, `:${safeQty}`)
  }

  if (!url) return null

  const notes = [email ? `ZASH:${email}` : "", variantSelectionLabel(selection)].filter(Boolean).join(" | ")
  if (!notes) return url
  const join = url.includes("?") ? "&" : "?"
  return `${url}${join}note=${encodeURIComponent(notes)}`
}

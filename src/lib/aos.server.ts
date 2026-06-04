/**
 * Server-only AOS bridge client. Runs inside the Cloudflare Worker (never the
 * browser — it carries the AOS bearer token). Calls the Amalfi AOS Claude
 * endpoint the same way the DropStore AI Studio does.
 *
 * Env (Worker secrets): GOG_BRIDGE_URL (default https://aos.amalfiai.com),
 * GOG_BRIDGE_TOKEN.
 */

const BRIDGE_URL = (process.env.GOG_BRIDGE_URL ?? "https://aos.amalfiai.com").replace(/\/+$/, "");
const BRIDGE_TOKEN = process.env.GOG_BRIDGE_TOKEN ?? "";

export class AosError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/** Ask AOS Claude for a reply. Returns the raw text. */
export async function callAos(system: string, prompt: string, timeoutMs = 90000): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BRIDGE_TOKEN) headers["Authorization"] = `Bearer ${BRIDGE_TOKEN}`;

  let res: Response;
  try {
    res = await fetch(`${BRIDGE_URL}/ai/claude`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        system,
        prompt,
        model: process.env.AOS_MODEL || "claude-sonnet-4-5-20250929",
        max_turns: 1,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new AosError(
      timeout ? "The AI took too long — please try again." : "Couldn't reach the AI service — try again shortly.",
      timeout ? 504 : 502,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[aos] non-2xx", { status: res.status, body: body.slice(0, 200) });
    throw new AosError(`AI service error (${res.status})`, 502);
  }
  const data = (await res.json()) as { reply?: string; text?: string; output?: string };
  return data.reply ?? data.text ?? data.output ?? "";
}

/** Extract the first balanced JSON object from a model reply (tolerates code
 *  fences + surrounding prose). Brace-counting that ignores braces in strings. */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  let s = text.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i += 1) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') inString = !inString;
    if (inString) continue;
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

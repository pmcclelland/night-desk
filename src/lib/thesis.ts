import type { BookThesis, Conviction } from "@/lib/book-view";

export const GUEST_THESIS_KEY = "nightdesk.theses.guest";
export const THESIS_NS = "thesis";

export type ThesisDraft = {
  symbol: string;
  reasoning: string;
  conviction: Conviction | null;
  drivers: string[];
  invalidation: string | null;
  target: number | null;
  last: number | null;
};

const CONVICTIONS: Conviction[] = ["high", "medium", "low"];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asConviction(value: unknown): Conviction | null {
  return CONVICTIONS.find((c) => c === value) ?? null;
}

function asDrivers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((d) => String(d).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return [];
}

export function thesisKey(symbol: string) {
  return symbol.trim().toLowerCase();
}

export function thesisSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function parseDriversInput(raw: string) {
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

export function thesisIsBlank(draft: Pick<ThesisDraft, "reasoning" | "conviction" | "drivers" | "invalidation" | "target">) {
  return (
    !draft.reasoning.trim() &&
    draft.conviction == null &&
    draft.drivers.length === 0 &&
    !draft.invalidation?.trim() &&
    draft.target == null
  );
}

export function normalizeThesis(
  raw: unknown,
  fallback?: { symbol?: string; last?: number | null; now?: string },
): BookThesis | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const symbol = thesisSymbol(asString(row.symbol) || fallback?.symbol || "");
  if (!symbol) return null;
  const now = fallback?.now ?? new Date().toISOString();
  const writtenAt = asString(row.writtenAt) || asString(row.written_at) || asString(row.asOf) || now;
  const updatedAt =
    asString(row.updatedAt) || asString(row.updated_at) || asString(row.lastReviewed) || writtenAt;
  const writtenPrice = asNumber(row.writtenPrice) ?? asNumber(row.written_price) ?? fallback?.last ?? null;
  return {
    symbol,
    reasoning: asString(row.reasoning).trim(),
    conviction: asConviction(row.conviction),
    drivers: asDrivers(row.drivers),
    invalidation: asString(row.invalidation).trim() || null,
    target: asNumber(row.target),
    asOf: asString(row.asOf) || writtenAt,
    lastReviewed: asString(row.lastReviewed) || updatedAt,
    writtenAt,
    updatedAt,
    writtenPrice,
  };
}

export function mergeThesisWrite(existing: BookThesis | null, draft: ThesisDraft, now = new Date().toISOString()): BookThesis {
  const symbol = thesisSymbol(draft.symbol);
  const writtenAt = existing?.writtenAt || existing?.asOf || now;
  const writtenPrice = existing?.writtenPrice ?? draft.last ?? null;
  return {
    symbol,
    reasoning: draft.reasoning.trim(),
    conviction: draft.conviction,
    drivers: draft.drivers,
    invalidation: draft.invalidation?.trim() || null,
    target: draft.target,
    asOf: writtenAt,
    lastReviewed: now,
    writtenAt,
    updatedAt: now,
    writtenPrice,
  };
}

export function thesesFromRows(rows: Array<{ key: string; value: unknown }>): Record<string, BookThesis> {
  const out: Record<string, BookThesis> = {};
  for (const row of rows) {
    const thesis = normalizeThesis(row.value, { symbol: row.key });
    if (thesis) out[thesis.symbol] = thesis;
  }
  return out;
}

function canUseLocalStorage() {
  return typeof localStorage !== "undefined";
}

export function loadGuestTheses(): Record<string, BookThesis> {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(GUEST_THESIS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, BookThesis> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const thesis = normalizeThesis(value, { symbol: key });
      if (thesis) out[thesis.symbol] = thesis;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveGuestTheses(theses: Record<string, BookThesis>) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(GUEST_THESIS_KEY, JSON.stringify(theses));
}

export function upsertGuestThesis(thesis: BookThesis) {
  const next = { ...loadGuestTheses(), [thesis.symbol]: thesis };
  saveGuestTheses(next);
  return next;
}

export function removeGuestThesis(symbol: string) {
  const next = { ...loadGuestTheses() };
  delete next[thesisSymbol(symbol)];
  saveGuestTheses(next);
  return next;
}

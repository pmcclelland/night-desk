import { etDateKey } from "./bar-window.ts";

export const CATALYST_DAYS = 14;
export const DAY_MS = 86_400_000;

export type CatalystKind = "earn" | "exdiv";

export type CatalystRow = {
  id: string;
  symbol: string;
  kind: CatalystKind;
  at: number;
  detail: string | null;
};

export function etDayStart(ts: number): number {
  const key = etDateKey(ts);
  const edt = Date.parse(`${key}T04:00:00.000Z`);
  const est = Date.parse(`${key}T05:00:00.000Z`);
  if (Number.isFinite(edt) && etDateKey(edt) === key && etDateKey(edt - 1) !== key) return edt;
  if (Number.isFinite(est) && etDateKey(est) === key && etDateKey(est - 1) !== key) return est;
  return edt;
}

export function etDayFromKey(key: string): number {
  const t = Date.parse(`${key}T16:00:00.000Z`);
  return Number.isFinite(t) ? etDayStart(t) : Number.NaN;
}

export function catalystWindow(now = Date.now()): { start: number; end: number } {
  const start = etDayStart(now);
  return { start, end: start + CATALYST_DAYS * DAY_MS };
}

export function inCatalystWindow(at: number, now = Date.now()) {
  if (!Number.isFinite(at)) return false;
  const { start, end } = catalystWindow(now);
  return at >= start && at < end;
}

export function etDateKeysInWindow(now = Date.now()): string[] {
  const { start, end } = catalystWindow(now);
  const keys: string[] = [];
  for (let t = start + 12 * 3_600_000; t < end; t += DAY_MS) {
    keys.push(etDateKey(t));
  }
  return keys;
}

export function mergeCatalysts(rows: CatalystRow[]): CatalystRow[] {
  return [...rows].sort(
    (a, b) => a.at - b.at || a.symbol.localeCompare(b.symbol) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
  );
}

export function clipCatalysts(rows: CatalystRow[], now = Date.now()): CatalystRow[] {
  return mergeCatalysts(rows.filter((row) => inCatalystWindow(row.at, now)));
}

export function heldCatalysts(rows: CatalystRow[], symbols: string[]): CatalystRow[] {
  const held = new Set(symbols);
  return rows.filter((row) => held.has(row.symbol));
}

export function seedCatalysts(now = Date.now()): CatalystRow[] {
  const start = catalystWindow(now).start;
  return [
    { id: "seed:AAPL:earn", symbol: "AAPL", kind: "earn", at: start + 5 * DAY_MS, detail: "AMC" },
    { id: "seed:MSFT:exdiv", symbol: "MSFT", kind: "exdiv", at: start + 8 * DAY_MS, detail: "$0.83" },
    { id: "seed:NVDA:earn", symbol: "NVDA", kind: "earn", at: start + 12 * DAY_MS, detail: "BMO" },
  ];
}

export function formatCatalystDay(ts: number) {
  if (!Number.isFinite(ts)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}

export function formatEarnWhen(raw: string | null | undefined) {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "bmo" || v === "time-pre-market" || v === "pre-market") return "BMO";
  if (v === "amc" || v === "time-after-hours" || v === "after-hours") return "AMC";
  return null;
}

export function formatDivDetail(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return `$${rate.toFixed(2)}`;
}

export function kindLabel(kind: CatalystKind) {
  switch (kind) {
    case "earn":
      return "Earn";
    case "exdiv":
      return "Ex-div";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

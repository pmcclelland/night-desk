import { curveWindow } from "./book-curve.ts";
import type { BookThesis, Conviction } from "./book-view.ts";
import type { CurveRange, Order } from "./types.ts";

export const JOURNAL_CAP = 40;

export type JournalSide = "long" | "short";

export type JournalFill = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  t: number;
};

export type ClosedRoundTrip = {
  id: string;
  symbol: string;
  side: JournalSide;
  qty: number;
  entryAt: number;
  entryPrice: number;
  exitAt: number;
  exitPrice: number;
  holdMs: number;
  realizedPl: number;
  realizedPlPct: number;
};

export type JournalRow = ClosedRoundTrip & {
  conviction: Conviction | null;
  snippet: string | null;
};

type OpenLot = {
  id: string;
  symbol: string;
  side: JournalSide;
  qty: number;
  price: number;
  t: number;
};

export function fillsFromOrders(orders: Order[]): JournalFill[] {
  const out: JournalFill[] = [];
  for (const o of orders) {
    if (o.status !== "filled" && o.status !== "partially_filled") continue;
    const qty = o.filledQty > 0 ? o.filledQty : o.qty;
    const price = o.filledAvgPrice;
    const t = o.filledAt ?? o.submittedAt;
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || !Number.isFinite(t)) continue;
    if (o.side !== "buy" && o.side !== "sell") continue;
    out.push({
      id: o.id,
      symbol: o.symbol.toUpperCase(),
      side: o.side,
      qty,
      price: price as number,
      t,
    });
  }
  return out.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
}

export function buildRoundTrips(fills: JournalFill[]): ClosedRoundTrip[] {
  const books = new Map<string, OpenLot[]>();
  const trips: ClosedRoundTrip[] = [];
  let n = 0;

  for (const fill of fills) {
    if (!Number.isFinite(fill.qty) || fill.qty <= 0 || !Number.isFinite(fill.price)) continue;
    const symbol = fill.symbol.toUpperCase();
    const lots = books.get(symbol) ?? [];
    const fillSide: JournalSide = fill.side === "buy" ? "long" : "short";
    let remaining = fill.qty;

    let i = 0;
    while (remaining > 0 && i < lots.length) {
      const lot = lots[i]!;
      if (lot.side === fillSide) {
        i += 1;
        continue;
      }
      const closed = Math.min(remaining, lot.qty);
      const realizedPl =
        lot.side === "long" ? (fill.price - lot.price) * closed : (lot.price - fill.price) * closed;
      const cost = lot.price * closed;
      trips.push({
        id: `${lot.id}:${fill.id}:${n}`,
        symbol,
        side: lot.side,
        qty: closed,
        entryAt: lot.t,
        entryPrice: lot.price,
        exitAt: fill.t,
        exitPrice: fill.price,
        holdMs: Math.max(0, fill.t - lot.t),
        realizedPl,
        realizedPlPct: cost !== 0 ? (realizedPl / Math.abs(cost)) * 100 : 0,
      });
      n += 1;
      lot.qty -= closed;
      remaining -= closed;
      if (lot.qty <= 1e-10) lots.splice(i, 1);
      else i += 1;
    }

    if (remaining > 1e-10) {
      lots.push({
        id: fill.id,
        symbol,
        side: fillSide,
        qty: remaining,
        price: fill.price,
        t: fill.t,
      });
    }
    books.set(symbol, lots);
  }

  return trips.sort((a, b) => b.exitAt - a.exitAt || b.id.localeCompare(a.id));
}

export function clipJournal(trips: ClosedRoundTrip[], range: CurveRange, now = Date.now()): ClosedRoundTrip[] {
  const start = Date.parse(curveWindow(range, now).start);
  return trips.filter((t) => t.exitAt >= start);
}

export function capJournal(trips: ClosedRoundTrip[], cap = JOURNAL_CAP): ClosedRoundTrip[] {
  return trips.slice(0, cap);
}

export function thesisSnippet(reasoning: string): string {
  const line = reasoning.split(/\n/)[0]?.trim() ?? "";
  if (line.length <= 72) return line;
  return `${line.slice(0, 71).trimEnd()}…`;
}

export function attachJournalThesis(
  trips: ClosedRoundTrip[],
  theses: Record<string, BookThesis>,
): JournalRow[] {
  return trips.map((trip) => {
    const thesis = theses[trip.symbol];
    if (!thesis || !thesis.reasoning.trim()) {
      return { ...trip, conviction: null, snippet: null };
    }
    if (thesis.writtenAt) {
      const written = Date.parse(thesis.writtenAt);
      if (Number.isFinite(written) && written > trip.exitAt) {
        return { ...trip, conviction: null, snippet: null };
      }
    }
    return {
      ...trip,
      conviction: thesis.conviction,
      snippet: thesisSnippet(thesis.reasoning),
    };
  });
}

export function formatHold(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const d = Math.round(ms / 86_400_000);
  if (d >= 1) return `${d}d`;
  const h = Math.round(ms / 3_600_000);
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.round(ms / 60_000))}m`;
}

export function formatJournalDay(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}

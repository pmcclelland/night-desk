import type { Account, Position, Venue } from "@/lib/types";

export type Conviction = "high" | "medium" | "low";

export const THESIS_STALE_DAYS = 30;

export interface BookThesis {
  symbol: string;
  reasoning: string;
  conviction: Conviction | null;
  drivers: string[];
  invalidation: string | null;
  target: number | null;
  asOf: string;
  lastReviewed: string;
  writtenAt: string;
  updatedAt: string;
  writtenPrice: number | null;
}

export interface ThesisHealth {
  ageDays: number;
  movePct: number | null;
  stale: boolean;
}

export interface BookPositionRow {
  symbol: string;
  qty: number;
  avgPrice: number;
  last: number;
  marketValue: number;
  costBasis: number;
  weightPct: number;
  dayPl: number;
  dayPlPct: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  thesis: BookThesis | null;
  health: ThesisHealth | null;
}

export interface BookPerformanceView {
  venue: Venue;
  guest: boolean;
  liveFeed: boolean;
  asOf: number;
  equity: number;
  cash: number;
  dayPl: number;
  dayPlPct: number;
  realizedToday: number;
  unrealizedPl: number;
  positions: BookPositionRow[];
}

export function positionDayPlPct(dayPl: number, marketValue: number) {
  const prior = marketValue - dayPl;
  return prior !== 0 ? (dayPl / Math.abs(prior)) * 100 : 0;
}

export function positionWeightPct(marketValue: number, equity: number) {
  return equity !== 0 ? (marketValue / equity) * 100 : 0;
}

export function thesisHealth(
  thesis: BookThesis | null,
  last: number,
  now = Date.now(),
): ThesisHealth | null {
  if (!thesis) return null;
  const written = Date.parse(thesis.writtenAt || thesis.asOf);
  if (!Number.isFinite(written)) return null;
  const ageDays = Math.max(0, (now - written) / 86_400_000);
  const basis = thesis.writtenPrice;
  const movePct =
    basis != null && basis !== 0 && Number.isFinite(last)
      ? ((last - basis) / Math.abs(basis)) * 100
      : null;
  return {
    ageDays,
    movePct,
    stale: ageDays >= THESIS_STALE_DAYS,
  };
}

export function formatThesisAge(ageDays: number) {
  if (!Number.isFinite(ageDays) || ageDays < 0) return "—";
  if (ageDays < 1) {
    const hours = Math.round(ageDays * 24);
    return hours <= 0 ? "<1h" : `${hours}h`;
  }
  return `${Math.floor(ageDays)}d`;
}

export function toBookPerformanceView(input: {
  venue: Venue;
  guest: boolean;
  liveFeed: boolean;
  asOf?: number;
  account: Account;
  positions: Position[];
  theses?: Record<string, BookThesis>;
}): BookPerformanceView {
  const theses = input.theses ?? {};
  const asOf = input.asOf ?? Date.now();
  return {
    venue: input.venue,
    guest: input.guest,
    liveFeed: input.liveFeed,
    asOf,
    equity: input.account.equity,
    cash: input.account.cash,
    dayPl: input.account.dayPl,
    dayPlPct: input.account.dayPlPct,
    realizedToday: input.account.realizedToday,
    unrealizedPl: input.positions.reduce((sum, p) => sum + p.unrealizedPl, 0),
    positions: input.positions.map((p) => {
      const thesis = theses[p.symbol] ?? null;
      return {
        symbol: p.symbol,
        qty: p.qty,
        avgPrice: p.avgPrice,
        last: p.last,
        marketValue: p.marketValue,
        costBasis: p.costBasis,
        weightPct: positionWeightPct(p.marketValue, input.account.equity),
        dayPl: p.dayPl,
        dayPlPct: positionDayPlPct(p.dayPl, p.marketValue),
        unrealizedPl: p.unrealizedPl,
        unrealizedPlPct: p.unrealizedPlPct,
        thesis,
        health: thesisHealth(thesis, p.last, asOf),
      };
    }),
  };
}

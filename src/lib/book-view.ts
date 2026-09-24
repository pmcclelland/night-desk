import type { Account, Position, Venue } from "@/lib/types";

export type Conviction = "high" | "medium" | "low";

export interface BookThesis {
  symbol: string;
  reasoning: string;
  conviction: Conviction | null;
  drivers: string[];
  invalidation: string | null;
  target: number | null;
  asOf: string;
  lastReviewed: string;
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
  return {
    venue: input.venue,
    guest: input.guest,
    liveFeed: input.liveFeed,
    asOf: input.asOf ?? Date.now(),
    equity: input.account.equity,
    cash: input.account.cash,
    dayPl: input.account.dayPl,
    dayPlPct: input.account.dayPlPct,
    realizedToday: input.account.realizedToday,
    unrealizedPl: input.positions.reduce((sum, p) => sum + p.unrealizedPl, 0),
    positions: input.positions.map((p) => ({
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
      thesis: theses[p.symbol] ?? null,
    })),
  };
}

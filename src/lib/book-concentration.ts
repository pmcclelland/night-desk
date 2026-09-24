export const OTHER_SECTOR = "Other";
export const TOP_N = 5;

/** Static GICS-ish map for the desk universe. Unknown tickers fall in Other. */
export const SECTOR_BY_SYMBOL: Record<string, string> = {
  SPY: "Index",
  QQQ: "Index",
  IWM: "Index",
  DIA: "Index",
  AAPL: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  AVGO: "Technology",
  AMD: "Technology",
  ARM: "Technology",
  PLTR: "Technology",
  AMZN: "Consumer",
  TSLA: "Consumer",
  NKE: "Consumer",
  HD: "Consumer",
  GOOGL: "Communication",
  META: "Communication",
  NFLX: "Communication",
  DIS: "Communication",
  JPM: "Financials",
  GS: "Financials",
  COIN: "Financials",
  V: "Financials",
  MA: "Financials",
  XOM: "Energy",
  UNH: "Health",
  COST: "Staples",
  GLD: "Commodities",
  TLT: "Bonds",
  BA: "Industrials",
};

export type ConcentrationLot = {
  symbol: string;
  marketValue: number;
};

export type ConcentrationName = ConcentrationLot & {
  sharePct: number;
};

export type ConcentrationSector = {
  sector: string;
  marketValue: number;
  sharePct: number;
};

export type ConcentrationSnapshot = {
  top5: ConcentrationName[];
  top5SharePct: number;
  sectors: ConcentrationSector[];
  cash: number;
  cashPct: number;
  equity: number;
};

export function sectorOf(symbol: string): string {
  return SECTOR_BY_SYMBOL[symbol] ?? OTHER_SECTOR;
}

export function sharePct(value: number, equity: number) {
  return equity !== 0 ? (value / equity) * 100 : 0;
}

export function barWidthPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.abs(value)));
}

export function formatSharePct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function visibleSectors(sectors: ConcentrationSector[]) {
  return sectors.filter((row) => row.sector !== OTHER_SECTOR || Math.abs(row.marketValue) > 0);
}

function byAbsValueThenName<T extends { marketValue: number }>(
  a: T,
  b: T,
  name: (row: T) => string,
) {
  const d = Math.abs(b.marketValue) - Math.abs(a.marketValue);
  if (d !== 0) return d;
  return name(a).localeCompare(name(b));
}

export function toConcentrationSnapshot(input: {
  equity: number;
  cash: number;
  positions: ConcentrationLot[];
}): ConcentrationSnapshot {
  const ranked = [...input.positions].sort((a, b) => byAbsValueThenName(a, b, (p) => p.symbol));
  const top5 = ranked.slice(0, TOP_N).map((p) => ({
    symbol: p.symbol,
    marketValue: p.marketValue,
    sharePct: sharePct(p.marketValue, input.equity),
  }));
  const bySector = new Map<string, number>();
  for (const p of input.positions) {
    const sector = sectorOf(p.symbol);
    bySector.set(sector, (bySector.get(sector) ?? 0) + p.marketValue);
  }
  const sectors = visibleSectors(
    [...bySector.entries()].map(([sector, marketValue]) => ({
      sector,
      marketValue,
      sharePct: sharePct(marketValue, input.equity),
    })),
  ).sort((a, b) => byAbsValueThenName(a, b, (row) => row.sector));

  return {
    top5,
    top5SharePct: top5.reduce((sum, p) => sum + p.sharePct, 0),
    sectors,
    cash: input.cash,
    cashPct: sharePct(input.cash, input.equity),
    equity: input.equity,
  };
}

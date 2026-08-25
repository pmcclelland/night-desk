export type Venue = "sim" | "alpaca-paper" | "alpaca-live";

export type TapeSource = "alpaca" | "yahoo" | "mixed" | "seed";

export type BarSource = "alpaca" | "yahoo" | "seed";

export type BarRange = "1D" | "5D" | "1M" | "6M" | "1Y";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type TimeInForce = "day" | "gtc" | "ioc";
export type OrderStatus =
  | "new"
  | "accepted"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "rejected"
  | "expired";

export type OrderSource = "manual" | "bot" | "strategy";

export type MarketSession = "pre" | "open" | "post" | "closed";

export interface Creds {
  keyId: string;
  secret: string;
}

export interface Quote {
  symbol: string;
  name: string;
  last: number;
  prevClose: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  bid: number;
  ask: number;
  ts: number;
}

export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Account {
  cash: number;
  equity: number;
  buyingPower: number;
  lastEquity: number;
  longValue: number;
  shortValue: number;
  dayPl: number;
  dayPlPct: number;
  realizedToday: number;
  status: string;
  patternDayTrader: boolean;
  daytradeCount: number;
  tradingBlocked: boolean;
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
  last: number;
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  dayPl: number;
}

export interface Order {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  filledQty: number;
  limitPrice?: number;
  stopPrice?: number;
  tif: TimeInForce;
  status: OrderStatus;
  submittedAt: number;
  filledAt?: number;
  filledAvgPrice?: number;
  source: OrderSource;
  message?: string;
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  tif: TimeInForce;
  limitPrice?: number;
  stopPrice?: number;
  source: OrderSource;
}

export interface StrategyInstance {
  id: string;
  kind: StrategyKind;
  name: string;
  symbol: string;
  qty: number;
  armed: boolean;
  params: Record<string, number>;
  lastSignal: "buy" | "sell" | "flat" | "none";
  lastFiredAt: number;
  note: string;
}

export type StrategyKind = "sma-cross" | "mean-rev" | "breakout" | "momentum";

export interface RiskSettings {
  maxDailyLossPct: number;
  maxPositionPct: number;
  defaultQty: number;
}

export interface BotLine {
  id: string;
  t: number;
  kind: "cmd" | "fill" | "signal" | "sys" | "err" | "ai";
  text: string;
}

export interface MarketClock {
  session: MarketSession;
  timestamp: number;
  nextChange: number;
  label: string;
  countdown: string;
}

export interface EquityPoint {
  t: number;
  v: number;
}

export interface BacktestStats {
  trades: number;
  winRate: number;
  netPct: number;
  maxDdPct: number;
}

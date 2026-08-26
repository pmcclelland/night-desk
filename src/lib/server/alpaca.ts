import type { Account, Creds, EquityPoint, Order, Position, Venue } from "@/lib/types";

function host(venue: Venue) {
  return venue === "alpaca-live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
}

function headers(creds: Creds) {
  return {
    "APCA-API-KEY-ID": creds.keyId,
    "APCA-API-SECRET-KEY": creds.secret,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function alpaca<T>(venue: Venue, creds: Creds, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${host(venue)}${path}`, {
    ...init,
    headers: { ...headers(creds), ...(init?.headers as Record<string, string> | undefined) },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `Alpaca ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 180);
    }
    throw new Error(msg);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

interface AlpacaAccount {
  cash: string;
  equity: string;
  buying_power: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  status: string;
  pattern_day_trader: boolean;
  daytrade_count: number;
  trading_blocked: boolean;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: "buy" | "sell";
  type: string;
  qty: string;
  filled_qty: string;
  limit_price: string | null;
  stop_price: string | null;
  time_in_force: string;
  status: string;
  submitted_at: string;
  filled_at: string | null;
  filled_avg_price: string | null;
}

function mapAccount(a: AlpacaAccount): Account {
  const equity = Number(a.equity);
  const lastEquity = Number(a.last_equity);
  const dayPl = equity - lastEquity;
  return {
    cash: Number(a.cash),
    equity,
    buyingPower: Number(a.buying_power),
    lastEquity,
    longValue: Number(a.long_market_value),
    shortValue: Number(a.short_market_value),
    dayPl,
    dayPlPct: lastEquity ? (dayPl / lastEquity) * 100 : 0,
    realizedToday: 0,
    status: a.status,
    patternDayTrader: a.pattern_day_trader,
    daytradeCount: a.daytrade_count,
    tradingBlocked: a.trading_blocked,
  };
}

function mapPosition(p: AlpacaPosition): Position {
  const qty = Number(p.qty);
  const last = Number(p.current_price);
  const avg = Number(p.avg_entry_price);
  return {
    symbol: p.symbol,
    qty,
    avgPrice: avg,
    last,
    marketValue: Number(p.market_value),
    costBasis: Number(p.cost_basis),
    unrealizedPl: Number(p.unrealized_pl),
    unrealizedPlPct: Number(p.unrealized_plpc) * 100,
    dayPl: Number(p.unrealized_intraday_pl),
  };
}

function mapOrder(o: AlpacaOrder): Order {
  const type = o.type === "limit" || o.type === "stop" || o.type === "market" ? o.type : "market";
  const tif = o.time_in_force === "gtc" || o.time_in_force === "ioc" ? o.time_in_force : "day";
  const status = (
    ["new", "accepted", "partially_filled", "filled", "canceled", "rejected", "expired"] as const
  ).includes(o.status as Order["status"])
    ? (o.status as Order["status"])
    : o.status === "pending_new" || o.status === "held"
      ? "accepted"
      : o.status === "done_for_day"
        ? "expired"
        : "new";
  return {
    id: o.id,
    clientOrderId: o.client_order_id,
    symbol: o.symbol,
    side: o.side,
    type,
    qty: Number(o.qty),
    filledQty: Number(o.filled_qty),
    limitPrice: o.limit_price ? Number(o.limit_price) : undefined,
    stopPrice: o.stop_price ? Number(o.stop_price) : undefined,
    tif,
    status,
    submittedAt: Date.parse(o.submitted_at),
    filledAt: o.filled_at ? Date.parse(o.filled_at) : undefined,
    filledAvgPrice: o.filled_avg_price ? Number(o.filled_avg_price) : undefined,
    source: "manual",
  };
}

export async function pingAlpacaAccount(venue: Venue, creds: Creds) {
  try {
    const a = await alpaca<AlpacaAccount>(venue, creds, "/v2/account");
    return { ok: true as const, account: mapAccount(a) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Connect failed" };
  }
}

export async function snapshotAlpaca(venue: Venue, creds: Creds) {
  const [acct, positions, orders] = await Promise.all([
    alpaca<AlpacaAccount>(venue, creds, "/v2/account"),
    alpaca<AlpacaPosition[]>(venue, creds, "/v2/positions").catch(() => [] as AlpacaPosition[]),
    alpaca<AlpacaOrder[]>(venue, creds, "/v2/orders?status=all&limit=80&direction=desc").catch(
      () => [] as AlpacaOrder[],
    ),
  ]);
  return {
    account: mapAccount(acct),
    positions: positions.map(mapPosition),
    orders: orders.map(mapOrder),
  };
}

export async function submitAlpacaOrderInner(input: {
  venue: Venue;
  creds: Creds;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  qty: number;
  tif: "day" | "gtc" | "ioc";
  limitPrice?: number;
  stopPrice?: number;
}) {
  const body: Record<string, string> = {
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    time_in_force: input.tif,
    qty: String(input.qty),
  };
  if (input.type === "limit" && input.limitPrice !== undefined) {
    body.limit_price = String(input.limitPrice);
  }
  if (input.type === "stop" && input.stopPrice !== undefined) {
    body.stop_price = String(input.stopPrice);
  }
  try {
    const o = await alpaca<AlpacaOrder>(input.venue, input.creds, "/v2/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok: true as const, order: mapOrder(o) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Order rejected" };
  }
}

export async function cancelAlpacaOrderInner(venue: Venue, creds: Creds, id: string) {
  try {
    await alpaca(venue, creds, `/v2/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Cancel failed" };
  }
}

export async function cancelAllAlpacaInner(venue: Venue, creds: Creds) {
  try {
    await alpaca(venue, creds, "/v2/orders", { method: "DELETE" });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Cancel-all failed" };
  }
}

export async function closeAlpacaPositionInner(venue: Venue, creds: Creds, symbol: string) {
  try {
    await alpaca(venue, creds, `/v2/positions/${encodeURIComponent(symbol)}`, { method: "DELETE" });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Flatten failed" };
  }
}

export async function closeAllAlpacaInner(venue: Venue, creds: Creds) {
  try {
    await alpaca(venue, creds, "/v2/positions", { method: "DELETE" });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Flatten-all failed" };
  }
}

export async function fetchEquityHistoryInner(venue: Venue, creds: Creds): Promise<EquityPoint[]> {
  try {
    const body = await alpaca<{ timestamp: number[]; equity: Array<number | null> }>(
      venue,
      creds,
      "/v2/account/portfolio/history?period=1M&timeframe=1D",
    );
    const pts: EquityPoint[] = [];
    for (let i = 0; i < (body.timestamp?.length ?? 0); i++) {
      const v = body.equity?.[i];
      const t = body.timestamp[i];
      if (typeof v === "number" && typeof t === "number") {
        pts.push({ t: t * 1000, v });
      }
    }
    return pts;
  } catch {
    return [];
  }
}

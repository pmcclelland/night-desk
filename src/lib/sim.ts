import { nameOf, SEED, STARTER_LOTS, STARTING_CASH } from "@/lib/universe";
import type {
  Account,
  Bar,
  EquityPoint,
  Order,
  OrderRequest,
  Position,
  Quote,
  OrderStatus,
} from "@/lib/types";

export interface SimBook {
  cash: number;
  realizedToday: number;
  positions: Position[];
  orders: Order[];
  equityHistory: EquityPoint[];
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedQuote(symbol: string, now = Date.now()): Quote {
  const s = SEED[symbol] ?? {
    last: 100,
    prev: 100,
    high: 101,
    low: 99,
    volume: 1_000_000,
  };
  const spread = Math.max(0.01, s.last * 0.0003);
  return {
    symbol,
    name: nameOf(symbol),
    last: s.last,
    prevClose: s.prev,
    change: s.last - s.prev,
    changePct: ((s.last - s.prev) / s.prev) * 100,
    high: s.high,
    low: s.low,
    open: s.prev,
    volume: s.volume,
    bid: s.last - spread / 2,
    ask: s.last + spread / 2,
    ts: now,
  };
}

export function quoteMapFromSeed(symbols: string[], now = Date.now()) {
  const map: Record<string, Quote> = {};
  for (const sym of symbols) map[sym] = seedQuote(sym, now);
  return map;
}

export function markPositions(positions: Position[], quotes: Record<string, Quote>): Position[] {
  return positions.map((p) => {
    const q = quotes[p.symbol];
    const last = q?.last ?? p.last;
    const prev = q?.prevClose ?? last;
    const marketValue = p.qty * last;
    const costBasis = p.qty * p.avgPrice;
    const unrealizedPl = (last - p.avgPrice) * p.qty;
    const unrealizedPlPct = p.avgPrice !== 0 ? (unrealizedPl / Math.abs(costBasis)) * 100 : 0;
    const dayPl = (last - prev) * p.qty;
    return {
      ...p,
      last,
      marketValue,
      costBasis,
      unrealizedPl,
      unrealizedPlPct,
      dayPl,
    };
  });
}

export function deriveAccount(book: SimBook, quotes: Record<string, Quote>): Account {
  const positions = markPositions(book.positions, quotes);
  let longValue = 0;
  let shortValue = 0;
  let dayPl = book.realizedToday;
  for (const p of positions) {
    if (p.qty >= 0) longValue += p.marketValue;
    else shortValue += p.marketValue;
    dayPl += p.dayPl;
  }
  const equity = book.cash + longValue + shortValue;
  const lastEquity = equity - dayPl;
  return {
    cash: book.cash,
    equity,
    buyingPower: Math.max(0, book.cash),
    lastEquity,
    longValue,
    shortValue,
    dayPl,
    dayPlPct: lastEquity !== 0 ? (dayPl / lastEquity) * 100 : 0,
    realizedToday: book.realizedToday,
    status: "ACTIVE",
    patternDayTrader: false,
    daytradeCount: 0,
    tradingBlocked: false,
  };
}

export function createStarterBook(now = Date.now()): SimBook {
  const quotes = quoteMapFromSeed(
    STARTER_LOTS.map((l) => l.symbol),
    now,
  );
  const positions: Position[] = STARTER_LOTS.map((lot) => ({
    symbol: lot.symbol,
    qty: lot.qty,
    avgPrice: lot.avg,
    last: lot.avg,
    marketValue: lot.qty * lot.avg,
    costBasis: lot.qty * lot.avg,
    unrealizedPl: 0,
    unrealizedPlPct: 0,
    dayPl: 0,
  }));
  const cost = STARTER_LOTS.reduce((s, l) => s + l.qty * l.avg, 0);
  const book: SimBook = {
    cash: STARTING_CASH - cost,
    realizedToday: 0,
    positions,
    orders: [],
    equityHistory: [],
  };
  const acct = deriveAccount(book, quotes);
  book.equityHistory = [{ t: now, v: acct.equity }];
  return book;
}

function lastOf(quotes: Record<string, Quote>, symbol: string) {
  return quotes[symbol]?.last;
}

function applyFill(book: SimBook, order: Order, px: number, now: number): SimBook {
  const qtySigned = order.side === "buy" ? order.qty : -order.qty;
  const notional = qtySigned * px;
  let cash = book.cash - notional;
  let realizedToday = book.realizedToday;
  const positions = book.positions.map((p) => ({ ...p }));
  const idx = positions.findIndex((p) => p.symbol === order.symbol);
  if (idx === -1) {
    positions.push({
      symbol: order.symbol,
      qty: qtySigned,
      avgPrice: px,
      last: px,
      marketValue: qtySigned * px,
      costBasis: qtySigned * px,
      unrealizedPl: 0,
      unrealizedPlPct: 0,
      dayPl: 0,
    });
  } else {
    const pos = positions[idx]!;
    const newQty = pos.qty + qtySigned;
    if (pos.qty !== 0 && Math.sign(pos.qty) !== Math.sign(qtySigned) && newQty !== 0) {
      const closing = Math.min(Math.abs(qtySigned), Math.abs(pos.qty));
      realizedToday += (px - pos.avgPrice) * closing * Math.sign(pos.qty);
    } else if (newQty === 0) {
      realizedToday += (px - pos.avgPrice) * pos.qty;
    }
    if (newQty === 0) {
      positions.splice(idx, 1);
    } else if (Math.sign(newQty) !== Math.sign(pos.qty) && pos.qty !== 0) {
      pos.qty = newQty;
      pos.avgPrice = px;
    } else if (Math.sign(qtySigned) === Math.sign(pos.qty) || pos.qty === 0) {
      const absOld = Math.abs(pos.qty);
      const absAdd = Math.abs(qtySigned);
      pos.avgPrice = (pos.avgPrice * absOld + px * absAdd) / (absOld + absAdd);
      pos.qty = newQty;
    } else {
      pos.qty = newQty;
      pos.avgPrice = px;
    }
  }
  const filled: Order = {
    ...order,
    status: "filled",
    filledQty: order.qty,
    filledAt: now,
    filledAvgPrice: px,
  };
  const orders = book.orders.map((o) => (o.id === order.id ? filled : o));
  if (!orders.some((o) => o.id === order.id)) orders.unshift(filled);
  return { ...book, cash, realizedToday, positions, orders };
}

function slip(side: Order["side"], last: number) {
  const bps = 2 + Math.random() * 3;
  const dir = side === "buy" ? 1 : -1;
  return last * (1 + dir * bps * 0.0001);
}

export function submitSimOrder(
  book: SimBook,
  quotes: Record<string, Quote>,
  req: OrderRequest,
  now = Date.now(),
): { book: SimBook; order: Order; error?: string } {
  const last = lastOf(quotes, req.symbol);
  if (!last || !Number.isFinite(last)) {
    const order: Order = {
      id: id("ord"),
      clientOrderId: id("c"),
      symbol: req.symbol,
      side: req.side,
      type: req.type,
      qty: req.qty,
      filledQty: 0,
      limitPrice: req.limitPrice,
      stopPrice: req.stopPrice,
      tif: req.tif,
      status: "rejected",
      submittedAt: now,
      source: req.source,
      message: "No quote",
    };
    return {
      book: { ...book, orders: [order, ...book.orders] },
      order,
      error: `No quote for ${req.symbol}`,
    };
  }
  if (req.qty <= 0) {
    const order: Order = {
      id: id("ord"),
      clientOrderId: id("c"),
      symbol: req.symbol,
      side: req.side,
      type: req.type,
      qty: req.qty,
      filledQty: 0,
      limitPrice: req.limitPrice,
      stopPrice: req.stopPrice,
      tif: req.tif,
      status: "rejected",
      submittedAt: now,
      source: req.source,
      message: "Invalid qty",
    };
    return { book: { ...book, orders: [order, ...book.orders] }, order, error: "Qty must be > 0" };
  }

  const order: Order = {
    id: id("ord"),
    clientOrderId: id("c"),
    symbol: req.symbol,
    side: req.side,
    type: req.type,
    qty: req.qty,
    filledQty: 0,
    limitPrice: req.limitPrice,
    stopPrice: req.stopPrice,
    tif: req.tif,
    status: "new",
    submittedAt: now,
    source: req.source,
  };

  const fillNow =
    req.type === "market" ||
    (req.type === "limit" &&
      req.limitPrice !== undefined &&
      ((req.side === "buy" && last <= req.limitPrice) ||
        (req.side === "sell" && last >= req.limitPrice))) ||
    (req.type === "stop" &&
      req.stopPrice !== undefined &&
      ((req.side === "buy" && last >= req.stopPrice) ||
        (req.side === "sell" && last <= req.stopPrice)));

  if (fillNow) {
    const px = slip(req.side, last);
    if (req.side === "buy" && px * req.qty > book.cash + 0.01) {
      const rejected: Order = { ...order, status: "rejected", message: "Insufficient cash" };
      return {
        book: { ...book, orders: [rejected, ...book.orders] },
        order: rejected,
        error: "Insufficient cash",
      };
    }
    const next = applyFill({ ...book, orders: [order, ...book.orders] }, order, px, now);
    const filled = next.orders.find((o) => o.id === order.id)!;
    return { book: next, order: filled };
  }

  const working: Order = { ...order, status: "accepted" };
  return { book: { ...book, orders: [working, ...book.orders] }, order: working };
}

const WORKING: OrderStatus[] = ["new", "accepted", "partially_filled"];

export function matchWorkingOrders(
  book: SimBook,
  quotes: Record<string, Quote>,
  now = Date.now(),
): { book: SimBook; fills: Order[] } {
  let next = book;
  const fills: Order[] = [];
  for (const order of book.orders) {
    if (!WORKING.includes(order.status)) continue;
    const last = lastOf(quotes, order.symbol);
    if (!last) continue;
    let hit = false;
    if (
      order.type === "limit" &&
      order.limitPrice !== undefined &&
      ((order.side === "buy" && last <= order.limitPrice) ||
        (order.side === "sell" && last >= order.limitPrice))
    ) {
      hit = true;
    }
    if (
      order.type === "stop" &&
      order.stopPrice !== undefined &&
      ((order.side === "buy" && last >= order.stopPrice) ||
        (order.side === "sell" && last <= order.stopPrice))
    ) {
      hit = true;
    }
    if (!hit) continue;
    const px = order.type === "limit" && order.limitPrice ? order.limitPrice : slip(order.side, last);
    if (order.side === "buy" && px * (order.qty - order.filledQty) > next.cash + 0.01) continue;
    next = applyFill(next, order, px, now);
    const filled = next.orders.find((o) => o.id === order.id);
    if (filled) fills.push(filled);
  }
  return { book: next, fills };
}

export function cancelSimOrder(book: SimBook, id: string): SimBook {
  return {
    ...book,
    orders: book.orders.map((o) =>
      o.id === id && WORKING.includes(o.status) ? { ...o, status: "canceled" } : o,
    ),
  };
}

export function cancelAllSim(book: SimBook): SimBook {
  return {
    ...book,
    orders: book.orders.map((o) =>
      WORKING.includes(o.status) ? { ...o, status: "canceled" } : o,
    ),
  };
}

export function flattenSymbol(
  book: SimBook,
  quotes: Record<string, Quote>,
  symbol: string,
  source: OrderRequest["source"],
): { book: SimBook; order?: Order; error?: string } {
  const pos = book.positions.find((p) => p.symbol === symbol);
  if (!pos || pos.qty === 0) return { book, error: `No position in ${symbol}` };
  return submitSimOrder(
    book,
    quotes,
    {
      symbol,
      side: pos.qty > 0 ? "sell" : "buy",
      type: "market",
      qty: Math.abs(pos.qty),
      tif: "day",
      source,
    },
  );
}

export function flattenAll(
  book: SimBook,
  quotes: Record<string, Quote>,
  source: OrderRequest["source"],
): { book: SimBook; orders: Order[] } {
  let next = book;
  const orders: Order[] = [];
  for (const pos of [...book.positions]) {
    const r = flattenSymbol(next, quotes, pos.symbol, source);
    next = r.book;
    if (r.order) orders.push(r.order);
  }
  return { book: next, orders };
}

export function seedBars(symbol: string, n = 80): Bar[] {
  const seed = SEED[symbol]?.last ?? 100;
  const prev = SEED[symbol]?.prev ?? seed * 0.99;
  const bars: Bar[] = [];
  let px = prev * 0.97;
  const step = 24 * 60 * 60_000;
  for (let i = 0; i < n; i++) {
    const t = Date.UTC(2026, 7, 25) - (n - i) * step;
    const drift = (seed - px) * 0.08;
    const shock = Math.sin(i / 3.7 + symbol.length) * seed * 0.006;
    const o = px;
    const c = i === n - 1 ? seed : px + drift + shock;
    const h = Math.max(o, c) + seed * 0.004;
    const l = Math.min(o, c) - seed * 0.004;
    bars.push({ t, o, h, l, c, v: 2_000_000 + i * 8000 });
    px = c;
  }
  return bars;
}

export function snapshotEquity(book: SimBook, quotes: Record<string, Quote>, now = Date.now()): SimBook {
  const acct = deriveAccount(book, quotes);
  const history = [...book.equityHistory, { t: now, v: acct.equity }].slice(-240);
  return { ...book, equityHistory: history };
}

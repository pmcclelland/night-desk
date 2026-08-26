import {
  cancelAllAlpacaInner,
  cancelAlpacaOrderInner,
  closeAllAlpacaInner,
  closeAlpacaPositionInner,
  pingAlpacaAccount,
  snapshotAlpaca,
  submitAlpacaOrderInner,
} from "@/lib/server/alpaca";
import { loadBars, loadQuotes } from "@/lib/server/market";
import { loadDesk, saveDesk, type DeskSnapshot } from "@/lib/server/desk-store";
import { localThesis } from "@/lib/indicators";
import {
  cancelAllSim,
  cancelSimOrder,
  createStarterBook,
  deriveAccount,
  flattenAll,
  flattenSymbol,
  matchWorkingOrders,
  snapshotEquity,
  submitSimOrder,
} from "@/lib/sim";
import type {
  Account,
  BotLine,
  OrderRequest,
  Position,
  RiskSettings,
  Venue,
} from "@/lib/types";

function line(kind: BotLine["kind"], text: string): BotLine {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    t: Date.now(),
    kind,
    text,
  };
}

function log(desk: DeskSnapshot, kind: BotLine["kind"], text: string): DeskSnapshot {
  return { ...desk, botLog: [...desk.botLog, line(kind, text)].slice(-200) };
}

async function quotesFor(desk: DeskSnapshot) {
  const symbols = [
    desk.selected,
    ...desk.watchlist,
    ...desk.sim.positions.map((p) => p.symbol),
    ...desk.strategies.map((s) => s.symbol),
  ];
  return loadQuotes({ symbols, venue: desk.venue, creds: desk.creds });
}

async function accountOf(desk: DeskSnapshot): Promise<{
  account: Account;
  positions: Position[];
}> {
  if (desk.venue === "sim") {
    const pack = await quotesFor(desk);
    return {
      account: deriveAccount(desk.sim, pack.quotes),
      positions: desk.sim.positions,
    };
  }
  if (!desk.creds) {
    return {
      account: {
        cash: 0,
        equity: 0,
        buyingPower: 0,
        lastEquity: 0,
        longValue: 0,
        shortValue: 0,
        dayPl: 0,
        dayPlPct: 0,
        realizedToday: 0,
        status: "disconnected",
        patternDayTrader: false,
        daytradeCount: 0,
        tradingBlocked: true,
      },
      positions: [],
    };
  }
  const snap = await snapshotAlpaca(desk.venue, desk.creds);
  return { account: snap.account, positions: snap.positions };
}

function riskHalt(desk: DeskSnapshot, account: Account): DeskSnapshot {
  if (account.lastEquity > 0 && account.dayPlPct <= -desk.risk.maxDailyLossPct && !desk.halted) {
    return log(
      { ...desk, halted: true },
      "err",
      `Daily loss ${account.dayPlPct.toFixed(2)}% hit cap. Desk halted.`,
    );
  }
  return desk;
}

export type DeskOp =
  | { op: "place_order"; request: OrderRequest }
  | { op: "flatten"; symbol?: string }
  | { op: "cancel"; id?: string }
  | { op: "halt"; flatten?: boolean }
  | { op: "resume" }
  | { op: "status" }
  | { op: "watch"; action: "add" | "rm"; symbol: string }
  | { op: "select"; symbol: string }
  | { op: "arm"; id: string }
  | { op: "disarm"; id: string }
  | { op: "set_venue"; venue: Venue; keyId?: string; secret?: string }
  | { op: "set_risk"; risk: Partial<RiskSettings> }
  | { op: "reset_sim" }
  | { op: "thesis"; symbol?: string }
  | { op: "save_client"; snapshot: Omit<DeskSnapshot, "updatedAt" | "creds"> & { creds?: { keyId: string } | null } };

export type DeskOpExtra = {
  account?: Account;
  positions?: Position[];
  order?: { id: string; symbol: string; side: string; qty: number; status: string };
  venue?: Venue;
  halted?: boolean;
  selected?: string;
  watchlist?: string[];
  risk?: RiskSettings;
  strategies?: Array<{
    id: string;
    name: string;
    symbol: string;
    armed: boolean;
    lastSignal: string;
  }>;
};

export type DeskOpResult = {
  ok: boolean;
  error?: string;
  message?: string;
  desk: DeskSnapshot;
  extra?: DeskOpExtra;
};

async function runOp(desk: DeskSnapshot, op: DeskOp): Promise<DeskOpResult> {
  if (op.op === "status") {
    const { account, positions } = await accountOf(desk);
    const message = [
      `venue ${desk.venue}`,
      desk.halted ? "HALTED" : "LIVE",
      `EQ ${account.equity.toFixed(2)}`,
      `CASH ${account.cash.toFixed(2)}`,
      `DAY ${account.dayPl.toFixed(2)}`,
      `N=${positions.length}`,
      `selected ${desk.selected}`,
    ].join("  ");
    return {
      ok: true,
      message,
      desk,
      extra: {
        venue: desk.venue,
        halted: desk.halted,
        selected: desk.selected,
        watchlist: desk.watchlist,
        account,
        positions,
        risk: desk.risk,
        strategies: desk.strategies.map((s) => ({
          id: s.id,
          name: s.name,
          symbol: s.symbol,
          armed: s.armed,
          lastSignal: s.lastSignal,
        })),
      },
    };
  }

  if (op.op === "resume") {
    const next = log({ ...desk, halted: false }, "sys", "Desk resumed");
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "halt") {
    let next: DeskSnapshot = {
      ...desk,
      halted: true,
      strategies: desk.strategies.map((s) => ({ ...s, armed: false })),
    };
    if (desk.venue === "sim") {
      let book = cancelAllSim(next.sim);
      if (op.flatten) book = flattenAll(book, (await quotesFor(next)).quotes, "bot").book;
      next = { ...next, sim: book };
    } else if (next.creds) {
      await cancelAllAlpacaInner(next.venue, next.creds);
      if (op.flatten) await closeAllAlpacaInner(next.venue, next.creds);
    }
    next = log(
      next,
      "err",
      op.flatten ? "KILL — canceled working + flattened" : "KILL — canceled working, strategies disarmed",
    );
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "watch") {
    const symbol = op.symbol.toUpperCase();
    const watchlist =
      op.action === "add"
        ? desk.watchlist.includes(symbol)
          ? desk.watchlist
          : [...desk.watchlist, symbol]
        : desk.watchlist.filter((s) => s !== symbol);
    const next = log({ ...desk, watchlist, selected: op.action === "add" ? symbol : desk.selected }, "sys", `Watchlist ${op.action} ${symbol}`);
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "select") {
    const symbol = op.symbol.toUpperCase();
    const watchlist = desk.watchlist.includes(symbol) ? desk.watchlist : [...desk.watchlist, symbol];
    const next = { ...desk, selected: symbol, watchlist };
    return { ok: true, message: `Selected ${symbol}`, desk: next };
  }

  if (op.op === "arm" || op.op === "disarm") {
    const st = desk.strategies.find((s) => s.id === op.id);
    if (!st) return { ok: false, error: `No strategy ${op.id}`, desk };
    const next = log(
      {
        ...desk,
        strategies: desk.strategies.map((s) => (s.id === op.id ? { ...s, armed: op.op === "arm" } : s)),
      },
      "sys",
      `${op.op.toUpperCase()} ${st.name}`,
    );
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "set_risk") {
    const next = { ...desk, risk: { ...desk.risk, ...op.risk } };
    return { ok: true, message: "Risk updated", desk: next };
  }

  if (op.op === "reset_sim") {
    const next = log(
      { ...desk, sim: createStarterBook(), venue: "sim", halted: false, creds: null },
      "sys",
      "Sim book reset to $100,000.",
    );
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "set_venue") {
    if (op.venue === "sim") {
      const next = log({ ...desk, venue: "sim", creds: null }, "sys", "Venue SIM — local blotter.");
      return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
    }
    const keyId = op.keyId?.trim() || desk.creds?.keyId || "";
    const secret = op.secret?.trim() || desk.creds?.secret || "";
    if (!keyId || !secret) return { ok: false, error: "Enter key and secret", desk };
    const creds = { keyId, secret };
    const ping = await pingAlpacaAccount(op.venue, creds);
    if (!ping.ok) return { ok: false, error: ping.error, desk };
    const next = log(
      { ...desk, venue: op.venue, creds },
      "sys",
      `Connected ${op.venue === "alpaca-live" ? "LIVE" : "PAPER"} · equity ${ping.account.equity.toFixed(0)}`,
    );
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next, extra: { account: ping.account } };
  }

  if (op.op === "thesis") {
    const symbol = (op.symbol || desk.selected).toUpperCase();
    const pack = await quotesFor(desk);
    const last = pack.quotes[symbol]?.last ?? 0;
    const bars = await loadBars({ symbol, range: "6M", venue: desk.venue, creds: desk.creds });
    const text = localThesis(symbol, last || bars.bars.at(-1)?.c || 0, bars.bars);
    const next = log({ ...desk, selected: symbol }, "ai", text);
    return { ok: true, message: text, desk: next };
  }

  if (op.op === "cancel") {
    if (desk.venue === "sim") {
      const next = log(
        { ...desk, sim: op.id ? cancelSimOrder(desk.sim, op.id) : cancelAllSim(desk.sim) },
        "sys",
        op.id ? `Canceled ${op.id}` : "Canceled working",
      );
      return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
    }
    if (!desk.creds) return { ok: false, error: "No Alpaca keys", desk };
    const res = op.id
      ? await cancelAlpacaOrderInner(desk.venue, desk.creds, op.id)
      : await cancelAllAlpacaInner(desk.venue, desk.creds);
    if (!res.ok) return { ok: false, error: res.error, desk };
    const next = log(desk, "sys", op.id ? `Canceled ${op.id}` : "Canceled working");
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "flatten") {
    if (desk.venue === "sim") {
      const pack = await quotesFor(desk);
      if (!op.symbol) {
        const r = flattenAll(desk.sim, pack.quotes, "bot");
        const next = log({ ...desk, sim: r.book }, "fill", `Flattened ${r.orders.length} names`);
        return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
      }
      const r = flattenSymbol(desk.sim, pack.quotes, op.symbol.toUpperCase(), "bot");
      if (r.error) return { ok: false, error: r.error, desk };
      const next = log({ ...desk, sim: r.book }, "fill", `Flattened ${op.symbol.toUpperCase()}`);
      return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
    }
    if (!desk.creds) return { ok: false, error: "No Alpaca keys", desk };
    const res = op.symbol
      ? await closeAlpacaPositionInner(desk.venue, desk.creds, op.symbol.toUpperCase())
      : await closeAllAlpacaInner(desk.venue, desk.creds);
    if (!res.ok) return { ok: false, error: res.error, desk };
    const next = log(desk, "sys", op.symbol ? `Flattened ${op.symbol.toUpperCase()}` : "Flattened all");
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next };
  }

  if (op.op === "place_order") {
    if (desk.halted) return { ok: false, error: "Halted", desk: log(desk, "err", "Desk is halted. RESUME to trade.") };
    const req = {
      ...op.request,
      symbol: op.request.symbol.toUpperCase(),
      qty: Number(op.request.qty),
    };
    if (!req.symbol || !(req.qty > 0)) return { ok: false, error: "Need symbol and qty", desk };

    const pack = await quotesFor(desk);
    const { account } = await accountOf(desk);
    if (account.tradingBlocked) return { ok: false, error: "Trading blocked", desk };
    const last = pack.quotes[req.symbol]?.last ?? 0;
    const notional = last * req.qty;
    if (account.equity > 0 && notional / account.equity > desk.risk.maxPositionPct / 100 && req.side === "buy") {
      const msg = `Order ${notional.toFixed(0)} exceeds max position ${desk.risk.maxPositionPct}%`;
      return { ok: false, error: msg, desk: log(desk, "err", msg) };
    }

    if (desk.venue === "sim") {
      const result = submitSimOrder(desk.sim, pack.quotes, req);
      if (result.error) return { ok: false, error: result.error, desk: log(desk, "err", result.error) };
      let book = result.book;
      const matched = matchWorkingOrders(book, pack.quotes);
      book = snapshotEquity(matched.book, pack.quotes);
      const o = result.order;
      const fillNote =
        o.status === "filled"
          ? `FILL ${o.side.toUpperCase()} ${o.qty} ${o.symbol} @ ${o.filledAvgPrice?.toFixed(2)}`
          : `ACK ${o.side.toUpperCase()} ${o.type} ${o.qty} ${o.symbol} (${o.status})`;
      let next = log({ ...desk, sim: book }, o.status === "filled" ? "fill" : "sys", fillNote);
      next = riskHalt(next, deriveAccount(book, pack.quotes));
      return { ok: true, message: fillNote, desk: next, extra: { order: o } };
    }

    if (!desk.creds) return { ok: false, error: "No Alpaca keys", desk };
    const res = await submitAlpacaOrderInner({
      venue: desk.venue,
      creds: desk.creds,
      symbol: req.symbol,
      side: req.side,
      type: req.type,
      qty: req.qty,
      tif: req.tif,
      limitPrice: req.limitPrice,
      stopPrice: req.stopPrice,
    });
    if (!res.ok) return { ok: false, error: res.error, desk: log(desk, "err", res.error) };
    const next = log(desk, "sys", `ACK ${res.order.side.toUpperCase()} ${res.order.qty} ${res.order.symbol}`);
    return { ok: true, message: next.botLog.at(-1)?.text, desk: next, extra: { order: res.order } };
  }

  if (op.op === "save_client") {
    const next: DeskSnapshot = {
      ...desk,
      venue: op.snapshot.venue,
      watchlist: op.snapshot.watchlist,
      selected: op.snapshot.selected,
      sim: op.snapshot.sim,
      strategies: op.snapshot.strategies,
      botLog: op.snapshot.botLog,
      risk: op.snapshot.risk,
      halted: op.snapshot.halted,
      creds: desk.creds,
    };
    return { ok: true, desk: next };
  }

  return { ok: false, error: "Unknown op", desk };
}

export async function executeDeskOp(userId: string, op: DeskOp): Promise<DeskOpResult> {
  const desk = await loadDesk(userId);
  const result = await runOp(desk, op);
  const saved = await saveDesk(userId, result.desk);
  return { ...result, desk: saved };
}

export async function quotesForDesk(userId: string, symbols?: string[]) {
  const desk = await loadDesk(userId);
  const list = symbols?.length ? symbols : [desk.selected, ...desk.watchlist];
  return loadQuotes({ symbols: list, venue: desk.venue, creds: desk.creds });
}

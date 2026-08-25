import { toast } from "sonner";
import { localThesis } from "@/lib/indicators";
import { helpText, parseCommand } from "@/lib/bot-parse";
import { evaluateStrategy } from "@/lib/strategies";
import {
  cancelAllSim,
  cancelSimOrder,
  flattenAll,
  flattenSymbol,
  matchWorkingOrders,
  snapshotEquity,
  submitSimOrder,
} from "@/lib/sim";
import { fetchBars, fetchQuotes } from "@/lib/server/market";
import {
  cancelAllAlpaca,
  cancelAlpacaOrder,
  closeAllAlpaca,
  closeAlpacaPosition,
  fetchAccountSnapshot,
  pingAlpaca,
  submitAlpacaOrder,
} from "@/lib/server/trade";
import { askDesk } from "@/lib/server/grok";
import { selectAccount, selectPositions, useDesk } from "@/lib/store";
import type { OrderRequest, Venue } from "@/lib/types";

function unique(xs: string[]) {
  return [...new Set(xs.filter(Boolean))];
}

export async function refreshQuotes() {
  const s = useDesk.getState();
  const symbols = unique([
    s.selected,
    ...s.watchlist,
    ...s.sim.positions.map((p) => p.symbol),
    ...s.alpacaPositions.map((p) => p.symbol),
    ...s.strategies.map((st) => st.symbol),
  ]);
  try {
    const pack = await fetchQuotes({
      data: { symbols, venue: s.venue, creds: s.creds },
    });
    const quotes = pack.quotes;
    const { setQuotes, setSim, venue, sim, log } = useDesk.getState();
    setQuotes(quotes, pack.source);
    if (venue === "sim") {
      const matched = matchWorkingOrders(sim, quotes);
      let next = matched.book;
      next = snapshotEquity(next, quotes);
      setSim(next);
      for (const f of matched.fills) {
        log(
          "fill",
          `FILL ${f.side.toUpperCase()} ${f.qty} ${f.symbol} @ ${f.filledAvgPrice?.toFixed(2)}`,
        );
        toast.success(`Filled ${f.side} ${f.qty} ${f.symbol}`);
      }
    }
  } catch (err) {
    useDesk.getState().log("err", err instanceof Error ? err.message : "Quote feed failed");
  }
}

export async function refreshBars() {
  const s = useDesk.getState();
  s.setBarsLoading(true);
  try {
    const pack = await fetchBars({
      data: { symbol: s.selected, range: s.barRange, venue: s.venue, creds: s.creds },
    });
    if (!pack.bars.length) {
      useDesk.getState().setBarsLoading(false);
      useDesk.getState().log("err", `No bars for ${s.selected} ${s.barRange}`);
      return;
    }
    useDesk.getState().setBars(s.selected, pack.bars, pack.source);
  } catch (err) {
    useDesk.getState().setBarsLoading(false);
    useDesk.getState().log("err", err instanceof Error ? err.message : "Chart feed failed");
  }
}

export async function refreshAlpaca() {
  const s = useDesk.getState();
  if (s.venue === "sim" || !s.creds) return;
  try {
    const snap = await fetchAccountSnapshot({
      data: { venue: s.venue, creds: s.creds },
    });
    useDesk.getState().setAlpacaBook(snap);
  } catch (err) {
    useDesk.getState().log("err", err instanceof Error ? err.message : "Alpaca snapshot failed");
  }
}

function riskHaltIfNeeded() {
  const s = useDesk.getState();
  const acct = selectAccount(s);
  if (acct.lastEquity > 0 && acct.dayPlPct <= -s.risk.maxDailyLossPct && !s.halted) {
    s.setHalted(true);
    s.log("err", `Daily loss ${acct.dayPlPct.toFixed(2)}% hit cap. Desk halted.`);
    toast.error("Daily loss cap — desk halted");
  }
}

export async function placeOrder(req: OrderRequest): Promise<{ ok: boolean; error?: string }> {
  const s = useDesk.getState();
  if (s.halted) {
    s.log("err", "Desk is halted. RESUME to trade.");
    return { ok: false, error: "Halted" };
  }
  const acct = selectAccount(s);
  if (acct.tradingBlocked) return { ok: false, error: "Trading blocked" };

  const q = s.quotes[req.symbol];
  const last = q?.last ?? 0;
  const notional = last * req.qty;
  if (acct.equity > 0 && notional / acct.equity > s.risk.maxPositionPct / 100 && req.side === "buy") {
    const msg = `Order ${notional.toFixed(0)} exceeds max position ${s.risk.maxPositionPct}%`;
    s.log("err", msg);
    return { ok: false, error: msg };
  }

  if (s.venue === "sim") {
    const result = submitSimOrder(s.sim, s.quotes, req);
    s.setSim(result.book);
    if (result.error) {
      s.log("err", result.error);
      toast.error(result.error);
      return { ok: false, error: result.error };
    }
    const o = result.order;
    const fillNote =
      o.status === "filled"
        ? `FILL ${o.side.toUpperCase()} ${o.qty} ${o.symbol} @ ${o.filledAvgPrice?.toFixed(2)}`
        : `ACK ${o.side.toUpperCase()} ${o.type} ${o.qty} ${o.symbol} (${o.status})`;
    s.log(o.status === "filled" ? "fill" : "sys", fillNote);
    if (o.status === "filled") toast.success(fillNote);
    riskHaltIfNeeded();
    return { ok: true };
  }

  if (!s.creds) {
    s.log("err", "Connect Alpaca keys in Settings.");
    return { ok: false, error: "No keys" };
  }
  const res = await submitAlpacaOrder({
    data: {
      venue: s.venue,
      creds: s.creds,
      symbol: req.symbol,
      side: req.side,
      type: req.type,
      qty: req.qty,
      tif: req.tif,
      limitPrice: req.limitPrice,
      stopPrice: req.stopPrice,
    },
  });
  if (!res.ok) {
    s.log("err", res.error);
    toast.error(res.error);
    return { ok: false, error: res.error };
  }
  s.log("sys", `ACK ${res.order.side.toUpperCase()} ${res.order.qty} ${res.order.symbol}`);
  await refreshAlpaca();
  return { ok: true };
}

export async function cancelOrder(id: string) {
  const s = useDesk.getState();
  if (s.venue === "sim") {
    s.setSim(cancelSimOrder(s.sim, id));
    s.log("sys", `Canceled ${id}`);
    return;
  }
  if (!s.creds) return;
  const res = await cancelAlpacaOrder({ data: { venue: s.venue, creds: s.creds, id } });
  if (!res.ok) s.log("err", res.error);
  else s.log("sys", `Canceled ${id}`);
  await refreshAlpaca();
}

export async function killSwitch(flattenBook: boolean) {
  const s = useDesk.getState();
  s.setHalted(true);
  s.setStrategies(s.strategies.map((st) => ({ ...st, armed: false })));
  if (s.venue === "sim") {
    let book = cancelAllSim(s.sim);
    if (flattenBook) book = flattenAll(book, s.quotes, "bot").book;
    s.setSim(book);
  } else if (s.creds) {
    await cancelAllAlpaca({ data: { venue: s.venue, creds: s.creds } });
    if (flattenBook) await closeAllAlpaca({ data: { venue: s.venue, creds: s.creds } });
    await refreshAlpaca();
  }
  s.log(
    "err",
    flattenBook
      ? "KILL — canceled working + flattened"
      : "KILL — canceled working, strategies disarmed",
  );
  toast.error("Kill switch engaged");
}

export async function flatten(symbol?: string) {
  const s = useDesk.getState();
  if (s.venue === "sim") {
    if (!symbol) {
      const r = flattenAll(s.sim, s.quotes, "bot");
      s.setSim(r.book);
      s.log("fill", `Flattened ${r.orders.length} names`);
      return;
    }
    const r = flattenSymbol(s.sim, s.quotes, symbol, "bot");
    s.setSim(r.book);
    if (r.error) s.log("err", r.error);
    else s.log("fill", `Flattened ${symbol}`);
    return;
  }
  if (!s.creds) return;
  if (!symbol) {
    const r = await closeAllAlpaca({ data: { venue: s.venue, creds: s.creds } });
    if (!r.ok) s.log("err", r.error);
    else s.log("sys", "Flattened all");
  } else {
    const r = await closeAlpacaPosition({ data: { venue: s.venue, creds: s.creds, symbol } });
    if (!r.ok) s.log("err", r.error);
    else s.log("sys", `Flattened ${symbol}`);
  }
  await refreshAlpaca();
}

export async function connectAlpaca(venue: Venue, keyId: string, secret: string) {
  const s = useDesk.getState();
  if (venue === "sim") {
    s.setVenue("sim");
    s.setCreds(null);
    s.setConnected(true);
    s.log("sys", "Venue SIM — local blotter, Yahoo delayed tape.");
    return { ok: true as const };
  }
  const creds = { keyId: keyId.trim(), secret: secret.trim() };
  if (!creds.keyId || !creds.secret) return { ok: false as const, error: "Enter key and secret" };
  const ping = await pingAlpaca({ data: { venue, creds } });
  if (!ping.ok) {
    s.setConnected(false, ping.error);
    s.log("err", ping.error);
    return ping;
  }
  s.setCreds(creds);
  s.setVenue(venue);
  s.setConnected(true);
  s.setAlpacaBook({ account: ping.account, positions: [], orders: [] });
  s.log(
    "sys",
    `Connected ${venue === "alpaca-live" ? "LIVE" : "PAPER"} · equity ${ping.account.equity.toFixed(0)} · tape Alpaca IEX (Yahoo fallback)`,
  );
  await refreshAlpaca();
  await refreshQuotes();
  return { ok: true as const };
}

export async function tickStrategies() {
  const s = useDesk.getState();
  if (s.halted) return;
  const armed = s.strategies.filter((st) => st.armed);
  if (armed.length === 0) return;

  for (const st of armed) {
    try {
      const pack = await fetchBars({
        data: { symbol: st.symbol, range: "6M", venue: s.venue, creds: s.creds },
      });
      const sig = evaluateStrategy(st, pack.bars);
      useDesk.getState().patchStrategy(st.id, { lastSignal: sig.action, note: sig.note });
      if (Date.now() - st.lastFiredAt < 15 * 60_000 && st.lastFiredAt !== 0) continue;

      const pos = selectPositions(useDesk.getState()).find((p) => p.symbol === st.symbol);
      const qty = pos?.qty ?? 0;
      if (sig.action === "buy" && qty <= 0) {
        const res = await placeOrder({
          symbol: st.symbol,
          side: "buy",
          type: "market",
          qty: st.qty,
          tif: "day",
          source: "strategy",
        });
        if (res.ok) {
          useDesk.getState().patchStrategy(st.id, { lastFiredAt: Date.now(), lastSignal: "buy" });
          useDesk.getState().log("signal", `${st.name} BUY ${st.qty} ${st.symbol} · ${sig.note}`);
        }
      } else if ((sig.action === "sell" || sig.action === "flat") && qty > 0) {
        await flatten(st.symbol);
        useDesk.getState().patchStrategy(st.id, { lastFiredAt: Date.now(), lastSignal: sig.action });
        useDesk.getState().log("signal", `${st.name} FLATTEN ${st.symbol} · ${sig.note}`);
      }
    } catch (err) {
      useDesk
        .getState()
        .log("err", `${st.name}: ${err instanceof Error ? err.message : "tick failed"}`);
    }
  }
}

async function runGrokCommands(
  commands: Array<{
    op: string;
    symbol?: string;
    qty?: number;
    type?: "market" | "limit" | "stop";
    limitPrice?: number;
    stopPrice?: number;
  }>,
) {
  for (const c of commands) {
    if (c.op === "buy" || c.op === "sell") {
      if (!c.symbol || !c.qty) continue;
      await placeOrder({
        symbol: c.symbol.toUpperCase(),
        side: c.op,
        type: c.type ?? "market",
        qty: c.qty,
        tif: "day",
        limitPrice: c.limitPrice,
        stopPrice: c.stopPrice,
        source: "bot",
      });
    } else if (c.op === "flatten") {
      await flatten(c.symbol?.toUpperCase());
    } else if (c.op === "cancel_all") {
      const st = useDesk.getState();
      if (st.venue === "sim") st.setSim(cancelAllSim(st.sim));
      else if (st.creds) await cancelAllAlpaca({ data: { venue: st.venue, creds: st.creds } });
      st.log("sys", "Canceled working orders");
    } else if (c.op === "halt") {
      await killSwitch(false);
    } else if (c.op === "resume") {
      useDesk.getState().setHalted(false);
      useDesk.getState().log("sys", "Desk resumed");
    } else if (c.op === "thesis" && c.symbol) {
      await runThesis(c.symbol.toUpperCase());
    }
  }
}

export async function runThesis(symbol: string) {
  const s = useDesk.getState();
  const last = s.quotes[symbol]?.last ?? 0;
  let bars = s.selected === symbol ? s.bars : [];
  if (bars.length < 30) {
    const pack = await fetchBars({
      data: { symbol, range: "6M", venue: s.venue, creds: s.creds },
    });
    bars = pack.bars;
  }
  const local = localThesis(symbol, last || bars.at(-1)?.c || 0, bars);
  s.log("ai", local);
  const grok = await askDesk({
    data: {
      text: `Write a 3-sentence trade thesis for ${symbol}. Last ${last}. Be specific, no hype.`,
      selected: symbol,
      last,
      equity: selectAccount(s).equity,
      positions: selectPositions(s)
        .map((p) => `${p.symbol}:${p.qty}`)
        .join(","),
    },
  });
  if (grok.ok && grok.say) s.log("ai", grok.say);
}

export async function runConsole(raw: string) {
  const s = useDesk.getState();
  const text = raw.trim();
  if (!text) return;
  s.log("cmd", text);
  const last = s.quotes[s.selected]?.last;
  const cmd = parseCommand(text, last);

  if (!cmd) return;

  if (cmd.op === "help") {
    s.log("sys", helpText());
    return;
  }
  if (cmd.op === "status") {
    const acct = selectAccount(s);
    const pos = selectPositions(s);
    s.log(
      "sys",
      `EQ ${acct.equity.toFixed(2)}  CASH ${acct.cash.toFixed(2)}  DAY ${acct.dayPl.toFixed(2)}  N=${pos.length}  ${s.halted ? "HALTED" : "LIVE"}`,
    );
    for (const p of pos) {
      s.log(
        "sys",
        `  ${p.symbol}  ${p.qty}  @${p.avgPrice.toFixed(2)}  pnl ${p.unrealizedPl.toFixed(0)}`,
      );
    }
    return;
  }
  if (cmd.op === "halt") {
    await killSwitch(false);
    return;
  }
  if (cmd.op === "resume") {
    s.setHalted(false);
    s.log("sys", "Desk resumed");
    return;
  }
  if (cmd.op === "flatten") {
    await flatten(cmd.symbol);
    return;
  }
  if (cmd.op === "cancel") {
    if (s.venue === "sim") s.setSim(cancelAllSim(s.sim));
    else if (s.creds) await cancelAllAlpaca({ data: { venue: s.venue, creds: s.creds } });
    s.log("sys", "Canceled working");
    return;
  }
  if (cmd.op === "thesis") {
    s.setSelected(cmd.symbol);
    await runThesis(cmd.symbol);
    return;
  }
  if (cmd.op === "watch") {
    if (cmd.action === "add") s.addWatch(cmd.symbol);
    else s.rmWatch(cmd.symbol);
    s.log("sys", `Watchlist ${cmd.action} ${cmd.symbol}`);
    await refreshQuotes();
    return;
  }
  if (cmd.op === "arm" || cmd.op === "disarm") {
    const st = s.strategies.find((x) => x.id === cmd.id);
    if (!st) {
      s.log("err", `No strategy ${cmd.id}`);
      return;
    }
    s.patchStrategy(st.id, { armed: cmd.op === "arm" });
    s.log("sys", `${cmd.op.toUpperCase()} ${st.name}`);
    return;
  }
  if (cmd.op === "select") {
    s.setSelected(cmd.symbol);
    if (!s.watchlist.includes(cmd.symbol)) s.addWatch(cmd.symbol);
    return;
  }
  if (cmd.op === "order") {
    await placeOrder(cmd.request);
    return;
  }
  if (cmd.op === "ask") {
    const grok = await askDesk({
      data: {
        text: cmd.text,
        selected: s.selected,
        last,
        equity: selectAccount(s).equity,
        positions: selectPositions(s)
          .map((p) => `${p.symbol}:${p.qty}`)
          .join(","),
      },
    });
    if (!grok.ok) {
      s.log("err", grok.error + " — use HELP for the command language.");
      return;
    }
    if (grok.say) s.log("ai", grok.say);
    if (grok.commands.length) await runGrokCommands(grok.commands);
  }
}

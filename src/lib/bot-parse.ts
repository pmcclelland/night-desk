import { normalizeSymbol } from "@/lib/universe";
import type { OrderRequest, OrderSide, OrderType, TimeInForce } from "@/lib/types";

export type BotCommand =
  | { op: "order"; request: OrderRequest }
  | { op: "flatten"; symbol?: string }
  | { op: "cancel"; id?: string }
  | { op: "halt" }
  | { op: "resume" }
  | { op: "status" }
  | { op: "help" }
  | { op: "clear" }
  | { op: "thesis"; symbol: string }
  | { op: "watch"; action: "add" | "rm"; symbol: string }
  | { op: "arm"; id: string }
  | { op: "disarm"; id: string }
  | { op: "select"; symbol: string };

const HELP = `Commands
  BUY 10 AAPL                 market buy
  SELL 5 NVDA                 market sell
  BUY 10 AAPL 185.5           limit buy
  STOP SELL 10 AAPL 170       stop sell
  BUY AAPL $2500              notional market
  FLATTEN AAPL | FLATTEN ALL
  CANCEL ALL
  ARM sma-spy | DISARM sma-spy
  THESIS NVDA
  WATCH ADD AMD | WATCH RM AMD
  HALT | RESUME | STATUS | HELP | CLEAR
Freeform lives on the Grok Bot.`;

export function helpText() {
  return HELP;
}

function sideOf(w: string): OrderSide | null {
  if (w === "BUY" || w === "LONG" || w === "COVER") return "buy";
  if (w === "SELL" || w === "SHORT") return "sell";
  return null;
}

export function parseCommand(raw: string, lastPrice?: number): BotCommand | null {
  const text = raw.trim();
  if (!text) return null;
  const u = text.toUpperCase();

  if (u === "HELP" || u === "?") return { op: "help" };
  if (u === "CLEAR" || u === "CLS" || u === "CLR") return { op: "clear" };
  if (u === "STATUS" || u === "POS" || u === "POSITIONS") return { op: "status" };
  if (u === "HALT" || u === "KILL" || u === "KILL SWITCH" || u === "STOP BOT") return { op: "halt" };
  if (u === "RESUME" || u === "UNHALT") return { op: "resume" };
  if (u === "FLATTEN" || u === "FLATTEN ALL" || u === "CLOSE ALL") return { op: "flatten" };
  if (u === "CANCEL" || u === "CANCEL ALL" || u === "CXL ALL") return { op: "cancel" };

  const flatten = u.match(/^FLATTEN\s+([A-Z][A-Z0-9.]{0,9})$/);
  if (flatten?.[1]) return { op: "flatten", symbol: flatten[1] };

  const thesis = u.match(/^(THESIS|ANALYZE|ANALYSE)\s+([A-Z][A-Z0-9.]{0,9})$/);
  if (thesis?.[2]) return { op: "thesis", symbol: thesis[2] };

  const watch = u.match(/^WATCH\s+(ADD|RM|REMOVE|DEL)\s+([A-Z][A-Z0-9.]{0,9})$/);
  if (watch?.[1] && watch[2]) {
    return { op: "watch", action: watch[1] === "ADD" ? "add" : "rm", symbol: watch[2] };
  }

  const arm = u.match(/^(ARM|DISARM)\s+([A-Z0-9._-]+)$/);
  if (arm?.[1] && arm[2]) {
    return { op: arm[1] === "ARM" ? "arm" : "disarm", id: arm[2].toLowerCase() };
  }

  const select = u.match(/^(SELECT|CHART|SHOW)\s+([A-Z][A-Z0-9.]{0,9})$/);
  if (select?.[2]) return { op: "select", symbol: select[2] };

  // STOP BUY/SELL qty SYM price
  const stop = u.match(/^STOP\s+(BUY|SELL)\s+(\d+(?:\.\d+)?)\s+([A-Z][A-Z0-9.]{0,9})\s+(\d+(?:\.\d+)?)$/);
  if (stop) {
    return {
      op: "order",
      request: {
        symbol: stop[3]!,
        side: stop[1] === "BUY" ? "buy" : "sell",
        type: "stop",
        qty: Number(stop[2]),
        tif: "day",
        stopPrice: Number(stop[4]),
        source: "bot",
      },
    };
  }

  // BUY/SELL qty SYM [limit] [GTC|DAY|IOC]
  const mkt = u.match(
    /^(BUY|SELL|LONG|SHORT|COVER)\s+(\d+(?:\.\d+)?)\s+([A-Z][A-Z0-9.]{0,9})(?:\s+(\d+(?:\.\d+)?))?(?:\s+(DAY|GTC|IOC))?$/,
  );
  if (mkt) {
    const side = sideOf(mkt[1]!)!;
    const limit = mkt[4] ? Number(mkt[4]) : undefined;
    const tif = ((mkt[5]?.toLowerCase() as TimeInForce) ?? "day") as TimeInForce;
    const type: OrderType = limit !== undefined ? "limit" : "market";
    return {
      op: "order",
      request: {
        symbol: mkt[3]!,
        side,
        type,
        qty: Number(mkt[2]),
        tif,
        limitPrice: limit,
        source: "bot",
      },
    };
  }

  // BUY SYM $2500
  const notional = u.match(/^(BUY|SELL)\s+([A-Z][A-Z0-9.]{0,9})\s+\$(\d+(?:\.\d+)?)$/);
  if (notional && lastPrice && lastPrice > 0) {
    const dollars = Number(notional[3]);
    const qty = Math.floor((dollars / lastPrice) * 10000) / 10000;
    return {
      op: "order",
      request: {
        symbol: notional[2]!,
        side: notional[1] === "BUY" ? "buy" : "sell",
        type: "market",
        qty,
        tif: "day",
        source: "bot",
      },
    };
  }

  // Bare ticker
  if (/^[A-Z]{1,5}$/.test(u) && u.length <= 5) {
    return { op: "select", symbol: normalizeSymbol(u) };
  }

  return null;
}

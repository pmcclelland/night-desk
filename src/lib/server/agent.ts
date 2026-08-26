import { executeDeskOp, quotesForDesk, type DeskOp } from "@/lib/server/desk-engine";
import { loadDesk } from "@/lib/server/desk-store";
import type { OrderRequest, OrderSide, OrderType, TimeInForce } from "@/lib/types";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "desk_status",
      description: "Equity, cash, day P&L, positions, venue, halt, watchlist, armed strategies.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quotes",
      description: "Last prices for symbols. Defaults to the watchlist plus selected.",
      parameters: {
        type: "object",
        properties: { symbols: { type: "array", items: { type: "string" } } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_order",
      description: "Place an order on the operator desk. Respects halt and risk caps.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          side: { type: "string", enum: ["buy", "sell"] },
          qty: { type: "number" },
          type: { type: "string", enum: ["market", "limit", "stop"] },
          limitPrice: { type: "number" },
          stopPrice: { type: "number" },
          tif: { type: "string", enum: ["day", "gtc", "ioc"] },
        },
        required: ["symbol", "side", "qty"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flatten",
      description: "Close a position, or all positions if symbol omitted.",
      parameters: { type: "object", properties: { symbol: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_orders",
      description: "Cancel one working order by id, or all working orders.",
      parameters: { type: "object", properties: { id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "halt",
      description: "Halt the desk, disarm strategies, cancel working orders. Optionally flatten.",
      parameters: { type: "object", properties: { flatten: { type: "boolean" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "resume",
      description: "Resume a halted desk.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "watch",
      description: "Add or remove a symbol from the watchlist.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "rm"] },
          symbol: { type: "string" },
        },
        required: ["action", "symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "select",
      description: "Focus the desk on a symbol.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string" } },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "arm_strategy",
      description: "Arm or disarm a strategy by id (sma-spy, mean-qqq, break-nvda, mtm-tsla).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          armed: { type: "boolean" },
        },
        required: ["id", "armed"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "thesis",
      description: "Local indicator thesis for a symbol.",
      parameters: { type: "object", properties: { symbol: { type: "string" } } },
    },
  },
];

const SYSTEM = `You are the NIGHTDESK desk agent — a terse institutional trading copilot for a single-operator desk.
Use tools to inspect state and to trade. Do not place orders unless the operator clearly asked.
If they asked for analysis, call thesis and then answer in 1–3 short sentences. No hype, no emoji.
USD notional: convert to shares with get_quotes last price, floor to 4 decimals.
When you trade, confirm what you did in one line.`;

type ToolCall = {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

function asSide(v: unknown): OrderSide {
  return v === "sell" ? "sell" : "buy";
}
function asType(v: unknown): OrderType {
  return v === "limit" || v === "stop" ? v : "market";
}
function asTif(v: unknown): TimeInForce {
  return v === "gtc" || v === "ioc" ? v : "day";
}
function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

async function runTool(userId: string, name: string, rawArgs: string): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    args = {};
  }

  const toOp = (): DeskOp | null => {
    if (name === "desk_status") return { op: "status" };
    if (name === "flatten") {
      return { op: "flatten", symbol: typeof args.symbol === "string" ? args.symbol : undefined };
    }
    if (name === "cancel_orders") {
      return { op: "cancel", id: typeof args.id === "string" ? args.id : undefined };
    }
    if (name === "halt") return { op: "halt", flatten: Boolean(args.flatten) };
    if (name === "resume") return { op: "resume" };
    if (name === "watch" && typeof args.symbol === "string") {
      return { op: "watch", action: args.action === "rm" ? "rm" : "add", symbol: args.symbol };
    }
    if (name === "select" && typeof args.symbol === "string") return { op: "select", symbol: args.symbol };
    if (name === "arm_strategy" && typeof args.id === "string") {
      return args.armed === false ? { op: "disarm", id: args.id } : { op: "arm", id: args.id };
    }
    if (name === "thesis") {
      return { op: "thesis", symbol: typeof args.symbol === "string" ? args.symbol : undefined };
    }
    if (name === "place_order" && typeof args.symbol === "string") {
      const qty = num(args.qty);
      if (!qty) return null;
      const request: OrderRequest = {
        symbol: args.symbol,
        side: asSide(args.side),
        type: asType(args.type),
        qty,
        tif: asTif(args.tif),
        limitPrice: num(args.limitPrice),
        stopPrice: num(args.stopPrice),
        source: "bot",
      };
      return { op: "place_order", request };
    }
    return null;
  };

  if (name === "get_quotes") {
    const symbols = Array.isArray(args.symbols)
      ? args.symbols.filter((s): s is string => typeof s === "string")
      : undefined;
    const pack = await quotesForDesk(userId, symbols);
    return Object.fromEntries(
      Object.entries(pack.quotes).map(([sym, q]) => [
        sym,
        { last: q.last, changePct: q.changePct, bid: q.bid, ask: q.ask },
      ]),
    );
  }

  const op = toOp();
  if (!op) return { error: `Unknown tool ${name}` };
  const result = await executeDeskOp(userId, op);
  return {
    ok: result.ok,
    error: result.error,
    message: result.message,
    extra: result.extra,
  };
}

export async function runDeskAgent(
  userId: string,
  text: string,
): Promise<{ ok: true; say: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "Grok is not available in this environment" };

  const desk = await loadDesk(userId);
  const context = `Venue ${desk.venue} · selected ${desk.selected} · halted ${desk.halted} · watch ${desk.watchlist.join(",")}`;
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `${context}\n\n${text}` },
  ];

  try {
    for (let round = 0; round < 6; round++) {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.2,
          max_tokens: 600,
          tools: TOOLS,
          messages,
        }),
      });
      if (!res.ok) return { ok: false, error: `xAI ${res.status}` };
      const body = (await res.json()) as {
        choices: Array<{
          finish_reason?: string;
          message: { content?: string | null; tool_calls?: ToolCall[] };
        }>;
      };
      const msg = body.choices[0]?.message;
      if (!msg) return { ok: false, error: "Empty Grok response" };

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        const say = (msg.content ?? "").trim();
        return { ok: true, say: say.slice(0, 1200) };
      }

      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: calls,
      });

      for (const call of calls) {
        const out = await runTool(userId, call.function.name, call.function.arguments);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(out),
        });
      }
    }
    return { ok: true, say: "Stopped after tool loop. Check STATUS." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Grok failed" };
  }
}

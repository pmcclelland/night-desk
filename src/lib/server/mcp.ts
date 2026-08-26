import { executeDeskOp, quotesForDesk, type DeskOp } from "@/lib/server/desk-engine";
import type { OrderRequest } from "@/lib/types";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type ToolContent = { type: "text"; text: string };

const SERVER_INFO = {
  name: "nightdesk",
  version: "1.0.0",
  title: "NightDesk",
};

const INSTRUCTIONS = `NightDesk is a single-operator trading desk. Tools act on the owner's live venue (SIM, Alpaca paper, or Alpaca live). Halt and risk caps apply. Prefer desk_status before trading. Do not flatten or place live orders unless the operator clearly asked. bot_log reads the BOT panel tape; bot_say posts a line the operator sees there.`;

const TOOLS = [
  {
    name: "desk_status",
    description: "Equity, positions, venue, halt, watchlist, strategies.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_quotes",
    description: "Last prices. Optional symbols; defaults to watchlist.",
    inputSchema: {
      type: "object",
      properties: { symbols: { type: "array", items: { type: "string" } } },
    },
  },
  {
    name: "place_order",
    description: "Place an order. Halted desks reject.",
    inputSchema: {
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
  {
    name: "flatten",
    description: "Close one symbol or the whole book.",
    inputSchema: { type: "object", properties: { symbol: { type: "string" } } },
  },
  {
    name: "cancel_orders",
    description: "Cancel one id or all working orders.",
    inputSchema: { type: "object", properties: { id: { type: "string" } } },
  },
  {
    name: "halt",
    description: "Halt, disarm, cancel. flatten=true also closes positions.",
    inputSchema: { type: "object", properties: { flatten: { type: "boolean" } } },
  },
  {
    name: "resume",
    description: "Resume a halted desk.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "watch",
    description: "Add or remove a watchlist symbol.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "rm"] },
        symbol: { type: "string" },
      },
      required: ["action", "symbol"],
    },
  },
  {
    name: "select",
    description: "Focus the desk on a symbol.",
    inputSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
    },
  },
  {
    name: "arm_strategy",
    description: "Arm or disarm a strategy by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, armed: { type: "boolean" } },
      required: ["id", "armed"],
    },
  },
  {
    name: "thesis",
    description: "Indicator thesis for a symbol.",
    inputSchema: { type: "object", properties: { symbol: { type: "string" } } },
  },
  {
    name: "bot_log",
    description: "Read recent lines from the operator BOT panel.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "How many lines, default 40, max 200" } },
    },
  },
  {
    name: "bot_say",
    description: "Post a line to the operator BOT panel. Use for status the operator should see on the desk.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
];

function ok(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function fail(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function asArgs(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object") return {};
  const rec = params as Record<string, unknown>;
  if (rec.arguments && typeof rec.arguments === "object") {
    return rec.arguments as Record<string, unknown>;
  }
  return rec;
}
function toolName(params: unknown): string {
  if (!params || typeof params !== "object") return "";
  const rec = params as Record<string, unknown>;
  return typeof rec.name === "string" ? rec.name : "";
}
function textResult(data: unknown, isError = false) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text } satisfies ToolContent],
    structuredContent: typeof data === "object" ? data : { result: data },
    isError,
  };
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

async function callTool(userId: string, name: string, args: Record<string, unknown>) {
  if (name === "get_quotes") {
    const symbols = Array.isArray(args.symbols)
      ? args.symbols.filter((s): s is string => typeof s === "string")
      : undefined;
    const pack = await quotesForDesk(userId, symbols);
    return textResult({
      source: pack.source,
      quotes: Object.fromEntries(
        Object.entries(pack.quotes).map(([sym, q]) => [sym, { last: q.last, changePct: q.changePct }]),
      ),
    });
  }

  const op = ((): DeskOp | null => {
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
    if (name === "bot_log") return { op: "bot_log", limit: num(args.limit) };
    if (name === "bot_say" && typeof args.text === "string") return { op: "bot_say", text: args.text };
    if (name === "place_order" && typeof args.symbol === "string") {
      const qty = num(args.qty);
      if (!qty) return null;
      const request: OrderRequest = {
        symbol: args.symbol,
        side: args.side === "sell" ? "sell" : "buy",
        type: args.type === "limit" || args.type === "stop" ? args.type : "market",
        qty,
        tif: args.tif === "gtc" || args.tif === "ioc" ? args.tif : "day",
        limitPrice: num(args.limitPrice),
        stopPrice: num(args.stopPrice),
        source: "bot",
      };
      return { op: "place_order", request };
    }
    return null;
  })();

  if (!op) throw new Error(`Unknown tool: ${name}`);
  const result = await executeDeskOp(userId, op);
  return textResult(
    { ok: result.ok, error: result.error, message: result.message, extra: result.extra },
    !result.ok,
  );
}

export const MCP_TOOL_NAMES = TOOLS.map((t) => t.name);

export async function handleJsonRpc(userId: string, body: unknown): Promise<{
  payload: unknown | null;
  notification: boolean;
}> {
  if (Array.isArray(body)) {
    const responses = [];
    let notifications = 0;
    for (const item of body) {
      const r = await handleOne(userId, item);
      if (r === null) notifications += 1;
      else responses.push(r);
    }
    if (responses.length === 0) return { payload: null, notification: true };
    return { payload: responses, notification: notifications === body.length };
  }
  const one = await handleOne(userId, body);
  return { payload: one, notification: one === null };
}

async function handleOne(userId: string, raw: unknown): Promise<unknown | null> {
  if (!raw || typeof raw !== "object") return fail(null, -32600, "Invalid request");
  const req = raw as JsonRpcRequest;
  const id = (req.id ?? null) as JsonRpcId;
  const method = req.method ?? "";
  const isNotification = !("id" in req) || req.id === undefined;

  try {
    switch (method) {
      case "initialize": {
        const params = (req.params ?? {}) as { protocolVersion?: string };
        const version =
          params.protocolVersion === "2025-03-26" ||
          params.protocolVersion === "2024-11-05" ||
          params.protocolVersion === "2025-06-18"
            ? params.protocolVersion
            : "2025-03-26";
        return ok(id, {
          protocolVersion: version,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        });
      }
      case "notifications/initialized":
      case "notifications/cancelled":
        return null;
      case "ping":
        return ok(id, {});
      case "tools/list":
        return ok(id, { tools: TOOLS });
      case "tools/call": {
        const name = toolName(req.params);
        const args = asArgs(req.params);
        try {
          return ok(id, await callTool(userId, name, args));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Tool failed";
          return ok(id, textResult({ error: message }, true));
        }
      }
      case "resources/list":
        return ok(id, { resources: [] });
      case "prompts/list":
        return ok(id, { prompts: [] });
      default:
        if (isNotification) return null;
        return fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return fail(id, -32603, message);
  }
}

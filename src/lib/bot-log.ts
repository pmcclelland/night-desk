import type { BotLine } from "@/lib/types";

export type BotTape = {
  lines: BotLine[];
  clearedAt: number;
};

const KINDS: ReadonlySet<BotLine["kind"]> = new Set(["cmd", "fill", "signal", "sys", "err", "ai"]);

function isLine(value: unknown): value is BotLine {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<BotLine>;
  return (
    typeof row.id === "string" &&
    typeof row.t === "number" &&
    Number.isFinite(row.t) &&
    typeof row.text === "string" &&
    typeof row.kind === "string" &&
    KINDS.has(row.kind)
  );
}

export function mergeBotLogs(a: BotLine[], b: BotLine[]): BotLine[] {
  const map = new Map<string, BotLine>();
  for (const line of a) map.set(line.id, line);
  for (const line of b) map.set(line.id, line);
  return [...map.values()].sort((x, y) => x.t - y.t).slice(-200);
}

export function parseBotTape(value: unknown): BotTape {
  if (typeof value === "string") {
    try {
      return parseBotTape(JSON.parse(value) as unknown);
    } catch {
      return { lines: [], clearedAt: 0 };
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rec = value as { lines?: unknown; clearedAt?: unknown };
    const clearedAt =
      typeof rec.clearedAt === "number" && Number.isFinite(rec.clearedAt) ? rec.clearedAt : 0;
    const lines = Array.isArray(rec.lines) ? rec.lines.filter(isLine) : [];
    return { clearedAt, lines: lines.filter((l) => l.t >= clearedAt).slice(-200) };
  }
  if (Array.isArray(value)) {
    return { clearedAt: 0, lines: value.filter(isLine).slice(-200) };
  }
  return { lines: [], clearedAt: 0 };
}

export function mergeBotTapes(a: BotTape, b: BotTape): BotTape {
  const clearedAt = Math.max(a.clearedAt, b.clearedAt);
  return {
    clearedAt,
    lines: mergeBotLogs(a.lines, b.lines).filter((l) => l.t >= clearedAt),
  };
}

export function serializeBotTape(tape: BotTape): string {
  return JSON.stringify({
    v: 2,
    clearedAt: tape.clearedAt,
    lines: tape.lines.slice(-200),
  });
}

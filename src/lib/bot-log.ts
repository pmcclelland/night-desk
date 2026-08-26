import type { BotLine } from "@/lib/types";

export function mergeBotLogs(a: BotLine[], b: BotLine[]): BotLine[] {
  const map = new Map<string, BotLine>();
  for (const line of a) map.set(line.id, line);
  for (const line of b) map.set(line.id, line);
  return [...map.values()].sort((x, y) => x.t - y.t).slice(-200);
}

import type { Bar, BarRange } from "@/lib/types";

/** Alpaca rejects fractional seconds in RFC-3339 start/end. */
export function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function rangeWindow(range: BarRange, now = Date.now()): { start: string; end: string } {
  const end = new Date(now);
  end.setUTCMilliseconds(0);
  const start = new Date(end.getTime());
  switch (range) {
    case "1D":
      // Weekend + holiday pad; clipBarsForRange keeps the last ET session.
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case "5D":
      start.setUTCDate(start.getUTCDate() - 12);
      break;
    case "1M":
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "6M":
      start.setUTCMonth(start.getUTCMonth() - 6);
      break;
    case "1Y":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
  }
  return { start: rfc3339(start), end: rfc3339(end) };
}

export function etDateKey(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export function normalizeBars(raw: Bar[]): Bar[] {
  return raw
    .filter(
      (b) =>
        Number.isFinite(b.t) && [b.o, b.h, b.l, b.c].every((n) => typeof n === "number" && Number.isFinite(n)),
    )
    .map((b) => ({
      t: b.t,
      o: b.o,
      h: Math.max(b.h, b.o, b.c),
      l: Math.min(b.l, b.o, b.c),
      c: b.c,
      v: Number.isFinite(b.v) ? b.v : 0,
    }))
    .sort((a, b) => a.t - b.t);
}

function lastEtSessions(bars: Bar[], sessions: number): Bar[] {
  if (sessions <= 0 || bars.length === 0) return [];
  let remaining = sessions;
  let prev = "";
  let startIdx = 0;
  for (let i = bars.length - 1; i >= 0; i--) {
    const d = etDateKey(bars[i]!.t);
    if (d !== prev) {
      remaining -= 1;
      prev = d;
      if (remaining < 0) {
        startIdx = i + 1;
        break;
      }
    }
  }
  return bars.slice(startIdx);
}

/** Keep 1D/5D to the last N New York sessions so a padded start doesn't smear extra days. */
export function clipBarsForRange(bars: Bar[], range: BarRange): Bar[] {
  const clean = normalizeBars(bars);
  if (range === "1D") return lastEtSessions(clean, 1);
  if (range === "5D") return lastEtSessions(clean, 5);
  return clean;
}

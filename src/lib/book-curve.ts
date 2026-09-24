import { etDateKey, rfc3339 } from "./bar-window.ts";
import type { Bar, CurveRange, EquityPoint } from "./types.ts";

export const CURVE_RANGES: CurveRange[] = ["1W", "1M", "3M"];

export type BookCurveLabel = "sim" | "alpaca";

export type BookCurveSnapshot = {
  range: CurveRange;
  label: BookCurveLabel;
  book: EquityPoint[];
  spy: EquityPoint[];
  bookRet: number | null;
  spyRet: number | null;
  vsSpy: number | null;
};

export function nextCurveRange(range: CurveRange): CurveRange {
  const i = CURVE_RANGES.indexOf(range);
  return CURVE_RANGES[(i + 1) % CURVE_RANGES.length] ?? "1M";
}

export function curveWindow(range: CurveRange, now = Date.now()): { start: string; end: string } {
  const end = new Date(now);
  end.setUTCMilliseconds(0);
  const start = new Date(end.getTime());
  switch (range) {
    case "1W":
      start.setUTCDate(start.getUTCDate() - 12);
      break;
    case "1M":
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "3M":
      start.setUTCMonth(start.getUTCMonth() - 3);
      break;
    default: {
      const _never: never = range;
      return _never;
    }
  }
  return { start: rfc3339(start), end: rfc3339(end) };
}

export function clipEquityForCurve(
  points: EquityPoint[],
  range: CurveRange,
  now = Date.now(),
): EquityPoint[] {
  const startMs = Date.parse(curveWindow(range, now).start);
  const filtered = points
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.t >= startMs)
    .sort((a, b) => a.t - b.t);
  if (range === "1W") return lastEtSessions(filtered, 5);
  return filtered;
}

function lastEtSessions(points: EquityPoint[], sessions: number): EquityPoint[] {
  if (sessions <= 0 || points.length === 0) return [];
  let remaining = sessions;
  let prev = "";
  let startIdx = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const d = etDateKey(points[i]!.t);
    if (d !== prev) {
      remaining -= 1;
      prev = d;
      if (remaining < 0) {
        startIdx = i + 1;
        break;
      }
    }
  }
  return points.slice(startIdx);
}

export function seriesReturn(points: EquityPoint[]): number | null {
  const first = points[0]?.v;
  const last = points[points.length - 1]?.v;
  if (typeof first !== "number" || typeof last !== "number" || first === 0) return null;
  return ((last - first) / first) * 100;
}

export function alignByEtDay(
  book: EquityPoint[],
  spy: EquityPoint[],
): { book: EquityPoint[]; spy: EquityPoint[] } {
  const spyByDay = new Map<string, EquityPoint>();
  for (const p of spy) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.v) || p.v === 0) continue;
    spyByDay.set(etDateKey(p.t), p);
  }
  const alignedBook: EquityPoint[] = [];
  const alignedSpy: EquityPoint[] = [];
  for (const b of book) {
    if (!Number.isFinite(b.t) || !Number.isFinite(b.v)) continue;
    const s = spyByDay.get(etDateKey(b.t));
    if (!s) continue;
    alignedBook.push(b);
    alignedSpy.push(s);
  }
  return { book: alignedBook, spy: alignedSpy };
}

export function rebaseToStart(points: EquityPoint[], startValue: number): EquityPoint[] {
  const first = points[0]?.v;
  if (typeof first !== "number" || first === 0 || !Number.isFinite(startValue)) return [];
  return points.map((p) => ({ t: p.t, v: startValue * (p.v / first) }));
}

export function reconstructSimCurve(
  lots: { symbol: string; qty: number }[],
  barsBySymbol: Record<string, Bar[]>,
  cash: number,
): EquityPoint[] {
  const symbols = lots.map((l) => l.symbol);
  const closesByDay = new Map<string, { t: number; closes: Record<string, number> }>();
  for (const sym of symbols) {
    for (const bar of barsBySymbol[sym] ?? []) {
      if (!Number.isFinite(bar.t) || !Number.isFinite(bar.c)) continue;
      const day = etDateKey(bar.t);
      const row = closesByDay.get(day) ?? { t: bar.t, closes: {} };
      row.closes[sym] = bar.c;
      if (bar.t > row.t) row.t = bar.t;
      closesByDay.set(day, row);
    }
  }
  const days = [...closesByDay.entries()].sort((a, b) => a[1].t - b[1].t);
  const last: Record<string, number> = {};
  const out: EquityPoint[] = [];
  for (const [, row] of days) {
    for (const [sym, c] of Object.entries(row.closes)) last[sym] = c;
    if (lots.some((lot) => last[lot.symbol] == null)) continue;
    let equity = cash;
    for (const lot of lots) equity += lot.qty * (last[lot.symbol] as number);
    out.push({ t: row.t, v: equity });
  }
  return out;
}

export function toBookCurveSnapshot(input: {
  range: CurveRange;
  label: BookCurveLabel;
  book: EquityPoint[];
  spy: EquityPoint[];
  now?: number;
}): BookCurveSnapshot {
  const book = clipEquityForCurve(input.book, input.range, input.now);
  const spyRaw = clipEquityForCurve(input.spy, input.range, input.now);
  const aligned = alignByEtDay(book, spyRaw);
  const start = aligned.book[0]?.v ?? 0;
  const spy = rebaseToStart(aligned.spy, start);
  const bookRet = seriesReturn(aligned.book);
  const spyRet = seriesReturn(aligned.spy);
  return {
    range: input.range,
    label: input.label,
    book: aligned.book,
    spy,
    bookRet,
    spyRet,
    vsSpy: bookRet != null && spyRet != null ? bookRet - spyRet : null,
  };
}

export function formatCurveAxis(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString("en-US");
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function niceNum(range: number, round: boolean) {
  const exp = Math.floor(Math.log10(range));
  const f = range / 10 ** exp;
  let nf: number;
  if (round) {
    if (f < 1.5) nf = 1;
    else if (f < 3) nf = 2;
    else if (f < 7) nf = 5;
    else nf = 10;
  } else if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * 10 ** exp;
}

export function niceTicks(min: number, max: number, count = 5) {
  const range = niceNum(max - min || 1, false);
  const step = niceNum(range / (count - 1), true);
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) out.push(v);
  return out;
}

/** Nice ticks from the raw series, then pad so the floor is not a gridline. */
export function curvePlotScale(lo: number, hi: number) {
  const span = (Number.isFinite(hi) && Number.isFinite(lo) ? hi - lo : 0) || 1;
  const min = lo - span * 0.08;
  const max = hi + span * 0.08;
  const ticks = niceTicks(lo, hi, 5).filter((t) => t > lo + span * 1e-6);
  return { min, max, ticks };
}

/** Below Tailwind `sm`, pin the first/last x labels to the plot edges so they stay whole. */
export const NARROW_CURVE_W = 640;

export function curveTimeLabelPlacement(
  i: number,
  labeled: number[],
  x: number,
  padL: number,
  plotW: number,
  width: number,
): { x: number; anchor: "start" | "middle" | "end" } {
  if (width >= NARROW_CURVE_W) return { x, anchor: "middle" };
  if (i === labeled[0]) return { x: padL, anchor: "start" };
  if (i === labeled[labeled.length - 1]) return { x: padL + plotW, anchor: "end" };
  return { x, anchor: "middle" };
}

export function barsToPoints(bars: Bar[]): EquityPoint[] {
  return bars
    .filter((b) => Number.isFinite(b.t) && Number.isFinite(b.c))
    .map((b) => ({ t: b.t, v: b.c }))
    .sort((a, b) => a.t - b.t);
}

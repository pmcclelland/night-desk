import type { Bar } from "@/lib/types";

export function sma(values: number[], period: number): number[] {
  const out: number[] = Array(values.length).fill(NaN);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= period) sum -= values[i - period] ?? 0;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function stdev(values: number[], period: number): number[] {
  const out: number[] = Array(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let mean = 0;
    for (let j = i - period + 1; j <= i; j++) mean += values[j] ?? 0;
    mean /= period;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = (values[j] ?? 0) - mean;
      v += d * d;
    }
    out[i] = Math.sqrt(v / period);
  }
  return out;
}

export function closes(bars: Bar[]) {
  return bars.map((b) => b.c);
}

export function lastFinite(arr: number[]) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== undefined && Number.isFinite(v)) return v;
  }
  return NaN;
}

export function rsi(values: number[], period = 14): number[] {
  const out: number[] = Array(values.length).fill(NaN);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let ag = gain / period;
  let al = loss / period;
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < values.length; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    ag = (ag * (period - 1) + g) / period;
    al = (al * (period - 1) + l) / period;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

export function localThesis(symbol: string, last: number, bars: Bar[]) {
  const c = closes(bars);
  if (c.length < 30) {
    return `${symbol} ${last.toFixed(2)} — not enough history for a setup.`;
  }
  const s20 = lastFinite(sma(c, 20));
  const s50 = lastFinite(sma(c, 50));
  const r = lastFinite(rsi(c, 14));
  const hi = Math.max(...bars.slice(-20).map((b) => b.h));
  const lo = Math.min(...bars.slice(-20).map((b) => b.l));
  const vs20 = Number.isFinite(s20) ? ((last - s20) / s20) * 100 : 0;
  const trend =
    Number.isFinite(s20) && Number.isFinite(s50)
      ? s20 > s50
        ? "intermediate trend up (SMA20 > SMA50)"
        : "intermediate trend down (SMA20 < SMA50)"
      : "trend mixed";
  const stretch =
    vs20 > 4 ? "extended vs SMA20" : vs20 < -4 ? "washed out vs SMA20" : "near SMA20";
  const rsiNote = Number.isFinite(r)
    ? r > 70
      ? `RSI ${r.toFixed(0)} overbought`
      : r < 30
        ? `RSI ${r.toFixed(0)} oversold`
        : `RSI ${r.toFixed(0)} mid-range`
    : "RSI n/a";
  const pos =
    last >= (lo + hi) / 2 ? "upper half of 20-bar range" : "lower half of 20-bar range";
  return `${symbol} ${last.toFixed(2)} · ${trend} · ${stretch} · ${rsiNote} · ${pos}.`;
}

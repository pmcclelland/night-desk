import { lastFinite, sma, stdev, closes } from "@/lib/indicators";
import type { BacktestStats, Bar, StrategyInstance, StrategyKind } from "@/lib/types";

export interface Signal {
  action: "buy" | "sell" | "flat" | "none";
  note: string;
}

export const KIND_META: Record<
  StrategyKind,
  { label: string; blurb: string; defaults: Record<string, number> }
> = {
  "sma-cross": {
    label: "SMA CROSS",
    blurb: "Buy when fast SMA crosses above slow. Flatten on the reverse.",
    defaults: { fast: 10, slow: 30 },
  },
  "mean-rev": {
    label: "MEAN REV",
    blurb: "Fade ±2σ moves versus SMA. Flatten back through the mean.",
    defaults: { period: 20, z: 2 },
  },
  breakout: {
    label: "BREAKOUT",
    blurb: "Buy a close through the N-bar high. Flatten through the N-bar low.",
    defaults: { lookback: 20 },
  },
  momentum: {
    label: "MOMENTUM",
    blurb: "Buy N-bar return above the hurdle. Flatten when it rolls over.",
    defaults: { lookback: 20, hurdle: 2 },
  },
};

export function evaluateStrategy(s: StrategyInstance, bars: Bar[]): Signal {
  const c = closes(bars);
  if (c.length < 10) return { action: "none", note: "warming up" };
  const last = c[c.length - 1] ?? NaN;

  if (s.kind === "sma-cross") {
    const fastN = s.params.fast ?? 10;
    const slowN = s.params.slow ?? 30;
    const f = sma(c, fastN);
    const sl = sma(c, slowN);
    const f0 = lastFinite(f.slice(0, -1));
    const f1 = lastFinite(f);
    const s0 = lastFinite(sl.slice(0, -1));
    const s1 = lastFinite(sl);
    if (![f0, f1, s0, s1].every(Number.isFinite)) return { action: "none", note: "warming up" };
    if (f0 <= s0 && f1 > s1) return { action: "buy", note: `fast ${f1.toFixed(2)} crossed above slow ${s1.toFixed(2)}` };
    if (f0 >= s0 && f1 < s1) return { action: "sell", note: `fast ${f1.toFixed(2)} crossed below slow ${s1.toFixed(2)}` };
    return { action: f1 > s1 ? "buy" : "flat", note: `fast ${f1.toFixed(2)} / slow ${s1.toFixed(2)}` };
  }

  if (s.kind === "mean-rev") {
    const period = s.params.period ?? 20;
    const zThr = s.params.z ?? 2;
    const m = lastFinite(sma(c, period));
    const sd = lastFinite(stdev(c, period));
    if (!Number.isFinite(m) || !Number.isFinite(sd) || sd === 0) {
      return { action: "none", note: "warming up" };
    }
    const z = (last - m) / sd;
    if (z <= -zThr) return { action: "buy", note: `z ${z.toFixed(2)} oversold vs SMA${period}` };
    if (z >= zThr) return { action: "sell", note: `z ${z.toFixed(2)} overbought vs SMA${period}` };
    if (Math.abs(z) < 0.3) return { action: "flat", note: `z ${z.toFixed(2)} at the mean` };
    return { action: "none", note: `z ${z.toFixed(2)}` };
  }

  if (s.kind === "breakout") {
    const n = Math.max(5, s.params.lookback ?? 20);
    const window = bars.slice(-n - 1, -1);
    if (window.length < n) return { action: "none", note: "warming up" };
    const hi = Math.max(...window.map((b) => b.h));
    const lo = Math.min(...window.map((b) => b.l));
    if (last > hi) return { action: "buy", note: `broke ${n}-bar high ${hi.toFixed(2)}` };
    if (last < lo) return { action: "sell", note: `broke ${n}-bar low ${lo.toFixed(2)}` };
    return { action: "none", note: `range ${lo.toFixed(2)}–${hi.toFixed(2)}` };
  }

  const n = Math.max(5, s.params.lookback ?? 20);
  const hurdle = (s.params.hurdle ?? 2) / 100;
  if (c.length <= n) return { action: "none", note: "warming up" };
  const ret = last / (c[c.length - 1 - n] ?? last) - 1;
  if (ret >= hurdle) return { action: "buy", note: `${n}-bar ${ (ret * 100).toFixed(1)}%` };
  if (ret <= -hurdle) return { action: "sell", note: `${n}-bar ${(ret * 100).toFixed(1)}%` };
  return { action: "none", note: `${n}-bar ${(ret * 100).toFixed(1)}%` };
}

export function backtest(kind: StrategyKind, params: Record<string, number>, bars: Bar[]): BacktestStats {
  const dummy: StrategyInstance = {
    id: "bt",
    kind,
    name: kind,
    symbol: "X",
    qty: 1,
    armed: false,
    params,
    lastSignal: "none",
    lastFiredAt: 0,
    note: "",
  };
  let pos = 0;
  let entry = 0;
  let trades = 0;
  let wins = 0;
  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  for (let i = 30; i < bars.length; i++) {
    const slice = bars.slice(0, i + 1);
    const sig = evaluateStrategy(dummy, slice);
    const px = bars[i]!.c;
    if (sig.action === "buy" && pos <= 0) {
      if (pos < 0) {
        const r = (entry - px) / entry;
        trades += 1;
        if (r > 0) wins += 1;
        equity *= 1 + r;
      }
      pos = 1;
      entry = px;
    } else if ((sig.action === "sell" || sig.action === "flat") && pos > 0) {
      const r = (px - entry) / entry;
      trades += 1;
      if (r > 0) wins += 1;
      equity *= 1 + r;
      pos = sig.action === "sell" ? -1 : 0;
      entry = px;
    }
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak);
  }
  return {
    trades,
    winRate: trades ? (wins / trades) * 100 : 0,
    netPct: (equity - 1) * 100,
    maxDdPct: maxDd * 100,
  };
}

export function defaultStrategies(): StrategyInstance[] {
  return [
    {
      id: "sma-spy",
      kind: "sma-cross",
      name: "SPY FAST/SLOW",
      symbol: "SPY",
      qty: 5,
      armed: false,
      params: { fast: 10, slow: 30 },
      lastSignal: "none",
      lastFiredAt: 0,
      note: "disarmed",
    },
    {
      id: "mr-qqq",
      kind: "mean-rev",
      name: "QQQ FADE",
      symbol: "QQQ",
      qty: 5,
      armed: false,
      params: { period: 20, z: 2 },
      lastSignal: "none",
      lastFiredAt: 0,
      note: "disarmed",
    },
    {
      id: "bo-nvda",
      kind: "breakout",
      name: "NVDA HIGH",
      symbol: "NVDA",
      qty: 8,
      armed: false,
      params: { lookback: 20 },
      lastSignal: "none",
      lastFiredAt: 0,
      note: "disarmed",
    },
    {
      id: "mo-tsla",
      kind: "momentum",
      name: "TSLA THRUST",
      symbol: "TSLA",
      qty: 6,
      armed: false,
      params: { lookback: 15, hurdle: 3 },
      lastSignal: "none",
      lastFiredAt: 0,
      note: "disarmed",
    },
  ];
}

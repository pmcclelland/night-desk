import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { Expand, Shrink } from "lucide-react";
import { sma, closes } from "@/lib/indicators";
import { normalizeBars } from "@/lib/bar-window";
import { barTime, pct, px, signClass, signedMoney, vol } from "@/lib/format";
import { nameOf } from "@/lib/universe";
import { useDesk, useLiveBook } from "@/lib/store";
import { runThesis } from "@/lib/sync";
import type { Bar, BarRange, ChartMode } from "@/lib/types";
import { Panel } from "@/components/terminal/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const RANGES: BarRange[] = ["1D", "5D", "1M", "6M", "1Y"];
const MODES: { id: ChartMode; label: string }[] = [
  { id: "candles", label: "OHLC" },
  { id: "line", label: "LINE" },
];

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

function ticks(min: number, max: number, count = 5) {
  const range = niceNum(max - min || 1, false);
  const step = niceNum(range / (count - 1), true);
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) out.push(v);
  return out;
}

export function CandleChart() {
  const selected = useDesk((s) => s.selected);
  const quotes = useDesk((s) => s.quotes);
  const bars = useDesk((s) => s.bars);
  const barRange = useDesk((s) => s.barRange);
  const setBarRange = useDesk((s) => s.setBarRange);
  const chartMode = useDesk((s) => s.chartMode);
  const setChartMode = useDesk((s) => s.setChartMode);
  const loading = useDesk((s) => s.barsLoading);
  const barsSource = useDesk((s) => s.barsSource);
  const chartFocus = useDesk((s) => s.chartFocus);
  const toggleChartFocus = useDesk((s) => s.toggleChartFocus);
  const { positions } = useLiveBook();
  const q = quotes[selected];
  const pos = positions.find((p) => p.symbol === selected);

  return (
    <Panel
      title={`${selected}  ${nameOf(selected)}`}
      action={
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setBarRange(r)}
              className={cn(
                "h-6 px-1.5 font-mono text-micro tracking-wide",
                r === barRange ? "text-accent" : "text-subtle hover:text-fg",
              )}
            >
              {r}
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void runThesis(selected)}>
            Thesis
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={toggleChartFocus}
            aria-label={chartFocus ? "Exit chart focus" : "Focus chart"}
            title={chartFocus ? "Exit chart (Esc)" : "Focus chart (F)"}
          >
            {chartFocus ? <Shrink className="size-3.5" /> : <Expand className="size-3.5" />}
          </Button>
        </div>
      }
      bodyClassName="flex min-h-0 flex-col overflow-hidden"
    >
      <div className="flex shrink-0 items-baseline gap-3 border-b border-border px-3 py-1.5">
        <span className="font-mono text-lg tabular-nums text-fg">{q ? px(q.last) : "—"}</span>
        <span className={cn("font-mono text-xs tabular-nums", signClass(q?.change ?? 0))}>
          {q ? `${signedMoney(q.change)}  ${pct(q.changePct)}` : ""}
        </span>
        {q ? (
          <span className="hidden font-mono text-micro text-muted md:inline">
            H {px(q.high)}  L {px(q.low)}  O {px(q.open)}
            {barsSource === "alpaca" ? "  IEX" : barsSource === "yahoo" ? "  YH" : ""}
          </span>
        ) : null}
        {pos ? (
          <span className={cn("ml-auto font-mono text-micro tabular-nums", signClass(pos.unrealizedPl))}>
            POS {pos.qty}  {signedMoney(pos.unrealizedPl)}
          </span>
        ) : null}
      </div>
      <div className="flex h-7 shrink-0 items-center border-b border-border px-3">
        <div role="group" aria-label="Chart mode" className="flex items-center">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setChartMode(m.id)}
              aria-pressed={chartMode === m.id}
              className={cn(
                "h-6 px-1.5 font-mono text-micro tracking-wide",
                i > 0 && "border-l border-border",
                chartMode === m.id ? "text-accent" : "text-subtle hover:text-fg",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {loading && bars.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-micro tracking-widest text-subtle uppercase">
            Loading bars
          </div>
        ) : (
          <ChartSvg bars={bars} range={barRange} last={q?.last} mode={chartMode} />
        )}
      </div>
    </Panel>
  );
}

function ChartSvg({
  bars,
  range,
  last,
  mode,
}: {
  bars: Bar[];
  range: BarRange;
  last?: number;
  mode: ChartMode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);
  const intraday = range === "1D" || range === "5D";
  const series = useMemo(() => normalizeBars(bars), [bars]);

  useEffect(() => {
    const parent = wrap.current;
    if (!parent) return;
    const apply = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    const { w, h } = size;
    if (w < 8 || h < 8 || series.length === 0) return null;
    const padL = 8;
    const padR = 52;
    const padT = 14;
    const padB = 22;
    const volH = Math.max(28, h * 0.18);
    const plotH = h - padT - padB - volH - 6;
    const plotW = w - padL - padR;
    const cs = closes(series);
    const line = mode === "line";
    const lastPx = typeof last === "number" && Number.isFinite(last) ? last : undefined;
    const hi = line
      ? Math.max(...cs, lastPx ?? Number.NEGATIVE_INFINITY)
      : Math.max(...series.map((b) => b.h), lastPx ?? Number.NEGATIVE_INFINITY);
    const lo = line
      ? Math.min(...cs, lastPx ?? Number.POSITIVE_INFINITY)
      : Math.min(...series.map((b) => b.l), lastPx ?? Number.POSITIVE_INFINITY);
    const span = (Number.isFinite(hi) && Number.isFinite(lo) ? hi - lo : 0) || 1;
    const min = lo - span * 0.04;
    const max = hi + span * 0.04;
    const maxV = Math.max(...series.map((b) => b.v), 1);
    const xAt = (i: number) => padL + ((i + 0.5) / series.length) * plotW;
    const yAt = (p: number) => padT + ((max - p) / (max - min)) * plotH;
    const candleW = Math.max(1.5, (plotW / series.length) * 0.7);
    const pathThrough = (arr: number[]) => {
      const pts: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (!Number.isFinite(v)) continue;
        pts.push(`${pts.length ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v as number).toFixed(1)}`);
      }
      return pts.join(" ");
    };
    const firstC = cs[0];
    const endC = lastPx ?? cs[cs.length - 1];
    const lineUp =
      typeof firstC === "number" && typeof endC === "number" && Number.isFinite(firstC) && Number.isFinite(endC)
        ? endC >= firstC
        : true;
    const linePath = pathThrough(cs);
    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      volH,
      plotW,
      min,
      max,
      maxV,
      xAt,
      yAt,
      candleW,
      line,
      lineUp,
      linePath,
      s20: line ? "" : pathThrough(sma(cs, 20)),
      s50: line ? "" : pathThrough(sma(cs, 50)),
      priceTicks: ticks(min, max, 5),
      timeStep: Math.max(1, Math.floor(series.length / 5)),
    };
  }, [series, last, size, mode]);

  function onMove(e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) {
    if (!layout || series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const x = clientX - rect.left;
    const i = Math.round(((x - layout.padL) / layout.plotW) * series.length - 0.5);
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  }

  return (
    <div ref={wrap} className="absolute inset-0">
      {layout ? (
        <svg
          width={layout.w}
          height={layout.h}
          className="size-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onTouchStart={onMove}
          onTouchMove={onMove}
        >
          {layout.priceTicks.map((t) => {
            const y = layout.yAt(t);
            return (
              <g key={t}>
                <line
                  x1={layout.padL}
                  x2={layout.padL + layout.plotW}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth="1"
                />
                <text
                  x={layout.w - 6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-subtle font-mono"
                  fontSize="10"
                >
                  {t >= 1000 ? t.toFixed(0) : t.toFixed(2)}
                </text>
              </g>
            );
          })}
          {layout.line ? (
            <>
              {series.map((b, i) => {
                const vh = (b.v / layout.maxV) * layout.volH;
                return (
                  <rect
                    key={`v-${b.t}`}
                    x={layout.xAt(i) - layout.candleW / 2}
                    y={layout.h - layout.padB - vh}
                    width={layout.candleW}
                    height={vh}
                    className="fill-muted opacity-35"
                  />
                );
              })}
              <path
                d={layout.linePath}
                className={cn("fill-none", layout.lineUp ? "stroke-up" : "stroke-down")}
                strokeWidth="1"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              {series.map((b, i) => {
                const x = layout.xAt(i);
                const bull = b.c >= b.o;
                const y1 = layout.yAt(Math.max(b.o, b.c));
                const y2 = layout.yAt(Math.min(b.o, b.c));
                const vh = (b.v / layout.maxV) * layout.volH;
                const cls = bull ? "stroke-up fill-up" : "stroke-down fill-down";
                return (
                  <g key={b.t} className={cls}>
                    <line x1={x} x2={x} y1={layout.yAt(b.h)} y2={layout.yAt(b.l)} strokeWidth="1" />
                    <rect
                      x={x - layout.candleW / 2}
                      y={y1}
                      width={layout.candleW}
                      height={Math.max(1, y2 - y1)}
                    />
                    <rect
                      x={x - layout.candleW / 2}
                      y={layout.h - layout.padB - vh}
                      width={layout.candleW}
                      height={vh}
                      className="opacity-35"
                    />
                  </g>
                );
              })}
              <path d={layout.s20} className="fill-none stroke-accent" strokeWidth="1" />
              <path d={layout.s50} className="fill-none stroke-muted" strokeWidth="1" />
            </>
          )}
          {last && Number.isFinite(last) ? (
            <>
              <line
                x1={layout.padL}
                x2={layout.padL + layout.plotW}
                y1={layout.yAt(last)}
                y2={layout.yAt(last)}
                className={
                  layout.line ? (layout.lineUp ? "stroke-up" : "stroke-down") : "stroke-accent"
                }
                strokeDasharray="3 3"
              />
              <rect
                x={layout.w - layout.padR}
                y={layout.yAt(last) - 8}
                width={layout.padR - 4}
                height={16}
                className={layout.line ? (layout.lineUp ? "fill-up" : "fill-down") : "fill-accent"}
              />
              <text
                x={layout.w - layout.padR / 2 - 2}
                y={layout.yAt(last)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-bg font-mono"
                fontSize="10"
              >
                {px(last)}
              </text>
            </>
          ) : null}
          {series.map((b, i) =>
            i % layout.timeStep === 0 ? (
              <text
                key={`t-${b.t}`}
                x={layout.xAt(i)}
                y={layout.h - layout.padB + 12}
                textAnchor="middle"
                className="fill-subtle font-mono"
                fontSize="10"
              >
                {barTime(b.t, intraday)}
              </text>
            ) : null,
          )}
          {hover !== null && series[hover] ? (
            <>
              <line
                x1={layout.xAt(hover)}
                x2={layout.xAt(hover)}
                y1={layout.padT}
                y2={layout.h - layout.padB}
                className="stroke-fg opacity-30"
              />
              <HoverLabel
                x={layout.xAt(hover)}
                maxW={layout.w - layout.padR}
                padL={layout.padL}
                text={
                  layout.line
                    ? `${barTime(series[hover].t, intraday)}  ${px(series[hover].c)}  V ${vol(series[hover].v)}`
                    : `${barTime(series[hover].t, intraday)}  O ${px(series[hover].o)}  H ${px(series[hover].h)}  L ${px(series[hover].l)}  C ${px(series[hover].c)}`
                }
              />
            </>
          ) : null}
        </svg>
      ) : series.length === 0 ? (
        <div className="flex h-full items-center justify-center font-mono text-micro text-subtle">
          No bars
        </div>
      ) : null}
    </div>
  );
}

function HoverLabel({ x, maxW, padL, text }: { x: number; maxW: number; padL: number; text: string }) {
  const tw = Math.min(420, text.length * 6.2 + 12);
  const bx = Math.min(Math.max(padL, x - tw / 2), maxW - tw);
  return (
    <g>
      <rect x={bx} y={2} width={tw} height={16} className="fill-surface stroke-border" />
      <text x={bx + 6} y={10} dominantBaseline="middle" className="fill-fg font-mono" fontSize="10">
        {text}
      </text>
    </g>
  );
}

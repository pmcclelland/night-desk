import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import {
  CURVE_RANGES,
  curvePlotScale,
  layoutCurveTimeLabels,
  formatCurveAxis,
  type BookCurveSnapshot,
} from "@/lib/book-curve";
import { ReviewCard } from "@/components/terminal/review-card";
import { barTime, money, pct, signClass } from "@/lib/format";
import { RANGE_LABEL, curveHeadline } from "@/lib/review-copy";
import type { CurveRange, EquityPoint } from "@/lib/types";
import { cn } from "@/lib/cn";

export function BookCurvePanel({
  range,
  onRange,
  snap,
  loading,
}: {
  range: CurveRange;
  onRange: (next: CurveRange) => void;
  snap: BookCurveSnapshot | null;
  loading: boolean;
}) {
  const bookRet = snap?.bookRet ?? null;
  const spyRet = snap?.spyRet ?? null;
  const vs = snap?.vsSpy ?? null;
  return (
    <ReviewCard
      title="How the book has moved"
      dek="Your holdings versus the S&P 500 (the SPY fund). Amber is the book; gray is the market."
      action={
        <div role="group" aria-label="Time window" className="flex items-center">
          {CURVE_RANGES.map((r, i) => (
            <Fragment key={r}>
              {i > 0 ? (
                <span className="mx-0.5 inline-block h-3 w-px shrink-0 self-center bg-border" aria-hidden />
              ) : null}
              <button
                type="button"
                aria-pressed={r === range}
                onClick={() => onRange(r)}
                className={cn(
                  "min-h-11 px-1.5 py-2 font-mono text-2xs leading-6 tracking-wide uppercase md:min-h-0 md:py-2",
                  r === range ? "text-accent" : "text-subtle hover:text-fg",
                )}
              >
                {RANGE_LABEL[r]}
              </button>
            </Fragment>
          ))}
        </div>
      }
    >
      <p className="text-base leading-relaxed text-fg text-pretty">{curveHeadline(snap)}</p>
      {snap?.label === "sim" ? (
        <p className="mt-1 text-xs text-muted">Practice book — simulated, not a live brokerage account.</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
        <span>
          <span className="text-muted">Book </span>
          <span className={signClass(bookRet ?? 0)}>{bookRet != null ? pct(bookRet) : "—"}</span>
        </span>
        <span title="S&P 500 exchange-traded fund">
          <span className="text-muted">S&P 500 </span>
          <span className={signClass(spyRet ?? 0)}>{spyRet != null ? pct(spyRet) : "—"}</span>
        </span>
        <span title="How many percentage points the book is ahead of or behind the S&P 500">
          <span className="text-muted">Gap </span>
          <span className={signClass(vs ?? 0)}>{vs != null ? pct(vs) : "—"}</span>
        </span>
      </div>
      <div className="relative mt-3 h-40">
        {loading && !snap ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            Loading the picture…
          </div>
        ) : snap && snap.book.length > 1 ? (
          <CurveSvg book={snap.book} spy={snap.spy} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            Not enough history to draw a line.
          </div>
        )}
      </div>
    </ReviewCard>
  );
}

function CurveSvg({ book, spy }: { book: EquityPoint[]; spy: EquityPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

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
    if (w < 8 || h < 8 || book.length === 0) return null;
    const padL = 8;
    const padR = 60;
    const padT = 14;
    const padB = 20;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const values = [...book.map((p) => p.v), ...spy.map((p) => p.v)].filter((n) => Number.isFinite(n));
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    const { min, max, ticks } = curvePlotScale(lo, hi);
    const xAt = (i: number, n: number) => padL + ((i + 0.5) / n) * plotW;
    const yAt = (p: number) => padT + ((max - p) / (max - min)) * plotH;
    const pathThrough = (pts: EquityPoint[]) => {
      const segs: string[] = [];
      for (let i = 0; i < pts.length; i++) {
        const v = pts[i]?.v;
        if (!Number.isFinite(v)) continue;
        segs.push(`${segs.length ? "L" : "M"}${xAt(i, pts.length).toFixed(1)} ${yAt(v as number).toFixed(1)}`);
      }
      return segs.join(" ");
    };
    const timeStep = Math.max(1, Math.floor(book.length / 5));
    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      plotW,
      xAt,
      yAt,
      min,
      max,
      ticks,
      bookPath: pathThrough(book),
      spyPath: pathThrough(spy),
      n: book.length,
      timeStep,
      labeled: book.map((_, i) => i).filter((i) => i % timeStep === 0),
    };
  }, [book, spy, size]);

  function onMove(e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) {
    if (!layout || book.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const x = clientX - rect.left;
    const i = Math.round(((x - layout.padL) / layout.plotW) * book.length - 0.5);
    setHover(Math.max(0, Math.min(book.length - 1, i)));
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
          {layout.ticks.map((t) => {
            const y = layout.yAt(t);
            const isTop = t === Math.max(...layout.ticks);
            const labelY = isTop ? Math.max(10, y - 3) : y;
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
                  y={labelY}
                  textAnchor="end"
                  dominantBaseline={isTop ? "auto" : "middle"}
                  className="fill-subtle font-mono tabular-nums"
                  fontSize="10"
                >
                  {formatCurveAxis(t)}
                </text>
              </g>
            );
          })}
          <path
            d={layout.spyPath}
            className="fill-none stroke-muted"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={layout.bookPath}
            className="fill-none stroke-accent"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {layoutCurveTimeLabels(
            layout.labeled.map((i) => ({
              i,
              x: layout.xAt(i, layout.n),
              text: barTime(book[i]!.t, false),
            })),
            layout.padL,
            layout.plotW,
            layout.w,
          ).map((place) => (
            <text
              key={`t-${book[place.i]!.t}`}
              x={place.x}
              y={layout.h - 6}
              textAnchor={place.anchor}
              className="fill-subtle font-mono"
              fontSize="10"
            >
              {place.text}
            </text>
          ))}
          {hover !== null && book[hover] ? (
            <>
              <line
                x1={layout.xAt(hover, layout.n)}
                x2={layout.xAt(hover, layout.n)}
                y1={layout.padT}
                y2={layout.h - layout.padB}
                className="stroke-fg opacity-30"
              />
              <HoverLabel
                x={layout.xAt(hover, layout.n)}
                maxW={layout.w - layout.padR}
                padL={layout.padL}
                text={`${barTime(book[hover].t, false)}  ${money(book[hover].v, true)}  SPY ${
                  spy[hover] ? money(spy[hover].v, true) : "—"
                }`}
              />
            </>
          ) : null}
        </svg>
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

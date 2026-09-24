import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { CURVE_RANGES, curvePlotScale, formatCurveAxis, type BookCurveSnapshot } from "@/lib/book-curve";
import { barTime, money, pct, signClass } from "@/lib/format";
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
    <section className="shrink-0 border-b border-border bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-micro tracking-widest text-subtle uppercase">Curve</p>
          {snap?.label === "sim" ? (
            <p className="font-mono text-micro tracking-widest text-muted uppercase">Sim</p>
          ) : null}
        </div>
        <div role="group" aria-label="Curve range" className="flex items-center">
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
                  "px-1.5 py-2.5 font-mono text-2xs leading-6 tracking-widest uppercase md:py-2",
                  r === range ? "text-accent" : "text-subtle hover:text-fg",
                )}
              >
                {r}
              </button>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-2xs tabular-nums">
        <span>
          <span className="text-accent">Book</span>{" "}
          <span className={signClass(bookRet ?? 0)}>{bookRet != null ? pct(bookRet) : "—"}</span>
        </span>
        <span>
          <span className="text-muted">SPY</span>{" "}
          <span className={signClass(spyRet ?? 0)}>{spyRet != null ? pct(spyRet) : "—"}</span>
        </span>
        <span>
          <span className="text-subtle">vs</span>{" "}
          <span className={signClass(vs ?? 0)}>{vs != null ? pct(vs) : "—"}</span>
        </span>
      </div>
      <div className="relative mt-2 h-36">
        {loading && !snap ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-micro tracking-widest text-subtle uppercase">
            Loading curve
          </div>
        ) : snap && snap.book.length > 1 ? (
          <CurveSvg book={snap.book} spy={snap.spy} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-micro tracking-widest text-subtle uppercase">
            No curve
          </div>
        )}
      </div>
    </section>
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
      timeStep: Math.max(1, Math.floor(book.length / 5)),
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
          {book.map((p, i) =>
            i % layout.timeStep === 0 ? (
              <text
                key={`t-${p.t}`}
                x={layout.xAt(i, layout.n)}
                y={layout.h - 6}
                textAnchor="middle"
                className="fill-subtle font-mono"
                fontSize="10"
              >
                {barTime(p.t, false)}
              </text>
            ) : null,
          )}
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

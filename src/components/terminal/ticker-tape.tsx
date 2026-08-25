import { useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { pct, px, signClass } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { Quote } from "@/lib/types";

const TAPE_PX_PER_SEC = 56;

function TapeRow({
  items,
  onSelect,
  unitRef,
  duplicate,
}: {
  items: Quote[];
  onSelect: (symbol: string) => void;
  unitRef?: Ref<HTMLDivElement>;
  duplicate?: boolean;
}) {
  return (
    <div
      ref={unitRef}
      className="flex shrink-0 items-center"
      aria-hidden={duplicate || undefined}
    >
      {items.map((q) => (
        <button
          key={q.symbol}
          type="button"
          tabIndex={duplicate ? -1 : undefined}
          onClick={() => onSelect(q.symbol)}
          className="flex h-8 shrink-0 items-center gap-2 border-r border-border px-3 font-mono text-2xs tabular-nums"
        >
          <span className="text-accent">{q.symbol}</span>
          <span className="text-fg">{px(q.last)}</span>
          <span className={signClass(q.change)}>{pct(q.changePct)}</span>
        </button>
      ))}
    </div>
  );
}

export function TickerTape() {
  const watchlist = useDesk((s) => s.watchlist);
  const quotes = useDesk((s) => s.quotes);
  const setSelected = useDesk((s) => s.setSelected);
  const items = watchlist.map((sym) => quotes[sym]).filter(Boolean);
  const viewportRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const [duration, setDuration] = useState(42);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || items.length === 0) return;

    const apply = () => {
      const unit = unitRef.current;
      if (!unit) return;
      const viewportWidth = viewport.clientWidth;
      const unitWidth = unit.offsetWidth;
      if (viewportWidth <= 0 || unitWidth <= 0) return;
      const fill = Math.max(1, Math.ceil(viewportWidth / unitWidth));
      const nextCopies = fill * 2;
      const nextDuration = (fill * unitWidth) / TAPE_PX_PER_SEC;
      setCopies((current) => (current === nextCopies ? current : nextCopies));
      setDuration((current) =>
        Math.abs(current - nextDuration) < 0.2 ? current : nextDuration,
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(viewport);
    const unit = unitRef.current;
    if (unit) observer.observe(unit);
    return () => observer.disconnect();
  }, [items.length, watchlist]);

  if (items.length === 0) {
    return (
      <div className="flex h-8 items-center border-b border-border bg-bg px-3 font-mono text-micro tracking-widest text-subtle uppercase">
        Loading tape…
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="relative h-8 shrink-0 overflow-hidden border-b border-border bg-bg"
    >
      <div
        className="tape-track flex w-max"
        style={{ "--tape-duration": `${duration}s` } as CSSProperties}
      >
        {Array.from({ length: copies }, (_, i) => (
          <TapeRow
            key={i}
            items={items}
            onSelect={setSelected}
            unitRef={i === 0 ? unitRef : undefined}
            duplicate={i > 0}
          />
        ))}
      </div>
    </div>
  );
}

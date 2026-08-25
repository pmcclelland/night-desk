import { pct, px, signClass } from "@/lib/format";
import { useDesk } from "@/lib/store";
import { cn } from "@/lib/cn";

export function TickerTape() {
  const watchlist = useDesk((s) => s.watchlist);
  const quotes = useDesk((s) => s.quotes);
  const setSelected = useDesk((s) => s.setSelected);
  const items = watchlist.map((sym) => quotes[sym]).filter(Boolean);

  if (items.length === 0) {
    return (
      <div className="flex h-8 items-center border-b border-border bg-bg px-3 font-mono text-micro tracking-widest text-subtle uppercase">
        Loading tape…
      </div>
    );
  }

  const row = (
    <div className="flex items-center">
      {items.map((q) => (
        <button
          key={q.symbol + q.ts}
          type="button"
          onClick={() => setSelected(q.symbol)}
          className="flex h-8 shrink-0 items-center gap-2 border-r border-border px-3 font-mono text-2xs tabular-nums"
        >
          <span className="text-accent">{q.symbol}</span>
          <span className="text-fg">{px(q.last)}</span>
          <span className={signClass(q.change)}>{pct(q.changePct)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative h-8 overflow-hidden border-b border-border bg-bg">
      <div className={cn("tape-track flex w-max", items.length < 6 && "md:animate-none")}>
        {row}
        {row}
      </div>
    </div>
  );
}

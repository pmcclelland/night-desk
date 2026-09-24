import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toBookPerformanceView } from "@/lib/book-view";
import { money, pct, px, qty, signClass, signedMoney } from "@/lib/format";
import { isTypingTarget } from "@/lib/keys";
import { selectSymbol } from "@/lib/desk-sync";
import { selectLiveFeed, selectVenue, useDesk, useLiveBook } from "@/lib/store";
import { cn } from "@/lib/cn";

export function BookReview() {
  const navigate = useNavigate();
  const { account, positions } = useLiveBook();
  const venue = useDesk(selectVenue);
  const guest = useDesk((s) => s.guestDemo);
  const liveFeed = useDesk(selectLiveFeed);
  const selected = useDesk((s) => s.selected);
  const view = useMemo(
    () =>
      toBookPerformanceView({
        venue,
        guest,
        liveFeed,
        account,
        positions,
      }),
    [venue, guest, liveFeed, account, positions],
  );

  const symbols = view.positions.map((p) => p.symbol);
  const [cursor, setCursor] = useState(() => selected);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (symbols.includes(selected)) setCursor(selected);
    else if (symbols[0] && !symbols.includes(cursor)) setCursor(symbols[0]);
  }, [selected, symbols, cursor]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        if (expanded) {
          e.preventDefault();
          setExpanded(null);
          return;
        }
        e.preventDefault();
        void navigate({ to: "/" });
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        setExpanded((cur) => (cur === cursor ? null : cursor));
        return;
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        if (cursor) {
          selectSymbol(cursor);
          void navigate({ to: "/" });
        }
        return;
      }

      const down = e.key === "j" || e.key === "J" || e.key === "ArrowDown";
      const up = e.key === "k" || e.key === "K" || e.key === "ArrowUp";
      if (!down && !up) return;
      e.preventDefault();
      const i = Math.max(0, symbols.indexOf(cursor));
      const next = symbols[down ? Math.min(symbols.length - 1, i + 1) : Math.max(0, i - 1)];
      if (!next) return;
      setCursor(next);
      selectSymbol(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, expanded, navigate, symbols]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
      <section className="shrink-0 border-b border-border bg-surface px-3 py-2">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">
          Book · {view.positions.length} names
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          <Stat label="Unrl" value={`${signedMoney(view.unrealizedPl)}`} valueClass={signClass(view.unrealizedPl)} />
          <Stat
            label="Day"
            value={`${signedMoney(view.dayPl)} ${pct(view.dayPlPct)}`}
            valueClass={signClass(view.dayPl)}
          />
          <Stat label="Realized" value={signedMoney(view.realizedToday)} />
          <Stat label="Cash" value={money(view.cash, true)} />
        </div>
      </section>

      {view.positions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 font-mono text-micro tracking-widest text-subtle uppercase">
          No open risk
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full font-mono text-2xs tabular-nums">
            <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Sym</th>
                <th className="hidden px-2 py-1 text-right font-medium sm:table-cell">Qty</th>
                <th className="hidden px-2 py-1 text-right font-medium md:table-cell">Wgt</th>
                <th className="hidden px-2 py-1 text-right font-medium sm:table-cell">Cost</th>
                <th className="px-2 py-1 text-right font-medium">P&L</th>
                <th className="hidden px-2 py-1 text-right font-medium md:table-cell">Day</th>
                <th className="px-2 py-1 text-left font-medium">Thesis</th>
              </tr>
            </thead>
            <tbody>
              {view.positions.map((p) => {
                const active = p.symbol === cursor;
                const open = expanded === p.symbol;
                return (
                  <tr
                    key={p.symbol}
                    data-symbol={p.symbol}
                    data-last={String(p.last)}
                    className={cn(
                      "cursor-pointer border-t border-border/60",
                      active ? "bg-elevated" : "hover:bg-elevated/60",
                    )}
                    onClick={() => {
                      setCursor(p.symbol);
                      selectSymbol(p.symbol);
                    }}
                  >
                    <td className="px-2 py-1.5 text-fg">{p.symbol}</td>
                    <td className="hidden px-2 py-1.5 text-right sm:table-cell">{qty(p.qty)}</td>
                    <td className="hidden px-2 py-1.5 text-right md:table-cell">{pct(p.weightPct, false)}</td>
                    <td className="hidden px-2 py-1.5 text-right text-muted sm:table-cell">{px(p.avgPrice)}</td>
                    <td className={cn("px-2 py-1.5 text-right", signClass(p.unrealizedPl))}>
                      {signedMoney(p.unrealizedPl)}{" "}
                      <span className="text-micro">{pct(p.unrealizedPlPct)}</span>
                    </td>
                    <td className={cn("hidden px-2 py-1.5 text-right md:table-cell", signClass(p.dayPl))}>
                      {signedMoney(p.dayPl)}{" "}
                      <span className="text-micro">{pct(p.dayPlPct)}</span>
                    </td>
                    <td className="px-2 py-1.5 text-left text-subtle">
                      {open ? "—" : p.thesis?.reasoning || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {expanded ? (
            <div className="border-t border-border bg-surface px-3 py-3">
              <p className="font-mono text-micro tracking-widest text-accent uppercase">{expanded}</p>
              <p className="mt-2 font-mono text-2xs leading-relaxed text-muted">
                No thesis yet. Conviction, drivers, and invalidation land in the next slice.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col leading-none">
      <span className="font-mono text-micro tracking-widest text-subtle uppercase">{label}</span>
      <span className={cn("truncate font-mono text-2xs tabular-nums text-fg", valueClass)}>{value}</span>
    </div>
  );
}

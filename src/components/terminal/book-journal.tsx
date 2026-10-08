import { ReviewCard, ReviewEmpty } from "@/components/terminal/review-card";
import { formatHold, formatJournalDay, type JournalRow } from "@/lib/book-journal";
import { pct, px, signClass, signedMoney } from "@/lib/format";
import { journalSidePlain } from "@/lib/review-copy";
import { nameOf } from "@/lib/universe";
import { cn } from "@/lib/cn";

export function BookJournal({
  rows,
  loading,
  sim,
  cursor,
  onPick,
}: {
  rows: JournalRow[];
  loading: boolean;
  sim: boolean;
  cursor: string | null;
  onPick: (id: string, symbol: string) => void;
}) {
  return (
    <ReviewCard
      title="Closed trades"
      dek="Round trips that are done — what you made or lost after getting out."
      hint={sim ? "From the practice book, not a live brokerage account." : undefined}
    >
      {loading && rows.length === 0 ? (
        <ReviewEmpty>Looking up closed trades…</ReviewEmpty>
      ) : rows.length === 0 ? (
        <ReviewEmpty>{sim ? "No closed practice trades in this window." : "No closed trades in this window."}</ReviewEmpty>
      ) : (
        <ul className="divide-y divide-border/80">
          {rows.map((row) => {
            const key = `jr:${row.id}`;
            const marked = cursor === key;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  data-journal={row.id}
                  onClick={() => onPick(row.id, row.symbol)}
                  className={cn(
                    "flex w-full min-h-11 flex-col items-start gap-1 py-3 text-left",
                    marked ? "bg-elevated px-2" : "hover:bg-elevated/60",
                  )}
                >
                  <div className="flex w-full min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-fg">
                      {nameOf(row.symbol)}{" "}
                      <span className="font-mono text-2xs text-muted">{row.symbol}</span>
                    </span>
                    <span className={cn("shrink-0 font-mono text-sm tabular-nums", signClass(row.realizedPl))}>
                      {signedMoney(row.realizedPl)}{" "}
                      <span className="text-xs">{pct(row.realizedPlPct)}</span>
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted text-pretty">
                    {journalSidePlain(row.side)} · held {formatHold(row.holdMs)} · in{" "}
                    {formatJournalDay(row.entryAt)} at {px(row.entryPrice)} · out{" "}
                    {formatJournalDay(row.exitAt)} at {px(row.exitPrice)}
                  </p>
                  {row.snippet ? (
                    <p className="min-w-0 truncate text-xs text-subtle">
                      {row.conviction ? `${row.conviction} confidence · ` : ""}
                      {row.snippet}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ReviewCard>
  );
}

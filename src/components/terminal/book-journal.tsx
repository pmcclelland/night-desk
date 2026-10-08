import { formatHold, formatJournalDay, type JournalRow } from "@/lib/book-journal";
import { pct, px, signClass, signedMoney } from "@/lib/format";
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
    <section className="min-h-0 shrink-0 border-t border-border bg-surface">
      <div className="flex items-baseline gap-2 px-3 py-2">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">
          Journal · {rows.length} closed
        </p>
        {sim ? (
          <p className="font-mono text-micro tracking-widest text-muted uppercase">Sim</p>
        ) : null}
      </div>
      {loading && rows.length === 0 ? (
        <p className="px-3 pb-3 font-mono text-micro tracking-widest text-subtle uppercase">
          Loading journal
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 pb-3 font-mono text-micro tracking-widest text-subtle uppercase">
          {sim ? "No closed SIM trades" : "No closed trades"}
        </p>
      ) : (
        <div className="max-h-56 overflow-auto md:max-h-64">
          <table className="w-full border-separate border-spacing-0 font-mono text-2xs tabular-nums">
            <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
              <tr>
                <th className="w-px whitespace-nowrap border-l-2 border-transparent px-2 py-1 text-left font-medium">
                  Sym
                </th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-left font-medium sm:table-cell">
                  Side
                </th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-medium md:table-cell">
                  In
                </th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-medium md:table-cell">
                  Out
                </th>
                <th className="w-px whitespace-nowrap px-2 py-1 text-right font-medium">
                  Hold
                </th>
                <th className="w-px whitespace-nowrap px-2 py-1 text-right font-medium">P&L</th>
                <th className="w-full px-2 py-1 text-left font-medium">Thesis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = `jr:${row.id}`;
                const marked = cursor === key;
                return (
                  <tr
                    key={row.id}
                    data-journal={row.id}
                    className={cn(
                      "cursor-pointer border-t border-border/60",
                      marked ? "bg-elevated" : "hover:bg-elevated/60",
                    )}
                    onClick={() => onPick(row.id, row.symbol)}
                  >
                    <td
                      className={cn(
                        "w-px whitespace-nowrap border-l-2 px-2 py-1.5 text-left text-fg",
                        marked ? "border-accent" : "border-transparent",
                      )}
                    >
                      {row.symbol}
                    </td>
                    <td className="hidden w-px whitespace-nowrap px-2 py-1.5 text-left text-muted sm:table-cell">
                      {row.side}
                    </td>
                    <td className="hidden w-px whitespace-nowrap px-2 py-1.5 text-right text-muted md:table-cell">
                      <span className="text-subtle">{formatJournalDay(row.entryAt)}</span> {px(row.entryPrice)}
                    </td>
                    <td className="hidden w-px whitespace-nowrap px-2 py-1.5 text-right text-muted md:table-cell">
                      <span className="text-subtle">{formatJournalDay(row.exitAt)}</span> {px(row.exitPrice)}
                    </td>
                    <td className="w-px whitespace-nowrap px-2 py-1.5 text-right text-muted tabular-nums">
                      {formatHold(row.holdMs)}
                    </td>
                    <td className={cn("w-px whitespace-nowrap px-2 py-1.5 text-right", signClass(row.realizedPl))}>
                      {signedMoney(row.realizedPl)}{" "}
                      <span className="text-micro">{pct(row.realizedPlPct)}</span>
                    </td>
                    <td className="w-full min-w-0 max-w-0 px-2 py-1.5 text-left">
                      {row.snippet ? (
                        <span className="flex min-w-0 items-baseline gap-2">
                          {row.conviction ? (
                            <span className="shrink-0 text-micro tracking-widest text-accent uppercase">
                              {row.conviction}
                            </span>
                          ) : null}
                          <span className="min-w-0 truncate text-subtle">{row.snippet}</span>
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

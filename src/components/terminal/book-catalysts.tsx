import { ReviewCard, ReviewEmpty } from "@/components/terminal/review-card";
import { formatCatalystDay, type CatalystRow } from "@/lib/book-catalysts";
import { catalystKindPlain, catalystWhenPlain } from "@/lib/review-copy";
import { nameOf } from "@/lib/universe";

export function BookCatalysts({
  rows,
  loading,
  sim,
}: {
  rows: CatalystRow[];
  loading: boolean;
  sim: boolean;
}) {
  return (
    <ReviewCard
      title="Coming up"
      dek="Earnings reports and dividend cutoffs in the next two weeks for names you hold."
      hint={sim ? "Sample dates on the practice book." : undefined}
    >
      {loading && rows.length === 0 ? (
        <ReviewEmpty>Looking up upcoming dates…</ReviewEmpty>
      ) : rows.length === 0 ? (
        <ReviewEmpty>Nothing on the calendar in the next 14 days.</ReviewEmpty>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const when = catalystWhenPlain(row.kind, row.detail);
            return (
              <li key={row.id} className="min-w-0 text-sm leading-relaxed text-pretty">
                <span className="text-fg">
                  {formatCatalystDay(row.at)} · {nameOf(row.symbol)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {catalystKindPlain(row.kind)}
                  {when ? ` — ${when}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ReviewCard>
  );
}

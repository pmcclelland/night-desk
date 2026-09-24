import {
  formatCatalystDay,
  kindLabel,
  type CatalystRow,
} from "@/lib/book-catalysts";

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
    <section className="shrink-0 border-t border-border bg-surface px-3 py-2">
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">
          Catalysts · {rows.length} in 14d
        </p>
        {sim ? (
          <p className="font-mono text-micro tracking-widest text-muted uppercase">Sim</p>
        ) : null}
      </div>
      {loading && rows.length === 0 ? (
        <p className="mt-2 font-mono text-micro tracking-widest text-subtle uppercase">
          Loading catalysts
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-2 font-mono text-micro tracking-widest text-subtle uppercase">
          Nothing in the next 14 days
        </p>
      ) : (
        <div className="mt-2">
          {rows.map((row) => (
            <div key={row.id} className="flex h-6 min-w-0 items-center gap-3">
              <span className="w-14 shrink-0 font-mono text-2xs tabular-nums text-fg">
                {formatCatalystDay(row.at)}
              </span>
              <span className="w-12 shrink-0 font-mono text-2xs text-fg">{row.symbol}</span>
              <span className="shrink-0 font-mono text-2xs text-muted uppercase">
                {kindLabel(row.kind)}
              </span>
              <span className="min-w-0 truncate font-mono text-2xs text-subtle">
                {row.detail ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

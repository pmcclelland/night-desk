import {
  barWidthPct,
  type ConcentrationSnapshot,
} from "@/lib/book-concentration";
import { pct } from "@/lib/format";

function ConcBar({
  label,
  share,
}: {
  label: string;
  share: number;
}) {
  const width = barWidthPct(share);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-2xs text-fg">{label}</span>
        <span className="shrink-0 font-mono text-2xs tabular-nums text-fg">{pct(share, false)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-elevated" aria-hidden>
        <div className="h-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function BookConcentration({
  snap,
  sim,
}: {
  snap: ConcentrationSnapshot;
  sim: boolean;
}) {
  const names = snap.top5.map((row) => row.symbol).join(" · ");
  return (
    <section className="shrink-0 border-b border-border bg-surface px-3 py-2">
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">Concentration</p>
        {sim ? (
          <p className="font-mono text-micro tracking-widest text-muted uppercase">Sim</p>
        ) : null}
      </div>
      <div className="mt-2 space-y-2">
        <div className="min-w-0">
          <ConcBar label="Top 5" share={snap.top5SharePct} />
          <p className="mt-1 min-w-0 font-mono text-2xs text-muted">{names || "—"}</p>
        </div>
        {snap.sectors.map((row) => (
          <ConcBar key={row.sector} label={row.sector} share={row.sharePct} />
        ))}
        <ConcBar label="Cash" share={snap.cashPct} />
      </div>
    </section>
  );
}

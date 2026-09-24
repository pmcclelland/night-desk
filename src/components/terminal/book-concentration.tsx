import {
  barWidthPct,
  formatSharePct,
  type ConcentrationSnapshot,
} from "@/lib/book-concentration";

function SectorRow({ label, share }: { label: string; share: number }) {
  const width = barWidthPct(share);
  return (
    <div className="flex h-6 min-w-0 items-center gap-3">
      <span className="w-[14ch] shrink-0 truncate font-mono text-2xs text-fg">{label}</span>
      <div className="min-w-0 max-w-lg flex-1">
        <div className="h-1.5 w-full bg-elevated" aria-hidden>
          <div className="h-full bg-muted" style={{ width: `${width}%` }} />
        </div>
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-2xs tabular-nums text-fg">
        {formatSharePct(share)}
      </span>
    </div>
  );
}

function ConcStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-none">
      <span className="font-mono text-micro tracking-widest text-subtle uppercase">{label}</span>
      <span className="mt-1 whitespace-nowrap font-mono text-2xs tabular-nums text-fg">{value}</span>
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
    <section className="shrink-0 border-t border-border bg-surface px-3 py-2">
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">Concentration</p>
        {sim ? (
          <p className="font-mono text-micro tracking-widest text-muted uppercase">Sim</p>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        <ConcStat label="Top 5" value={formatSharePct(snap.top5SharePct)} />
        <ConcStat label="Cash" value={formatSharePct(snap.cashPct)} />
      </div>
      <p className="mt-2 min-w-0 truncate font-mono text-2xs text-subtle">{names || "—"}</p>
      {snap.sectors.length > 0 ? (
        <div className="mt-2">
          {snap.sectors.map((row) => (
            <SectorRow key={row.sector} label={row.sector} share={row.sharePct} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

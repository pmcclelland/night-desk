import { ReviewCard } from "@/components/terminal/review-card";
import {
  barWidthPct,
  formatSharePct,
  type ConcentrationSnapshot,
} from "@/lib/book-concentration";
import { nameOf } from "@/lib/universe";

function SectorRow({ label, share }: { label: string; share: number }) {
  const width = barWidthPct(share);
  return (
    <div className="flex min-h-8 min-w-0 items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs text-fg">{label}</span>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 w-full bg-elevated" aria-hidden>
          <div className="h-full bg-muted" style={{ width: `${width}%` }} />
        </div>
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
        {formatSharePct(share)}
      </span>
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
  const names = snap.top5.map((row) => nameOf(row.symbol)).join(", ");
  return (
    <ReviewCard
      title="How spread out the book is"
      dek="If a few names dominate, a bad day in one of them moves the whole book."
      hint={sim ? "From the practice book." : undefined}
    >
      <p className="text-sm leading-relaxed text-fg text-pretty">
        The five largest names are {formatSharePct(snap.top5SharePct)} of the book
        {names ? ` (${names})` : ""}. Cash is {formatSharePct(snap.cashPct)}.
      </p>
      {snap.sectors.length > 0 ? (
        <div className="mt-4">
          {snap.sectors.map((row) => (
            <SectorRow key={row.sector} label={row.sector} share={row.sharePct} />
          ))}
        </div>
      ) : null}
    </ReviewCard>
  );
}

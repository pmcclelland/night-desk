import { ReviewCard, ReviewEmpty } from "@/components/terminal/review-card";
import { cn } from "@/lib/cn";
import { nameOf } from "@/lib/universe";
import {
  checkpointKindPlain,
  convictionPlain,
  directionPlain,
  evidencePlain,
  humanizeSlug,
} from "@/lib/review-copy";
import {
  SIGNALS_NOT_CONNECTED,
  signalHasChain,
  type BrainSignal,
  type SignalsSnapshot,
} from "@/lib/signals";

const CHAIN_MISSING =
  "Brain has a note for this name, but the cause-and-effect steps are not in the feed yet. Night Desk reads public.signals.data.thesis.chain (steps with claim, evidence_status, key_quote, source_ref), data.checkpoints, and data.provenance.mechanism_title / source_refs.";

export function BookChains({
  ticker,
  tickers,
  signals,
  onPick,
}: {
  ticker: string | null;
  tickers: string[];
  signals: SignalsSnapshot | { status: "loading" };
  onPick: (symbol: string) => void;
}) {
  const connected = signals.status === "connected" ? signals : null;
  const rows = ticker && connected ? (connected.allByTicker[ticker] ?? []) : [];
  const latest = ticker && connected ? connected.byTicker[ticker] : undefined;

  return (
    <ReviewCard
      title="Why this name"
      dek="Cause-and-effect chains from the research vault for the selected ticker."
    >
      {tickers.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1">
          {tickers.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => onPick(sym)}
              aria-pressed={sym === ticker}
              className={cn(
                "min-h-11 px-2 py-2 font-mono text-2xs tracking-wide uppercase md:min-h-0 md:py-1.5",
                sym === ticker ? "text-accent" : "text-subtle hover:text-fg",
              )}
            >
              {sym}
            </button>
          ))}
        </div>
      ) : null}

      {signals.status === "loading" ? (
        <ReviewEmpty>Checking research notes…</ReviewEmpty>
      ) : signals.status === "disconnected" ? (
        <ReviewEmpty>
          Research feed is not connected ({SIGNALS_NOT_CONNECTED}). Night Desk reads the
          trader signals table with a public key and cannot reach the vault itself.
        </ReviewEmpty>
      ) : !ticker ? (
        <ReviewEmpty>Select a name to see its research chain.</ReviewEmpty>
      ) : rows.length === 0 ? (
        <ReviewEmpty>
          No research chain for {nameOf(ticker)} ({ticker}). Brain only exports names that
          have an authored signal.
        </ReviewEmpty>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <ChainBlock key={row.id} row={row} />
          ))}
          {rows.every((row) => !signalHasChain(row)) && latest ? (
            <ReviewEmpty>{CHAIN_MISSING}</ReviewEmpty>
          ) : null}
        </div>
      )}
    </ReviewCard>
  );
}

function ChainBlock({ row }: { row: BrainSignal }) {
  const title = row.mechanismTitle || humanizeSlug(row.mechanismSlug);
  return (
    <article className="min-w-0 border-t border-border/80 pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-sans text-sm font-medium text-fg text-pretty">{title}</h3>
      <p className="mt-1 text-xs text-muted">
        {directionPlain(row.direction)} · {convictionPlain(row.convictionLabel)}
        {row.asOf ? ` · as of ${row.asOf}` : ""}
      </p>
      {row.thesisSummary ? (
        <p className="mt-2 text-sm leading-relaxed text-fg text-pretty">{row.thesisSummary}</p>
      ) : null}

      {row.chain.length > 0 ? (
        <ol className="mt-3 space-y-3">
          {row.chain.map((step, i) => (
            <li key={`${row.id}:${step.step}`} className="min-w-0">
              {i > 0 ? (
                <p className="mb-2 font-mono text-micro tracking-widest text-subtle uppercase">so</p>
              ) : null}
              <p className="text-sm leading-relaxed text-fg text-pretty">
                <span className="mr-2 font-mono text-2xs text-subtle">{step.step}.</span>
                {step.claim}
              </p>
              <p className="mt-1 text-xs text-muted">
                {evidencePlain(step.evidenceStatus)}
                {step.sourceRef ? ` · ${step.sourceRef}` : ""}
              </p>
              {step.keyQuote ? (
                <p className="mt-1 text-xs leading-relaxed text-subtle text-pretty">“{step.keyQuote}”</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {row.checkpoints.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {row.checkpoints.map((cp, i) => (
            <li key={`${row.id}:cp:${i}`} className="text-xs leading-relaxed text-muted text-pretty">
              <span className="text-fg">{checkpointKindPlain(cp.kind)}</span>
              {cp.date ? ` · ${cp.date}` : ""}
              {cp.label ? ` — ${cp.label}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {row.contradictions.length > 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted text-pretty">
          What could be wrong: {row.contradictions.join("; ")}
        </p>
      ) : null}

      {row.sourceRefs.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {row.sourceRefs.slice(0, 4).map((ref) => (
            <li key={ref} className="truncate text-xs text-subtle">
              {ref.startsWith("http") ? (
                <a href={ref} target="_blank" rel="noreferrer" className="hover:text-accent">
                  {ref}
                </a>
              ) : (
                ref
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

import { useMemo } from "react";
import { backtest, KIND_META } from "@/lib/strategies";
import { pct, signClass } from "@/lib/format";
import { useDesk } from "@/lib/store";
import { queuePersist } from "@/lib/desk-sync";
import type { Bar, StrategyInstance } from "@/lib/types";
import { Panel } from "@/components/terminal/panel";
import { Button } from "@/components/ui/button";

export function StrategyLab() {
  const strategies = useDesk((s) => s.strategies);
  const bars = useDesk((s) => s.bars);
  const barsSymbol = useDesk((s) => s.barsSymbol);

  return (
    <Panel title="Algos" bodyClassName="overflow-auto">
      <ul className="divide-y divide-border">
        {strategies.map((st) => (
          <StrategyRow key={st.id} st={st} bars={st.symbol === barsSymbol ? bars : []} />
        ))}
      </ul>
    </Panel>
  );
}

function StrategyRow({ st, bars }: { st: StrategyInstance; bars: Bar[] }) {
  const patch = useDesk((s) => s.patchStrategy);
  const setSelected = useDesk((s) => s.setSelected);
  const meta = KIND_META[st.kind];
  const stats = useMemo(() => {
    if (bars.length < 40) return null;
    return backtest(st.kind, st.params, bars);
  }, [bars, st.kind, st.params]);

  return (
    <li className="px-2 py-2">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={() => setSelected(st.symbol)}>
          <div className="font-mono text-2xs tracking-wide text-fg">
            {st.name} <span className="text-accent">{st.symbol}</span>
          </div>
          <div className="truncate font-mono text-micro text-muted">{st.note || meta.blurb}</div>
        </button>
        <Button
          size="sm"
          variant={st.armed ? "buy" : "outline"}
          onClick={() => {
            patch(st.id, { armed: !st.armed, lastFiredAt: 0 });
            queuePersist();
          }}
        >
          {st.armed ? "Armed" : "Arm"}
        </Button>
      </div>
      <div className="mt-1 flex flex-wrap gap-2 font-mono text-micro tabular-nums text-muted">
        <span>qty {st.qty}</span>
        <span className={st.lastSignal === "buy" ? "text-up" : st.lastSignal === "sell" ? "text-down" : ""}>
          sig {st.lastSignal}
        </span>
        {stats ? (
          <>
            <span>{stats.trades} tr</span>
            <span>win {stats.winRate.toFixed(0)}%</span>
            <span className={signClass(stats.netPct)}>{pct(stats.netPct)}</span>
          </>
        ) : null}
      </div>
    </li>
  );
}

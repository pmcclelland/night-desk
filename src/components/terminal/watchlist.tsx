import { useState } from "react";
import { pct, px, signClass, vol } from "@/lib/format";
import { normalizeSymbol } from "@/lib/universe";
import { useDesk } from "@/lib/store";
import { refreshQuotes } from "@/lib/sync";
import { queuePersist, selectSymbol } from "@/lib/desk-sync";
import { Panel } from "@/components/terminal/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Watchlist() {
  const watchlist = useDesk((s) => s.watchlist);
  const quotes = useDesk((s) => s.quotes);
  const selected = useDesk((s) => s.selected);
  const addWatch = useDesk((s) => s.addWatch);
  const rmWatch = useDesk((s) => s.rmWatch);
  const [draft, setDraft] = useState("");

  function add() {
    const s = normalizeSymbol(draft);
    if (!s) return;
    addWatch(s);
    selectSymbol(s);
    setDraft("");
    void refreshQuotes({ force: true });
    queuePersist();
  }

  return (
    <Panel
      title="Watch"
      bodyClassName="overflow-auto"
      action={
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="ADD"
            className="h-6 w-16 border-0 bg-transparent px-1 text-micro"
            aria-label="Add symbol"
          />
        </form>
      }
    >
      <table className="w-full font-mono text-2xs tabular-nums">
        <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Sym</th>
            <th className="px-2 py-1 text-right font-medium">Last</th>
            <th className="px-2 py-1 text-right font-medium">Chg</th>
            <th className="hidden px-2 py-1 text-right font-medium lg:table-cell">Vol</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.map((sym) => {
            const q = quotes[sym];
            const chg = q?.changePct ?? 0;
            return (
              <tr
                key={sym}
                className={cn(
                  "cursor-pointer border-t border-border/60 hover:bg-elevated",
                  selected === sym && "bg-elevated",
                )}
                onClick={() => selectSymbol(sym)}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={selected === sym ? "text-accent" : "text-fg"}>{sym}</span>
                    <button
                      type="button"
                      className="text-subtle hover:text-down"
                      aria-label={`Remove ${sym}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        rmWatch(sym);
                        queuePersist();
                      }}
                    >
                      ×
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right text-fg">{q ? px(q.last) : "—"}</td>
                <td className={cn("px-2 py-1.5 text-right", signClass(chg))}>
                  {q ? pct(chg) : "—"}
                </td>
                <td className="hidden px-2 py-1.5 text-right text-muted lg:table-cell">
                  {q ? vol(q.volume) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-2 md:hidden">
        <Button size="lg" variant="outline" className="w-full" onClick={add}>
          Add {draft || "symbol"}
        </Button>
      </div>
    </Panel>
  );
}

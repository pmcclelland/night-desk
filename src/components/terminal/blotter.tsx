import { useState } from "react";
import { pct, px, qty, signClass, signedMoney } from "@/lib/format";
import { selectSymbol } from "@/lib/desk-sync";
import { useLiveBook } from "@/lib/store";
import { cancelOrder, flatten } from "@/lib/sync";
import { Panel } from "@/components/terminal/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type BookTab = "pos" | "ord";

export function Blotter() {
  const [tab, setTab] = useState<BookTab>("pos");
  const { positions, orders } = useLiveBook();

  const working = orders.filter((o) =>
    ["new", "accepted", "partially_filled"].includes(o.status),
  );

  return (
    <Panel
      title="Blotter"
      action={
        <div className="flex gap-2">
          <button
            type="button"
            className={cn("font-mono text-micro tracking-widest uppercase", tab === "pos" ? "text-accent" : "text-subtle")}
            onClick={() => setTab("pos")}
          >
            Pos {positions.length}
          </button>
          <button
            type="button"
            className={cn("font-mono text-micro tracking-widest uppercase", tab === "ord" ? "text-accent" : "text-subtle")}
            onClick={() => setTab("ord")}
          >
            Ord {working.length}
          </button>
        </div>
      }
    >
      {tab === "pos" ? (
        positions.length === 0 ? (
          <Empty text="No open risk" />
        ) : (
          <table className="w-full font-mono text-2xs tabular-nums">
            <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Sym</th>
                <th className="px-2 py-1 text-right font-medium">Qty</th>
                <th className="hidden px-2 py-1 text-right font-medium sm:table-cell">Avg</th>
                <th className="px-2 py-1 text-right font-medium">P&L</th>
                <th className="px-2 py-1 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr
                  key={p.symbol}
                  className="cursor-pointer border-t border-border/60 hover:bg-elevated"
                  onClick={() => selectSymbol(p.symbol)}
                >
                  <td className="px-2 py-1.5 text-fg">{p.symbol}</td>
                  <td className="px-2 py-1.5 text-right">{qty(p.qty)}</td>
                  <td className="hidden px-2 py-1.5 text-right text-muted sm:table-cell">
                    {px(p.avgPrice)}
                  </td>
                  <td className={cn("px-2 py-1.5 text-right", signClass(p.unrealizedPl))}>
                    {signedMoney(p.unrealizedPl)}{" "}
                    <span className="text-micro">{pct(p.unrealizedPlPct)}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      className="text-micro text-muted hover:text-down"
                      onClick={(e) => {
                        e.stopPropagation();
                        void flatten(p.symbol);
                      }}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : orders.length === 0 ? (
        <Empty text="No orders this session" />
      ) : (
        <table className="w-full font-mono text-2xs tabular-nums">
          <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Sym</th>
              <th className="px-2 py-1 text-left font-medium">Side</th>
              <th className="px-2 py-1 text-right font-medium">Qty</th>
              <th className="px-2 py-1 text-left font-medium">St</th>
              <th className="px-2 py-1 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 40).map((o) => (
              <tr key={o.id} className="border-t border-border/60">
                <td className="px-2 py-1.5 text-fg">{o.symbol}</td>
                <td className={cn("px-2 py-1.5 uppercase", o.side === "buy" ? "text-up" : "text-down")}>
                  {o.side}
                </td>
                <td className="px-2 py-1.5 text-right">{qty(o.qty)}</td>
                <td className="px-2 py-1.5 text-muted">{o.status}</td>
                <td className="px-2 py-1.5 text-right">
                  {["new", "accepted", "partially_filled"].includes(o.status) ? (
                    <Button size="sm" variant="ghost" onClick={() => void cancelOrder(o.id)}>
                      Cxl
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 font-mono text-micro tracking-widest text-subtle uppercase">
      {text}
    </div>
  );
}

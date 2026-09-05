import { useMemo, useState } from "react";
import { money, px } from "@/lib/format";
import { selectVenue, useDesk, useLiveBook } from "@/lib/store";
import { flatten, placeOrder } from "@/lib/sync";
import type { OrderSide, OrderType, TimeInForce } from "@/lib/types";
import { Panel } from "@/components/terminal/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const TYPES: OrderType[] = ["market", "limit", "stop"];
const TIFS: TimeInForce[] = ["day", "gtc", "ioc"];

export function OrderTicket() {
  const selected = useDesk((s) => s.selected);
  const quotes = useDesk((s) => s.quotes);
  const risk = useDesk((s) => s.risk);
  const halted = useDesk((s) => s.halted);
  const venue = useDesk(selectVenue);
  const { account, positions } = useLiveBook();
  const pos = positions.find((p) => p.symbol === selected);
  const q = quotes[selected];

  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [tif, setTif] = useState<TimeInForce>("day");
  const [qty, setQty] = useState(String(risk.defaultQty));
  const [limit, setLimit] = useState("");
  const [stop, setStop] = useState("");
  const [busy, setBusy] = useState(false);

  const last = q?.last ?? 0;
  const n = Number(qty) || 0;
  const estPx = type === "limit" && Number(limit) ? Number(limit) : last;
  const notional = n * estPx;

  const sized = useMemo(() => {
    if (!stop || !estPx) return null;
    const riskAmt = account.equity * 0.005;
    const dist = Math.abs(estPx - Number(stop));
    if (dist <= 0) return null;
    return Math.max(1, Math.floor(riskAmt / dist));
  }, [stop, estPx, account.equity]);

  async function submit() {
    if (!n || halted) return;
    if (venue === "alpaca-live") {
      const ok = window.confirm(`LIVE ${side.toUpperCase()} ${n} ${selected}?`);
      if (!ok) return;
    }
    setBusy(true);
    await placeOrder({
      symbol: selected,
      side,
      type,
      qty: n,
      tif,
      limitPrice: type === "limit" ? Number(limit) || undefined : undefined,
      stopPrice: type === "stop" || stop ? Number(stop) || undefined : undefined,
      source: "manual",
    });
    setBusy(false);
  }

  return (
    <Panel title="Ticket" bodyClassName="overflow-auto p-2">
      <div className="flex w-full gap-1">
        <Seg active={side === "buy"} tone="up" onClick={() => setSide("buy")}>
          Buy
        </Seg>
        <Seg active={side === "sell"} tone="down" onClick={() => setSide("sell")}>
          Sell
        </Seg>
      </div>

      <div className="mt-2 flex w-full gap-1">
        {TYPES.map((t) => (
          <Seg key={t} active={type === t} onClick={() => setType(t)}>
            {t === "market" ? "Mkt" : t === "limit" ? "Lmt" : "Stp"}
          </Seg>
        ))}
      </div>

      <label className="mt-3 block font-mono text-micro tracking-widest text-subtle uppercase">
        Qty
        <Input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="decimal"
          className="mt-1"
        />
      </label>

      {type === "limit" ? (
        <label className="mt-2 block font-mono text-micro tracking-widest text-subtle uppercase">
          Limit
          <Input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="decimal"
            placeholder={last ? px(last) : ""}
            className="mt-1"
          />
        </label>
      ) : null}

      {type === "stop" || type === "limit" ? (
        <label className="mt-2 block font-mono text-micro tracking-widest text-subtle uppercase">
          Stop
          <Input
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            inputMode="decimal"
            className="mt-1"
          />
        </label>
      ) : null}

      <div className="mt-2 flex gap-1">
        {TIFS.map((t) => (
          <Seg key={t} active={tif === t} onClick={() => setTif(t)}>
            {t}
          </Seg>
        ))}
      </div>

      <div className="mt-3 space-y-1 font-mono text-2xs tabular-nums text-muted">
        <Row k="Last" v={last ? px(last) : "—"} />
        <Row k="Est" v={notional ? money(notional) : "—"} />
        <Row k="BP" v={money(account.buyingPower, true)} />
        {pos ? <Row k="Pos" v={String(pos.qty)} /> : null}
        {sized ? (
          <button type="button" className="text-accent" onClick={() => setQty(String(sized))}>
            Size to 50 bps risk: {sized} sh
          </button>
        ) : null}
      </div>

      <Button
        variant={side === "buy" ? "buy" : "sell"}
        size="lg"
        className="mt-3 w-full"
        disabled={busy || halted || n <= 0}
        onClick={() => void submit()}
      >
        {halted ? "Halted" : `${side} ${n || ""} ${selected}`}
      </Button>
      {pos ? (
        <Button
          variant="outline"
          size="lg"
          className="mt-1 w-full"
          disabled={halted}
          onClick={() => void flatten(selected)}
        >
          Flatten {selected}
        </Button>
      ) : null}
    </Panel>
  );
}

function Seg({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
  tone?: "up" | "down";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 flex-1 border font-mono text-micro tracking-widest uppercase",
        active && tone === "up" && "border-up bg-up/15 text-up",
        active && tone === "down" && "border-down bg-down/15 text-down",
        active && !tone && "border-accent bg-accent/10 text-accent",
        !active && "border-border text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-subtle">{k}</span>
      <span className="text-fg">{v}</span>
    </div>
  );
}

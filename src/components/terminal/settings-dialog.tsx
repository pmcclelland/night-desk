import { useState } from "react";
import { useDesk } from "@/lib/store";
import { connectAlpaca } from "@/lib/sync";
import type { TapeSource, Venue } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const VENUES: { id: Venue; label: string; hint: string }[] = [
  { id: "sim", label: "Simulation", hint: "Local blotter. Yahoo delayed tape." },
  { id: "alpaca-paper", label: "Alpaca Paper", hint: "Paper orders + Alpaca IEX tape." },
  { id: "alpaca-live", label: "Alpaca Live", hint: "Real capital. Same IEX tape as paper." },
];

const TAPE_LABEL: Record<TapeSource, string> = {
  alpaca: "Alpaca IEX",
  yahoo: "Yahoo Finance",
  mixed: "Alpaca IEX + Yahoo fill",
  seed: "Offline seed",
};

export function SettingsDialog() {
  const open = useDesk((s) => s.settingsOpen);
  const setOpen = useDesk((s) => s.setSettingsOpen);
  const venue = useDesk((s) => s.venue);
  const creds = useDesk((s) => s.creds);
  const risk = useDesk((s) => s.risk);
  const setRisk = useDesk((s) => s.setRisk);
  const connectError = useDesk((s) => s.connectError);
  const resetSim = useDesk((s) => s.resetSim);
  const tapeSource = useDesk((s) => s.tapeSource);
  const barsSource = useDesk((s) => s.barsSource);

  const [draftVenue, setDraftVenue] = useState<Venue>(venue);
  const [keyId, setKeyId] = useState(creds?.keyId ?? "");
  const [secret, setSecret] = useState(creds?.secret ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await connectAlpaca(draftVenue, keyId, secret);
    setBusy(false);
    if (res.ok) {
      setMsg(draftVenue === "sim" ? "Simulation desk armed." : "Alpaca connected.");
    } else {
      setMsg(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogTitle>Desk settings</DialogTitle>
        <DialogDescription>
          Keys stay in this browser and are sent only to Alpaca via the app proxy. Never stored on the server.
        </DialogDescription>

        <div className="mt-4 space-y-2">
          {VENUES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setDraftVenue(v.id)}
              className={cn(
                "flex w-full flex-col border px-3 py-2 text-left",
                draftVenue === v.id ? "border-accent bg-elevated" : "border-border hover:bg-elevated",
              )}
            >
              <span className="font-mono text-xs text-fg">{v.label}</span>
              <span className="font-mono text-micro text-muted">{v.hint}</span>
            </button>
          ))}
        </div>

        {draftVenue !== "sim" ? (
          <div className="mt-4 space-y-2">
            <label className="block font-mono text-micro tracking-widest text-subtle uppercase">
              Key ID
              <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} className="mt-1" autoComplete="off" />
            </label>
            <label className="block font-mono text-micro tracking-widest text-subtle uppercase">
              Secret
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1"
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-4 border border-border bg-elevated px-3 py-2">
          <p className="font-mono text-micro tracking-widest text-subtle uppercase">Market data</p>
          {draftVenue === "sim" ? (
            <p className="mt-1 font-mono text-2xs leading-relaxed text-muted">
              Quotes and candles from Yahoo Finance (delayed). Book is the local $100k sim. No keys.
            </p>
          ) : (
            <p className="mt-1 font-mono text-2xs leading-relaxed text-muted">
              Same Alpaca key pair drives both APIs. Tape and candles from data.alpaca.markets (IEX
              real-time on free keys; SIP if you subscribe). Account, positions, and orders from the
              paper or live trading host. Yahoo fills any missed snapshot. REST poll — quotes 8s,
              book 15s.
            </p>
          )}
          <p className="mt-2 font-mono text-micro tracking-widest text-subtle uppercase">
            Live tape {TAPE_LABEL[tapeSource]} · bars {barsSource === "alpaca" ? "IEX" : barsSource === "yahoo" ? "YH" : "SEED"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="block font-mono text-micro tracking-widest text-subtle uppercase">
            Max day loss %
            <Input
              value={String(risk.maxDailyLossPct)}
              onChange={(e) => setRisk({ maxDailyLossPct: Number(e.target.value) || 0 })}
              className="mt-1"
              inputMode="decimal"
            />
          </label>
          <label className="block font-mono text-micro tracking-widest text-subtle uppercase">
            Max pos %
            <Input
              value={String(risk.maxPositionPct)}
              onChange={(e) => setRisk({ maxPositionPct: Number(e.target.value) || 0 })}
              className="mt-1"
              inputMode="decimal"
            />
          </label>
        </div>

        {msg || connectError ? (
          <p className="mt-3 font-mono text-2xs text-accent">{msg ?? connectError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={busy} size="lg" className="flex-1">
            {busy ? "Connecting…" : "Save venue"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              resetSim();
              setDraftVenue("sim");
              setMsg("Sim book reset to $100,000.");
            }}
          >
            Reset SIM
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

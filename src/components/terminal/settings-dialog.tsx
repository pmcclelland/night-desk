import { useEffect, useState } from "react";
import { useDesk } from "@/lib/store";
import { connectAlpaca } from "@/lib/sync";
import { queuePersist } from "@/lib/desk-sync";
import { listDeskTokens, mintDeskToken, revokeDeskToken } from "@/lib/server/desk-api";
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
      <DialogContent className="max-h-[min(92dvh,720px)] w-[min(92vw,480px)] overflow-y-auto">
        <DialogTitle>Desk settings</DialogTitle>
        <DialogDescription>
          Alpaca keys are encrypted on the operator desk so a Grok Bot can trade through MCP. SIM needs no keys.
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
              onChange={(e) => {
                setRisk({ maxDailyLossPct: Number(e.target.value) || 0 });
                queuePersist();
              }}
              className="mt-1"
              inputMode="decimal"
            />
          </label>
          <label className="block font-mono text-micro tracking-widest text-subtle uppercase">
            Max pos %
            <Input
              value={String(risk.maxPositionPct)}
              onChange={(e) => {
                setRisk({ maxPositionPct: Number(e.target.value) || 0 });
                queuePersist();
              }}
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
              queuePersist();
            }}
          >
            Reset SIM
          </Button>
        </div>

        <McpPanel open={open} />
      </DialogContent>
    </Dialog>
  );
}

type TokenRow = { id: string; name: string; tokenPrefix: string; createdAt: string };

function McpPanel({ open }: { open: boolean }) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!open) return;
    void listDeskTokens()
      .then(setTokens)
      .catch(() => setTokens([]));
  }, [open]);

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const row = await mintDeskToken({ data: { name: "Grok Bot" } });
      setTokens((t) => [
        { id: row.id, name: row.name, tokenPrefix: row.tokenPrefix, createdAt: row.createdAt },
        ...t,
      ]);
      setRevealed(row.token ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mint token");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await revokeDeskToken({ data: { id } });
      setTokens((t) => t.filter((x) => x.id !== id));
      setRevealed(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="font-mono text-micro tracking-widest text-subtle uppercase">Grok Bot MCP</p>
      <p className="mt-1 font-mono text-2xs leading-relaxed text-muted">
        Point a Grok custom bot at this MCP with a bearer token. Tools can place orders, flatten,
        halt, and answer freeform desk questions.
      </p>
      <p className="mt-2 break-all font-mono text-2xs text-fg">{origin}/api/mcp</p>
      {revealed ? (
        <p className="mt-2 break-all border border-accent/40 bg-elevated px-2 py-2 font-mono text-2xs text-accent">
          {revealed}
          <span className="mt-1 block text-muted">Shown once. Store it on the bot, then close this.</span>
        </p>
      ) : null}
      {error ? <p className="mt-2 font-mono text-2xs text-down">{error}</p> : null}
      <div className="mt-3 space-y-1">
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 border border-border px-2 py-1.5">
            <span className="truncate font-mono text-2xs text-muted">{t.tokenPrefix}</span>
            <button
              type="button"
              className="font-mono text-micro tracking-widest text-down uppercase"
              onClick={() => void revoke(t.id)}
              disabled={busy}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => void mint()}>
        {busy ? "Minting…" : "Mint bot token"}
      </Button>
    </div>
  );
}

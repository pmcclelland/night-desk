import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  formatThesisAge,
  toBookPerformanceView,
  type BookThesis,
  type Conviction,
} from "@/lib/book-view";
import { money, pct, px, qty, signClass, signedMoney } from "@/lib/format";
import { isTypingTarget } from "@/lib/keys";
import { selectSymbol } from "@/lib/desk-sync";
import { listTheses, putThesis } from "@/lib/server/desk-api";
import { fetchBrainSignals } from "@/lib/server/trader-signals";
import { disconnectedSignals, SIGNALS_NOT_CONNECTED, type SignalsSnapshot } from "@/lib/signals";
import {
  loadGuestTheses,
  mergeThesisWrite,
  parseDriversInput,
  removeGuestThesis,
  thesisIsBlank,
  upsertGuestThesis,
} from "@/lib/thesis";
import { selectLiveFeed, selectVenue, useDesk, useLiveBook } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const CONVICTIONS: Conviction[] = ["high", "medium", "low"];

type ThesisForm = {
  reasoning: string;
  conviction: Conviction | null;
  drivers: string;
  invalidation: string;
  target: string;
};

const EMPTY_FORM: ThesisForm = {
  reasoning: "",
  conviction: null,
  drivers: "",
  invalidation: "",
  target: "",
};

function formFromThesis(thesis: BookThesis | null): ThesisForm {
  if (!thesis) return EMPTY_FORM;
  return {
    reasoning: thesis.reasoning,
    conviction: thesis.conviction,
    drivers: thesis.drivers.join(", "),
    invalidation: thesis.invalidation ?? "",
    target: thesis.target != null ? String(thesis.target) : "",
  };
}

export function BookReview() {
  const navigate = useNavigate();
  const { account, positions } = useLiveBook();
  const venue = useDesk(selectVenue);
  const guest = useDesk((s) => s.guestDemo);
  const liveFeed = useDesk(selectLiveFeed);
  const selected = useDesk((s) => s.selected);
  const [theses, setTheses] = useState<Record<string, BookThesis>>({});
  const [signals, setSignals] = useState<SignalsSnapshot | { status: "loading" }>({
    status: "loading",
  });
  const [saving, setSaving] = useState(false);

  const view = useMemo(
    () =>
      toBookPerformanceView({
        venue,
        guest,
        liveFeed,
        account,
        positions,
        theses,
      }),
    [venue, guest, liveFeed, account, positions, theses],
  );

  const symbols = view.positions.map((p) => p.symbol);
  const tickerKey = symbols.join(",");
  const [cursor, setCursor] = useState(() => selected);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<ThesisForm>(EMPTY_FORM);

  useEffect(() => {
    if (guest) {
      setTheses(loadGuestTheses());
      return;
    }
    let live = true;
    void listTheses()
      .then((rows) => {
        if (live) setTheses(rows);
      })
      .catch(() => {
        if (live) setTheses({});
      });
    return () => {
      live = false;
    };
  }, [guest]);

  useEffect(() => {
    const tickers = tickerKey ? tickerKey.split(",") : [];
    let live = true;
    const fallback = window.setTimeout(() => {
      if (live) setSignals(disconnectedSignals());
    }, 4000);
    void fetchBrainSignals({ data: { tickers } })
      .then((snap) => {
        if (!live) return;
        window.clearTimeout(fallback);
        setSignals(snap);
      })
      .catch(() => {
        if (!live) return;
        window.clearTimeout(fallback);
        setSignals(disconnectedSignals());
      });
    return () => {
      live = false;
      window.clearTimeout(fallback);
    };
  }, [tickerKey]);

  useEffect(() => {
    if (symbols.includes(selected)) setCursor(selected);
    else if (symbols[0] && !symbols.includes(cursor)) setCursor(symbols[0]);
  }, [selected, symbols, cursor]);

  useEffect(() => {
    if (!expanded) return;
    setForm(formFromThesis(theses[expanded] ?? null));
  }, [expanded, theses]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        if (expanded) {
          e.preventDefault();
          setExpanded(null);
          return;
        }
        e.preventDefault();
        void navigate({ to: "/" });
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        setExpanded((cur) => (cur === cursor ? null : cursor));
        return;
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        if (cursor) {
          selectSymbol(cursor);
          void navigate({ to: "/" });
        }
        return;
      }

      const down = e.key === "j" || e.key === "J" || e.key === "ArrowDown";
      const up = e.key === "k" || e.key === "K" || e.key === "ArrowUp";
      if (!down && !up) return;
      e.preventDefault();
      const i = Math.max(0, symbols.indexOf(cursor));
      const next = symbols[down ? Math.min(symbols.length - 1, i + 1) : Math.max(0, i - 1)];
      if (!next) return;
      setCursor(next);
      selectSymbol(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, expanded, navigate, symbols]);

  async function saveExpanded() {
    if (!expanded) return;
    const last = view.positions.find((p) => p.symbol === expanded)?.last ?? null;
    const draft = {
      symbol: expanded,
      reasoning: form.reasoning,
      conviction: form.conviction,
      drivers: parseDriversInput(form.drivers),
      invalidation: form.invalidation || null,
      target: form.target.trim() ? Number(form.target) : null,
      last,
    };
    if (draft.target != null && !Number.isFinite(draft.target)) return;
    setSaving(true);
    try {
      if (guest) {
        if (thesisIsBlank(draft)) setTheses(removeGuestThesis(expanded));
        else setTheses(upsertGuestThesis(mergeThesisWrite(theses[expanded] ?? null, draft)));
        return;
      }
      const { thesis } = await putThesis({ data: draft });
      setTheses((prev) => {
        const next = { ...prev };
        if (thesis) next[thesis.symbol] = thesis;
        else delete next[expanded];
        return next;
      });
    } finally {
      setSaving(false);
    }
  }

  const openRow = view.positions.find((p) => p.symbol === expanded) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
      <section className="shrink-0 border-b border-border bg-surface px-3 py-2">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">
          Book · {view.positions.length} names
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          <Stat label="Unrl" value={`${signedMoney(view.unrealizedPl)}`} valueClass={signClass(view.unrealizedPl)} />
          <Stat
            label="Day"
            value={`${signedMoney(view.dayPl)} ${pct(view.dayPlPct)}`}
            valueClass={signClass(view.dayPl)}
          />
          <Stat label="Realized" value={signedMoney(view.realizedToday)} />
          <Stat label="Cash" value={money(view.cash, true)} />
        </div>
      </section>

      <SignalsPanel symbols={symbols} signals={signals} />

      {view.positions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 font-mono text-micro tracking-widest text-subtle uppercase">
          No open risk
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full font-mono text-2xs tabular-nums">
            <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
              <tr>
                <th className="w-px whitespace-nowrap px-2 py-1 text-left font-medium">Sym</th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-medium sm:table-cell">
                  Qty
                </th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-medium md:table-cell">
                  Wgt
                </th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-medium sm:table-cell">
                  Cost
                </th>
                <th className="w-px whitespace-nowrap px-2 py-1 text-right font-medium">P&L</th>
                <th className="hidden w-px whitespace-nowrap px-2 py-1 text-right font-medium md:table-cell">
                  Day
                </th>
                <th className="w-full px-2 py-1 text-left font-medium">Thesis</th>
              </tr>
            </thead>
            <tbody>
              {view.positions.map((p) => {
                const active = p.symbol === cursor;
                const open = expanded === p.symbol;
                return (
                  <tr
                    key={p.symbol}
                    data-symbol={p.symbol}
                    data-last={String(p.last)}
                    className={cn(
                      "cursor-pointer border-t border-border/60",
                      active ? "bg-elevated" : "hover:bg-elevated/60",
                    )}
                    onClick={() => {
                      setCursor(p.symbol);
                      selectSymbol(p.symbol);
                      setExpanded(p.symbol);
                    }}
                  >
                    <td className="w-px whitespace-nowrap px-2 py-1.5 text-left text-fg">{p.symbol}</td>
                    <td className="hidden w-px whitespace-nowrap px-2 py-1.5 text-right sm:table-cell">
                      {qty(p.qty)}
                    </td>
                    <td className="hidden w-px whitespace-nowrap px-2 py-1.5 text-right md:table-cell">
                      {pct(p.weightPct, false)}
                    </td>
                    <td className="hidden w-px whitespace-nowrap px-2 py-1.5 text-right text-muted sm:table-cell">
                      {px(p.avgPrice)}
                    </td>
                    <td className={cn("w-px whitespace-nowrap px-2 py-1.5 text-right", signClass(p.unrealizedPl))}>
                      {signedMoney(p.unrealizedPl)}{" "}
                      <span className="text-micro">{pct(p.unrealizedPlPct)}</span>
                    </td>
                    <td
                      className={cn(
                        "hidden w-px whitespace-nowrap px-2 py-1.5 text-right md:table-cell",
                        signClass(p.dayPl),
                      )}
                    >
                      {signedMoney(p.dayPl)}{" "}
                      <span className="text-micro">{pct(p.dayPlPct)}</span>
                    </td>
                    <td className="w-full px-2 py-1.5 text-left text-subtle">
                      <span className="flex max-w-[60ch] items-baseline gap-2">
                        <span className={cn("min-w-0 truncate", open && "text-fg")}>
                          {p.thesis?.reasoning || "—"}
                        </span>
                        {p.health?.stale ? (
                          <span className="shrink-0 text-micro tracking-widest text-down uppercase">Stale</span>
                        ) : p.health ? (
                          <span className="shrink-0 text-micro tracking-widest text-subtle uppercase">
                            {formatThesisAge(p.health.ageDays)}
                          </span>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {openRow ? (
            <ThesisEditor
              row={openRow}
              form={form}
              guest={guest}
              saving={saving}
              onChange={setForm}
              onSave={() => void saveExpanded()}
              onClose={() => setExpanded(null)}
            />
          ) : null}
        </div>
      )}
      <p className="shrink-0 border-t border-border px-3 py-2 font-mono text-micro tracking-widest text-subtle uppercase">
        j k move · enter thesis · g trade · p desk
      </p>
    </div>
  );
}

function signalsBody(
  signals: SignalsSnapshot | { status: "loading" },
  symbols: string[],
) {
  switch (signals.status) {
    case "loading":
      return <p className="mt-2 font-mono text-2xs text-subtle">Checking signals…</p>;
    case "disconnected":
      return <p className="mt-2 font-mono text-2xs text-muted">{SIGNALS_NOT_CONNECTED}</p>;
    case "connected":
      if (symbols.length === 0) {
        return <p className="mt-2 font-mono text-2xs text-subtle">No held names</p>;
      }
      return (
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {symbols.map((sym) => {
            const row = signals.byTicker[sym];
            return (
              <li key={sym} className="min-w-0 font-mono text-2xs">
                <span className="text-fg">{sym}</span>
                {row ? (
                  <span className="text-muted">
                    {" "}
                    {row.direction ?? "—"} · {row.convictionLabel ?? "—"}
                    {row.thesisSummary ? ` · ${row.thesisSummary}` : ""}
                  </span>
                ) : (
                  <span className="text-subtle"> —</span>
                )}
              </li>
            );
          })}
        </ul>
      );
    default: {
      const _exhaustive: never = signals;
      void _exhaustive;
      return null;
    }
  }
}

function SignalsPanel({
  symbols,
  signals,
}: {
  symbols: string[];
  signals: SignalsSnapshot | { status: "loading" };
}) {
  return (
    <section className="shrink-0 border-b border-border bg-surface px-3 py-2">
      <p className="font-mono text-micro tracking-widest text-accent uppercase">Brain</p>
      {signalsBody(signals, symbols)}
    </section>
  );
}

function ThesisEditor({
  row,
  form,
  guest,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  row: ReturnType<typeof toBookPerformanceView>["positions"][number];
  form: ThesisForm;
  guest: boolean;
  saving: boolean;
  onChange: (next: ThesisForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const health = row.health;
  return (
    <div className="border-t border-border bg-surface px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-micro tracking-widest text-accent uppercase">{row.symbol}</p>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-micro tracking-widest text-subtle uppercase hover:text-fg"
        >
          Close
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-2xs">
        <HealthStat
          label="Age"
          value={health ? formatThesisAge(health.ageDays) : "—"}
          warn={health?.stale}
        />
        <HealthStat
          label="Since written"
          value={health?.movePct != null ? pct(health.movePct) : "—"}
          valueClass={health?.movePct != null ? signClass(health.movePct) : undefined}
        />
        <HealthStat label="Stale" value={health?.stale ? "30d+" : "No"} warn={health?.stale} />
        {row.thesis?.writtenPrice != null ? (
          <HealthStat label="Written" value={px(row.thesis.writtenPrice)} />
        ) : null}
      </div>

      {guest ? (
        <p className="mt-3 font-mono text-micro tracking-widest text-muted uppercase">
          Local only · not written to the desk
        </p>
      ) : null}

      <label className="mt-3 block">
        <span className="font-mono text-micro tracking-widest text-subtle uppercase">Reasoning</span>
        <textarea
          value={form.reasoning}
          onChange={(e) => onChange({ ...form, reasoning: e.target.value })}
          rows={3}
          className="mt-1 w-full resize-y border border-border bg-bg px-2 py-2 font-mono text-2xs text-fg outline-none placeholder:text-subtle focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="Why this name is in the book"
        />
      </label>

      <div className="mt-3">
        <p className="font-mono text-micro tracking-widest text-subtle uppercase">Conviction</p>
        <div className="mt-1 flex items-center">
          {CONVICTIONS.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-pressed={form.conviction === c}
              onClick={() => onChange({ ...form, conviction: form.conviction === c ? null : c })}
              className={cn(
                "h-11 px-2 font-mono text-micro tracking-widest uppercase sm:h-7",
                i > 0 && "border-l border-border",
                form.conviction === c ? "text-accent" : "text-subtle hover:text-fg",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 block">
        <span className="font-mono text-micro tracking-widest text-subtle uppercase">Drivers</span>
        <Input
          value={form.drivers}
          onChange={(e) => onChange({ ...form, drivers: e.target.value })}
          placeholder="comma separated"
          className="mt-1 h-11 text-2xs sm:h-9"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="font-mono text-micro tracking-widest text-subtle uppercase">Invalidation</span>
          <Input
            value={form.invalidation}
            onChange={(e) => onChange({ ...form, invalidation: e.target.value })}
            className="mt-1 h-11 text-2xs sm:h-9"
          />
        </label>
        <label>
          <span className="font-mono text-micro tracking-widest text-subtle uppercase">Target</span>
          <Input
            value={form.target}
            onChange={(e) => onChange({ ...form, target: e.target.value })}
            inputMode="decimal"
            className="mt-1 h-11 text-2xs sm:h-9"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="md" className="h-11 sm:h-9" disabled={saving} onClick={onSave}>
          {saving ? "Saving" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="h-11 sm:h-9"
          disabled={saving}
          onClick={() => onChange(EMPTY_FORM)}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

function HealthStat({
  label,
  value,
  warn,
  valueClass,
}: {
  label: string;
  value: string;
  warn?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col leading-none">
      <span className="font-mono text-micro tracking-widest text-subtle uppercase">{label}</span>
      <span
        className={cn(
          "mt-1 whitespace-nowrap font-mono text-2xs tabular-nums",
          warn ? "text-down" : "text-fg",
          valueClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col leading-none">
      <span className="font-mono text-micro tracking-widest text-subtle uppercase">{label}</span>
      <span className={cn("whitespace-nowrap font-mono text-2xs tabular-nums text-fg", valueClass)}>
        {value}
      </span>
    </div>
  );
}

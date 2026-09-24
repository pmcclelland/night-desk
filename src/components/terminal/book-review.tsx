import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
import { BookCurvePanel } from "@/components/terminal/book-curve";
import { BookJournal } from "@/components/terminal/book-journal";
import {
  nextCurveRange,
  reconstructSimCurve,
  toBookCurveSnapshot,
  type BookCurveSnapshot,
} from "@/lib/book-curve";
import {
  attachJournalThesis,
  buildRoundTrips,
  capJournal,
  clipJournal,
  fillsFromOrders,
  type JournalFill,
  type JournalRow,
} from "@/lib/book-journal";
import { fetchOwnerBookCurve, fetchOwnerJournalFills, listTheses, putThesis } from "@/lib/server/desk-api";
import { fetchPublicCurveSeries } from "@/lib/server/market";
import { fetchBrainSignals } from "@/lib/server/trader-signals";
import { disconnectedSignals, SIGNALS_NOT_CONNECTED, type SignalsSnapshot } from "@/lib/signals";
import type { CurveRange } from "@/lib/types";
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
  const { account, positions, orders } = useLiveBook();
  const venue = useDesk(selectVenue);
  const guest = useDesk((s) => s.guestDemo);
  const liveFeed = useDesk(selectLiveFeed);
  const selected = useDesk((s) => s.selected);
  const [theses, setTheses] = useState<Record<string, BookThesis>>({});
  const [signals, setSignals] = useState<SignalsSnapshot | { status: "loading" }>({
    status: "loading",
  });
  const [saving, setSaving] = useState(false);
  const [curveRange, setCurveRange] = useState<CurveRange>("1M");
  const [curve, setCurve] = useState<BookCurveSnapshot | null>(null);
  const [curveLoading, setCurveLoading] = useState(true);
  const [journalFills, setJournalFills] = useState<JournalFill[]>([]);
  const [journalLoading, setJournalLoading] = useState(true);

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

  const symbols = useMemo(() => view.positions.map((p) => p.symbol), [view.positions]);
  const tickerKey = symbols.join(",");
  const lotKey = view.positions.map((p) => `${p.symbol}:${p.qty}`).join(",");
  const useAlpacaCurve = !guest && venue !== "sim";
  const simJournal = guest || venue === "sim";
  const orderKey = orders
    .filter((o) => o.status === "filled" || o.status === "partially_filled")
    .map((o) => o.id)
    .join(",");
  const [cursor, setCursor] = useState(() => selected);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<ThesisForm>(EMPTY_FORM);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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
    let live = true;
    setCurveLoading(true);
    const lots = view.positions.map((p) => ({ symbol: p.symbol, qty: p.qty }));
    const cash = view.cash;
    const run = useAlpacaCurve
      ? fetchOwnerBookCurve({ data: { range: curveRange } }).then((raw) =>
          toBookCurveSnapshot({
            range: curveRange,
            label: "alpaca",
            book: raw.book,
            spy: raw.spy,
          }),
        )
      : fetchPublicCurveSeries({
          data: { symbols: [...lots.map((l) => l.symbol), "SPY"], range: curveRange },
        }).then((raw) => {
          const book = reconstructSimCurve(lots, raw.series, cash);
          return toBookCurveSnapshot({
            range: curveRange,
            label: "sim",
            book,
            spy: (raw.series.SPY ?? []).map((b) => ({ t: b.t, v: b.c })),
          });
        });
    void run
      .then((snap) => {
        if (live) setCurve(snap);
      })
      .catch(() => {
        if (live) setCurve(null);
      })
      .finally(() => {
        if (live) setCurveLoading(false);
      });
    return () => {
      live = false;
    };
    // Lots + range only — do not refetch on every LIVE mark.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cash/view snapshot at fetch time
  }, [curveRange, useAlpacaCurve, lotKey]);

  useEffect(() => {
    let live = true;
    setJournalLoading(true);
    const run = useAlpacaCurve
      ? fetchOwnerJournalFills({ data: { range: curveRange } }).then((raw) => raw.fills)
      : Promise.resolve(fillsFromOrders(orders));
    void run
      .then((fills) => {
        if (live) setJournalFills(fills);
      })
      .catch(() => {
        if (live) setJournalFills([]);
      })
      .finally(() => {
        if (live) setJournalLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orders snapshotted via orderKey
  }, [curveRange, useAlpacaCurve, orderKey]);

  const journalRows: JournalRow[] = useMemo(
    () =>
      attachJournalThesis(capJournal(clipJournal(buildRoundTrips(journalFills), curveRange)), theses),
    [journalFills, curveRange, theses],
  );
  const journalNav = useMemo(() => journalRows.map((row) => `jr:${row.id}`), [journalRows]);
  const navKeys = useMemo(() => [...symbols, ...journalNav], [symbols, journalNav]);

  useEffect(() => {
    if (cursor.startsWith("jr:")) {
      if (!navKeys.includes(cursor)) setCursor(symbols[0] ?? journalNav[0] ?? selected);
      return;
    }
    if (symbols.includes(selected)) setCursor(selected);
    else if (symbols[0] && !symbols.includes(cursor)) setCursor(symbols[0]);
  }, [selected, symbols, cursor, navKeys, journalNav]);

  useEffect(() => {
    if (!expanded) return;
    setForm(formFromThesis(theses[expanded] ?? null));
    rowRefs.current[expanded]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [expanded, theses]);

  useEffect(() => {
    function journalSymbol(key: string) {
      if (!key.startsWith("jr:")) return null;
      const id = key.slice(3);
      return journalRows.find((row) => row.id === id)?.symbol ?? null;
    }

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
        if (!cursor || cursor.startsWith("jr:") || !symbols.includes(cursor)) return;
        e.preventDefault();
        setExpanded((cur) => (cur === cursor ? null : cursor));
        return;
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        const symbol = cursor.startsWith("jr:") ? journalSymbol(cursor) : cursor;
        if (symbol) {
          selectSymbol(symbol);
          void navigate({ to: "/" });
        }
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setCurveRange((cur) => nextCurveRange(cur));
        return;
      }

      const down = e.key === "j" || e.key === "J" || e.key === "ArrowDown";
      const up = e.key === "k" || e.key === "K" || e.key === "ArrowUp";
      if (!down && !up) return;
      e.preventDefault();
      const i = Math.max(0, navKeys.indexOf(cursor));
      const next = navKeys[down ? Math.min(navKeys.length - 1, i + 1) : Math.max(0, i - 1)];
      if (!next) return;
      setCursor(next);
      if (symbols.includes(next)) selectSymbol(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, expanded, journalRows, navKeys, navigate, symbols]);

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

      <BookCurvePanel range={curveRange} onRange={setCurveRange} snap={curve} loading={curveLoading} />

      <SignalsPanel symbols={symbols} signals={signals} />

      {view.positions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 font-mono text-micro tracking-widest text-subtle uppercase">
          No open risk
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 font-mono text-2xs tabular-nums">
            <thead className="sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase">
              <tr>
                <th className="w-px whitespace-nowrap border-l-2 border-transparent px-2 py-1 text-left font-medium">
                  Sym
                </th>
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
                const marked = active || open;
                return (
                  <Fragment key={p.symbol}>
                    <tr
                      ref={(el) => {
                        rowRefs.current[p.symbol] = el;
                      }}
                      data-symbol={p.symbol}
                      data-last={String(p.last)}
                      className={cn(
                        "cursor-pointer border-t border-border/60",
                        marked ? "bg-elevated" : "hover:bg-elevated/60",
                      )}
                      onClick={() => {
                        setCursor(p.symbol);
                        selectSymbol(p.symbol);
                        setExpanded(p.symbol);
                      }}
                    >
                      <td
                        className={cn(
                          "w-px whitespace-nowrap border-l-2 px-2 py-1.5 text-left text-fg",
                          marked ? "border-accent" : "border-transparent",
                        )}
                      >
                        {p.symbol}
                      </td>
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
                      <td className="w-full min-w-0 max-w-0 px-2 py-1.5 text-left">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="min-w-0 truncate text-subtle">{p.thesis?.reasoning || "—"}</span>
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
                    {open && openRow ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="border-l-2 border-accent bg-surface p-0"
                        >
                          <ThesisEditor
                            row={openRow}
                            form={form}
                            guest={guest}
                            saving={saving}
                            onChange={setForm}
                            onSave={() => void saveExpanded()}
                            onClose={() => setExpanded(null)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <BookJournal
        rows={journalRows}
        loading={journalLoading}
        sim={simJournal}
        cursor={cursor}
        onPick={(id, symbol) => {
          setCursor(`jr:${id}`);
          selectSymbol(symbol);
        }}
      />
      <p className="shrink-0 border-t border-border px-3 py-2 font-mono text-micro tracking-widest text-subtle uppercase">
        j k move · enter thesis · r range · g trade · p desk
      </p>
    </div>
  );
}

function SignalsPanel({
  symbols,
  signals,
}: {
  symbols: string[];
  signals: SignalsSnapshot | { status: "loading" };
}) {
  switch (signals.status) {
    case "loading":
    case "disconnected":
      return (
        <section className="flex shrink-0 items-baseline gap-2 border-b border-border bg-surface px-3 py-2">
          <p className="font-mono text-micro tracking-widest text-accent uppercase">Brain</p>
          <p className="font-mono text-micro text-subtle">
            {signals.status === "disconnected" ? SIGNALS_NOT_CONNECTED : "Checking signals…"}
          </p>
        </section>
      );
    case "connected": {
      const named = symbols.filter((sym) => signals.byTicker[sym]);
      const quiet = symbols.length - named.length;
      return (
        <section className="shrink-0 border-b border-border bg-surface px-3 py-2">
          <p className="font-mono text-micro tracking-widest text-accent uppercase">Brain</p>
          {symbols.length === 0 ? (
            <p className="mt-2 font-mono text-2xs text-subtle">No held names</p>
          ) : (
            <>
              {named.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {named.map((sym) => {
                    const row = signals.byTicker[sym];
                    if (!row) return null;
                    return (
                      <li key={sym} className="min-w-0 truncate font-mono text-2xs">
                        <span className="text-fg">{sym}</span>
                        <span className="text-muted">
                          {" "}
                          {row.direction ?? "—"} · {row.convictionLabel ?? "—"}
                          {row.thesisSummary ? ` · ${row.thesisSummary}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {quiet > 0 ? (
                <p className="mt-1 font-mono text-2xs text-subtle">
                  {quiet} quiet
                </p>
              ) : null}
            </>
          )}
        </section>
      );
    }
    default: {
      const _exhaustive: never = signals;
      void _exhaustive;
      return null;
    }
  }
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-2xs">
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
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-micro tracking-widest text-subtle uppercase hover:text-fg"
        >
          Close
        </button>
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
        <div role="group" aria-label="Conviction" className="mt-1 flex items-center">
          {CONVICTIONS.map((c, i) => (
            <Fragment key={c}>
              {i > 0 ? (
                <span className="mx-0.5 inline-block h-3 w-px shrink-0 self-center bg-border" aria-hidden />
              ) : null}
              <button
                type="button"
                aria-pressed={form.conviction === c}
                onClick={() => onChange({ ...form, conviction: form.conviction === c ? null : c })}
                className={cn(
                  "px-1.5 py-2.5 font-mono text-2xs leading-6 tracking-widest uppercase md:py-2",
                  form.conviction === c ? "text-accent" : "text-subtle hover:text-fg",
                )}
              >
                {c}
              </button>
            </Fragment>
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

      <div className="mt-3 flex items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="font-mono text-micro tracking-widest text-subtle uppercase">Invalidation</span>
          <Input
            value={form.invalidation}
            onChange={(e) => onChange({ ...form, invalidation: e.target.value })}
            className="mt-1 h-11 text-2xs sm:h-9"
          />
        </label>
        <label className="w-[12ch] shrink-0">
          <span className="font-mono text-micro tracking-widest text-subtle uppercase">Target</span>
          <Input
            value={form.target}
            onChange={(e) => onChange({ ...form, target: e.target.value })}
            inputMode="decimal"
            className="mt-1 h-11 w-full text-2xs tabular-nums sm:h-9"
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

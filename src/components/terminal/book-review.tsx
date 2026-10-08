import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  toBookPerformanceView,
  type BookThesis,
  type Conviction,
} from "@/lib/book-view";
import {
  clipCatalysts,
  heldCatalysts,
  seedCatalysts,
  type CatalystRow,
} from "@/lib/book-catalysts";
import { toConcentrationSnapshot } from "@/lib/book-concentration";
import { money, pct, px, qty, signClass, signedMoney } from "@/lib/format";
import { isTypingTarget } from "@/lib/keys";
import { selectSymbol } from "@/lib/desk-sync";
import { BookCatalysts } from "@/components/terminal/book-catalysts";
import { BookConcentration } from "@/components/terminal/book-concentration";
import { BookCurvePanel } from "@/components/terminal/book-curve";
import { BookJournal } from "@/components/terminal/book-journal";
import { BookChains } from "@/components/terminal/book-chains";
import { BookNews } from "@/components/terminal/book-news";
import { ReviewCard, ReviewEmpty } from "@/components/terminal/review-card";
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
  reviewNavKeys,
  stepReviewNav,
  type JournalFill,
  type JournalRow,
} from "@/lib/book-journal";
import {
  fetchOwnerBookCurve,
  fetchOwnerCatalysts,
  fetchOwnerJournalFills,
  listTheses,
  putThesis,
} from "@/lib/server/desk-api";
import { fetchPublicCurveSeries } from "@/lib/server/market";
import { fetchTickerNews } from "@/lib/server/news";
import { fetchBrainSignals } from "@/lib/server/trader-signals";
import { disconnectedSignals, SIGNALS_NOT_CONNECTED, type SignalsSnapshot } from "@/lib/signals";
import type { NewsItem } from "@/lib/news";
import {
  convictionPlain,
  directionPlain,
  thesisAgePlain,
} from "@/lib/review-copy";
import type { CurveRange } from "@/lib/types";
import {
  loadGuestTheses,
  mergeThesisWrite,
  parseDriversInput,
  removeGuestThesis,
  thesisIsBlank,
  upsertGuestThesis,
} from "@/lib/thesis";
import { nameOf } from "@/lib/universe";
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
  const watchlist = useDesk((s) => s.watchlist);
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
  const [catalysts, setCatalysts] = useState<CatalystRow[]>([]);
  const [catalystLoading, setCatalystLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsFailed, setNewsFailed] = useState(false);

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
  const watchKey = watchlist.join(",");
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
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

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
    const held = tickerKey ? tickerKey.split(",") : [];
    const watched = watchKey ? watchKey.split(",") : [];
    const tickers = [...held, ...watched];
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
  }, [tickerKey, watchKey]);

  useEffect(() => {
    const held = tickerKey ? tickerKey.split(",").filter(Boolean) : [];
    const watched = watchKey ? watchKey.split(",").filter(Boolean) : [];
    let live = true;
    setNewsLoading(true);
    setNewsFailed(false);
    void fetchTickerNews({ data: { held, watched } })
      .then((res) => {
        if (!live) return;
        setNews(res.items);
        setNewsFailed(!res.ok && res.items.length === 0);
      })
      .catch(() => {
        if (!live) return;
        setNews([]);
        setNewsFailed(true);
      })
      .finally(() => {
        if (live) setNewsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [tickerKey, watchKey]);

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

  useEffect(() => {
    let live = true;
    if (simJournal) {
      setCatalysts(heldCatalysts(clipCatalysts(seedCatalysts()), symbols));
      setCatalystLoading(false);
      return;
    }
    setCatalystLoading(true);
    void fetchOwnerCatalysts({ data: { symbols } })
      .then((raw) => {
        if (live) setCatalysts(raw.rows);
      })
      .catch(() => {
        if (live) setCatalysts([]);
      })
      .finally(() => {
        if (live) setCatalystLoading(false);
      });
    return () => {
      live = false;
    };
    // Held names only — do not refetch on every LIVE mark.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- symbols via tickerKey
  }, [simJournal, tickerKey]);

  const concentration = useMemo(
    () =>
      toConcentrationSnapshot({
        equity: view.equity,
        cash: view.cash,
        positions: view.positions.map((p) => ({ symbol: p.symbol, marketValue: p.marketValue })),
      }),
    [view.cash, view.equity, view.positions],
  );

  const journalRows: JournalRow[] = useMemo(
    () =>
      attachJournalThesis(capJournal(clipJournal(buildRoundTrips(journalFills), curveRange)), theses),
    [journalFills, curveRange, theses],
  );
  const journalNav = useMemo(() => journalRows.map((row) => `jr:${row.id}`), [journalRows]);
  const navKeys = useMemo(
    () => reviewNavKeys(symbols, journalRows.map((row) => row.id)),
    [symbols, journalRows],
  );
  const chainTickers = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const extra = signals.status === "connected" ? Object.keys(signals.allByTicker) : [];
    for (const raw of [...symbols, ...extra, selected]) {
      const s = raw.trim().toUpperCase();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }, [selected, signals, symbols]);
  const chainTicker = useMemo(() => {
    if (cursor && !cursor.startsWith("jr:") && chainTickers.includes(cursor)) return cursor;
    if (selected && chainTickers.includes(selected)) return selected;
    return chainTickers[0] ?? null;
  }, [chainTickers, cursor, selected]);

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
      const next = stepReviewNav(navKeys, cursor, down ? 1 : -1);
      if (!next || next === cursor) return;
      setCursor(next);
      if (expanded && next !== expanded) setExpanded(null);
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
  const names = view.positions.length;
  const hero =
    names === 0
      ? "No open positions right now."
      : `You're holding ${names} name${names === 1 ? "" : "s"}. Open profit is ${signedMoney(view.unrealizedPl)}. Today is ${signedMoney(view.dayPl)} (${pct(view.dayPlPct)}).`;

  function pickTicker(symbol: string) {
    setCursor(symbol);
    selectSymbol(symbol);
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-bg">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6">
        <header className="mb-5 max-w-3xl">
          <p className="text-xs tracking-wide text-subtle">Review</p>
          <h1 className="mt-1 font-sans text-xl font-medium tracking-tight text-fg text-balance md:text-2xl">
            {hero}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">
            Cash on hand {money(view.cash, true)}
            {view.realizedToday
              ? ` · locked in today ${signedMoney(view.realizedToday)}`
              : ""}
            . This page is for reading the book, not sending orders.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BookCurvePanel range={curveRange} onRange={setCurveRange} snap={curve} loading={curveLoading} />
          </div>
          <BookConcentration snap={concentration} sim={simJournal} />

          <div className="lg:col-span-2">
            <ReviewCard
              title="Holdings"
              dek="What you own, how much of the book it is, and why you still hold it."
            >
              {view.positions.length === 0 ? (
                <ReviewEmpty>No open risk — nothing is currently held.</ReviewEmpty>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {view.positions.map((p) => {
                    const active = p.symbol === cursor;
                    const open = expanded === p.symbol;
                    return (
                      <article
                        key={p.symbol}
                        ref={(el) => {
                          rowRefs.current[p.symbol] = el;
                        }}
                        data-symbol={p.symbol}
                        data-last={String(p.last)}
                        className={cn(
                          "rounded-md border border-border bg-bg p-3",
                          active ? "border-accent/70" : "",
                        )}
                      >
                        <button
                          type="button"
                          className="w-full min-h-11 text-left"
                          onClick={() => {
                            pickTicker(p.symbol);
                            setExpanded(p.symbol);
                          }}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="min-w-0 truncate text-sm font-medium text-fg">
                              {nameOf(p.symbol)}{" "}
                              <span className="font-mono text-2xs font-normal text-muted">{p.symbol}</span>
                            </h3>
                            <span className={cn("shrink-0 font-mono text-sm tabular-nums", signClass(p.unrealizedPl))}>
                              {signedMoney(p.unrealizedPl)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted">
                            {qty(p.qty)} shares · {pct(p.weightPct, false)} of the book · avg cost {px(p.avgPrice)}
                          </p>
                          <p className={cn("mt-1 text-xs tabular-nums", signClass(p.unrealizedPlPct))}>
                            Open {pct(p.unrealizedPlPct)} · today{" "}
                            <span className={signClass(p.dayPl)}>
                              {signedMoney(p.dayPl)} {pct(p.dayPlPct)}
                            </span>
                          </p>
                          <p className="mt-2 min-w-0 truncate text-xs leading-relaxed text-subtle">
                            {p.thesis?.reasoning || "No note yet on why this is in the book."}
                          </p>
                          {p.health ? (
                            <p className={cn("mt-1 text-xs", p.health.stale ? "text-down" : "text-subtle")}>
                              {thesisAgePlain(p.health.ageDays, p.health.stale)}
                            </p>
                          ) : null}
                        </button>
                        {open && openRow ? (
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
                      </article>
                    );
                  })}
                </div>
              )}
            </ReviewCard>
          </div>

          <div className="flex flex-col gap-4">
            <SignalsPanel symbols={symbols} signals={signals} />
            <BookChains
              ticker={chainTicker}
              tickers={chainTickers}
              signals={signals}
              onPick={pickTicker}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:col-span-3 lg:grid-cols-2">
            <BookNews items={news} loading={newsLoading} failed={newsFailed} />
            <BookCatalysts rows={catalysts} loading={catalystLoading} sim={simJournal} />
          </div>
          <div className="lg:col-span-3">
            <BookJournal
              rows={journalRows}
              loading={journalLoading}
              sim={simJournal}
              cursor={cursor}
              onPick={(id) => {
                setCursor(`jr:${id}`);
                setExpanded(null);
              }}
            />
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-subtle text-pretty">
          j / k move between names and closed trades · Enter opens your note · r changes the
          time window · g opens that name on Trade · P returns to the desk.
        </p>
      </div>
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
      return (
        <ReviewCard title="Research notes" dek="Latest take from the vault for names you hold.">
          <ReviewEmpty>Checking research notes…</ReviewEmpty>
        </ReviewCard>
      );
    case "disconnected":
      return (
        <ReviewCard title="Research notes" dek="Latest take from the vault for names you hold.">
          <ReviewEmpty>
            {SIGNALS_NOT_CONNECTED}. The vault itself is private; Night Desk only reads the
            exported signals table.
          </ReviewEmpty>
        </ReviewCard>
      );
    case "connected": {
      const named = symbols.filter((sym) => signals.byTicker[sym]);
      const quiet = symbols.length - named.length;
      return (
        <ReviewCard title="Research notes" dek="Latest take from the vault for names you hold.">
          {symbols.length === 0 ? (
            <ReviewEmpty>No held names to match against research.</ReviewEmpty>
          ) : (
            <>
              {named.length > 0 ? (
                <ul className="space-y-3">
                  {named.map((sym) => {
                    const row = signals.byTicker[sym];
                    if (!row) return null;
                    return (
                      <li key={sym} className="min-w-0">
                        <p className="text-sm text-fg">
                          {nameOf(sym)}{" "}
                          <span className="font-mono text-2xs text-muted">{sym}</span>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted text-pretty">
                          {directionPlain(row.direction)} · {convictionPlain(row.convictionLabel)}
                          {row.thesisSummary ? ` — ${row.thesisSummary}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ReviewEmpty>No research notes for the names you hold.</ReviewEmpty>
              )}
              {quiet > 0 ? (
                <p className="mt-3 text-xs text-subtle">
                  {quiet} held name{quiet === 1 ? "" : "s"} without a research note.
                </p>
              ) : null}
            </>
          )}
        </ReviewCard>
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
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 text-xs leading-relaxed text-muted">
          <p>{health ? thesisAgePlain(health.ageDays, health.stale) : "No saved note yet."}</p>
          {health?.movePct != null ? (
            <p>
              Price since you wrote this:{" "}
              <span className={signClass(health.movePct)}>{pct(health.movePct)}</span>
              {row.thesis?.writtenPrice != null ? ` (from ${px(row.thesis.writtenPrice)})` : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-2 text-xs text-subtle hover:text-fg md:min-h-0"
        >
          Close
        </button>
      </div>

      {guest ? (
        <p className="mt-2 text-xs text-muted">Saved in this browser only — not written to the desk.</p>
      ) : null}

      <label className="mt-3 block">
        <span className="text-xs text-muted">Why you hold this</span>
        <textarea
          value={form.reasoning}
          onChange={(e) => onChange({ ...form, reasoning: e.target.value })}
          rows={3}
          className="mt-1 w-full resize-y rounded-md border border-border bg-surface px-2 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="A short note in plain English"
        />
      </label>

      <div className="mt-3">
        <p className="text-xs text-muted">How sure you are</p>
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
                  "min-h-11 px-1.5 py-2 text-xs capitalize md:min-h-0 md:py-2",
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
        <span className="text-xs text-muted">What has to go right</span>
        <Input
          value={form.drivers}
          onChange={(e) => onChange({ ...form, drivers: e.target.value })}
          placeholder="comma separated"
          className="mt-1 h-11 text-sm sm:h-9"
        />
      </label>

      <div className="mt-3 flex items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="text-xs text-muted">What would prove this wrong</span>
          <Input
            value={form.invalidation}
            onChange={(e) => onChange({ ...form, invalidation: e.target.value })}
            className="mt-1 h-11 text-sm sm:h-9"
          />
        </label>
        <label className="w-[12ch] shrink-0">
          <span className="text-xs text-muted">Price aim</span>
          <Input
            value={form.target}
            onChange={(e) => onChange({ ...form, target: e.target.value })}
            inputMode="decimal"
            className="mt-1 h-11 w-full text-sm tabular-nums sm:h-9"
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

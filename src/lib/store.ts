import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";
import { DEFAULT_WATCHLIST, STARTER_LOTS } from "@/lib/universe";
import {
  createStarterBook,
  deriveAccount,
  markPositions,
  quoteMapFromSeed,
  seedBars,
  type SimBook,
} from "@/lib/sim";
import { defaultStrategies } from "@/lib/strategies";
import type {
  Account,
  Bar,
  BarRange,
  BarSource,
  ChartMode,
  BotLine,
  Creds,
  Order,
  Position,
  Quote,
  RiskSettings,
  StrategyInstance,
  TapeSource,
  Venue,
} from "@/lib/types";

export type MobileTab = "watch" | "chart" | "trade" | "book" | "bot";

const EMPTY_ACCOUNT: Account = {
  cash: 0,
  equity: 0,
  buyingPower: 0,
  lastEquity: 0,
  longValue: 0,
  shortValue: 0,
  dayPl: 0,
  dayPlPct: 0,
  realizedToday: 0,
  status: "—",
  patternDayTrader: false,
  daytradeCount: 0,
  tradingBlocked: false,
};

export interface DeskState {
  venue: Venue;
  creds: Creds | null;
  connected: boolean;
  connectError: string | null;
  watchlist: string[];
  selected: string;
  quotes: Record<string, Quote>;
  tapeSource: TapeSource;
  bars: Bar[];
  barsSymbol: string;
  barRange: BarRange;
  chartMode: ChartMode;
  liveFeed: boolean;
  barsSource: BarSource;
  barsLoading: boolean;
  sim: SimBook;
  account: Account | null;
  alpacaPositions: Position[];
  alpacaOrders: Order[];
  strategies: StrategyInstance[];
  botLog: BotLine[];
  botLogClearedAt: number;
  risk: RiskSettings;
  halted: boolean;
  settingsOpen: boolean;
  mobileTab: MobileTab;
  immersive: boolean;
  chartFocus: boolean;

  setVenue: (v: Venue) => void;
  setCreds: (c: Creds | null) => void;
  setConnected: (ok: boolean, error?: string | null) => void;
  setSelected: (s: string) => void;
  setBarRange: (r: BarRange) => void;
  setChartMode: (m: ChartMode) => void;
  setLiveFeed: (v: boolean) => void;
  setQuotes: (q: Record<string, Quote>, source?: TapeSource) => void;
  setBars: (symbol: string, bars: Bar[], source?: BarSource) => void;
  setBarsLoading: (v: boolean) => void;
  setSim: (sim: SimBook) => void;
  setAlpacaBook: (a: { account: Account; positions: Position[]; orders: Order[] }) => void;
  patchStrategy: (id: string, patch: Partial<StrategyInstance>) => void;
  setStrategies: (s: StrategyInstance[]) => void;
  addWatch: (s: string) => void;
  rmWatch: (s: string) => void;
  log: (kind: BotLine["kind"], text: string) => void;
  clearBotLog: () => void;
  setHalted: (v: boolean) => void;
  setRisk: (r: Partial<RiskSettings>) => void;
  setSettingsOpen: (v: boolean) => void;
  setMobileTab: (t: MobileTab) => void;
  setImmersive: (v: boolean) => void;
  setChartFocus: (v: boolean) => void;
  toggleChartFocus: () => void;
  resetSim: () => void;
  applyServerDesk: (d: {
    venue: Venue;
    watchlist: string[];
    selected: string;
    sim: SimBook;
    strategies: StrategyInstance[];
    botLog: BotLine[];
    botLogClearedAt?: number;
    risk: RiskSettings;
    halted: boolean;
    creds: { keyId: string; secret: string } | null;
    hasSecret?: boolean;
  }) => void;
}

function line(kind: BotLine["kind"], text: string): BotLine {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    t: Date.now(),
    kind,
    text,
  };
}

const seedSymbols = [...DEFAULT_WATCHLIST, ...STARTER_LOTS.map((l) => l.symbol)];

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      venue: "sim",
      creds: null,
      connected: false,
      connectError: null,
      watchlist: [...DEFAULT_WATCHLIST],
      selected: "AAPL",
      quotes: quoteMapFromSeed(seedSymbols),
      tapeSource: "seed",
      bars: seedBars("AAPL"),
      barsSymbol: "AAPL",
      barRange: "1M",
      chartMode: "candles",
      liveFeed: false,
      barsSource: "seed",
      barsLoading: false,
      sim: createStarterBook(),
      account: null,
      alpacaPositions: [],
      alpacaOrders: [],
      strategies: defaultStrategies(),
      botLog: [],
      botLogClearedAt: 0,
      risk: { maxDailyLossPct: 2, maxPositionPct: 15, defaultQty: 10 },
      halted: false,
      settingsOpen: false,
      mobileTab: "chart",
      immersive: false,
      chartFocus: false,

      setVenue: (v) => set({ venue: v, connected: v === "sim", connectError: null }),
      setCreds: (c) => set({ creds: c }),
      setConnected: (ok, error = null) => set({ connected: ok, connectError: error ?? null }),
      setSelected: (s) => set({ selected: s.toUpperCase() }),
      setBarRange: (r) => set({ barRange: r }),
      setChartMode: (m) => set({ chartMode: m }),
      setLiveFeed: (v) => set({ liveFeed: v }),
      setQuotes: (q, source) =>
        set({ quotes: { ...get().quotes, ...q }, ...(source ? { tapeSource: source } : {}) }),
      setBars: (symbol, bars, source) =>
        set({ bars, barsSymbol: symbol, barsLoading: false, ...(source ? { barsSource: source } : {}) }),
      setBarsLoading: (v) => set({ barsLoading: v }),
      setSim: (sim) => set({ sim }),
      setAlpacaBook: (a) =>
        set({ account: a.account, alpacaPositions: a.positions, alpacaOrders: a.orders }),
      setStrategies: (s) => set({ strategies: s }),
      patchStrategy: (id, patch) =>
        set({
          strategies: get().strategies.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }),
      addWatch: (s) => {
        const sym = s.toUpperCase();
        if (!sym || get().watchlist.includes(sym)) return;
        set({ watchlist: [...get().watchlist, sym] });
      },
      rmWatch: (s) => set({ watchlist: get().watchlist.filter((x) => x !== s) }),
      log: (kind, text) => set({ botLog: [...get().botLog, line(kind, text)].slice(-200) }),
      clearBotLog: () => set({ botLog: [], botLogClearedAt: Date.now() }),
      setHalted: (v) => set({ halted: v }),
      setRisk: (r) => set({ risk: { ...get().risk, ...r } }),
      setSettingsOpen: (v) => set({ settingsOpen: v }),
      setMobileTab: (t) => set({ mobileTab: t }),
      setImmersive: (v) => set({ immersive: v }),
      setChartFocus: (v) => set({ chartFocus: v }),
      toggleChartFocus: () => set({ chartFocus: !get().chartFocus }),
      resetSim: () =>
        set({
          sim: createStarterBook(),
          venue: "sim",
          halted: false,
          connected: true,
          connectError: null,
        }),
      applyServerDesk: (d) => {
        const current = get().creds;
        const keepSecret =
          d.creds?.keyId && current?.keyId === d.creds.keyId ? current.secret : current?.secret ?? "";
        set({
          venue: d.venue,
          watchlist: d.watchlist,
          selected: d.selected,
          sim: d.sim,
          strategies: d.strategies,
          botLog: d.botLog,
          botLogClearedAt: d.botLogClearedAt ?? get().botLogClearedAt,
          risk: d.risk,
          halted: d.halted,
          creds: d.creds?.keyId
            ? { keyId: d.creds.keyId, secret: keepSecret }
            : d.hasSecret
              ? current
              : null,
          connected: d.venue === "sim" || Boolean(d.creds?.keyId || d.hasSecret || current?.secret),
        });
      },
    }),
    {
      name: "nightdesk.v1",
      partialize: (s) => ({
        venue: s.venue === "alpaca-live" ? "alpaca-paper" : s.venue,
        creds: s.creds,
        watchlist: s.watchlist,
        selected: s.selected,
        barRange: s.barRange,
        chartMode: s.chartMode,
        liveFeed: s.liveFeed,
        sim: s.sim,
        strategies: s.strategies,
        botLog: s.botLog.slice(-80),
        botLogClearedAt: s.botLogClearedAt,
        risk: s.risk,
        halted: s.halted,
      }),
    },
  ),
);

export function selectAccount(s: DeskState): Account {
  if (s.venue === "sim") return deriveAccount(s.sim, s.quotes);
  return s.account ?? EMPTY_ACCOUNT;
}

export function selectPositions(s: DeskState): Position[] {
  if (s.venue === "sim") return markPositions(s.sim.positions, s.quotes);
  return s.alpacaPositions;
}

export function selectOrders(s: DeskState): Order[] {
  if (s.venue === "sim") return s.sim.orders;
  return s.alpacaOrders;
}

export function useLiveBook() {
  const venue = useDesk((s) => s.venue);
  const sim = useDesk((s) => s.sim);
  const quotes = useDesk((s) => s.quotes);
  const alpacaAccount = useDesk((s) => s.account);
  const alpacaPositions = useDesk((s) => s.alpacaPositions);
  const alpacaOrders = useDesk((s) => s.alpacaOrders);
  return useMemo(() => {
    if (venue === "sim") {
      return {
        account: deriveAccount(sim, quotes),
        positions: markPositions(sim.positions, quotes),
        orders: sim.orders,
      };
    }
    return {
      account: alpacaAccount ?? EMPTY_ACCOUNT,
      positions: alpacaPositions,
      orders: alpacaOrders,
    };
  }, [venue, sim, quotes, alpacaAccount, alpacaPositions, alpacaOrders]);
}

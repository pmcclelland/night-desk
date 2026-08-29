import type {
  BarRange,
  BotLine,
  ChartMode,
  Creds,
  RiskSettings,
  StrategyInstance,
  Venue,
} from "./types.ts";

export const DEFAULT_LIVE_DATA = false;

export type DeskPersistInput = {
  venue: Venue;
  creds: Creds | null;
  watchlist: string[];
  selected: string;
  barRange: BarRange;
  chartMode: ChartMode;
  liveData: boolean;
  sim: unknown;
  strategies: StrategyInstance[];
  botLog: BotLine[];
  botLogClearedAt: number;
  risk: RiskSettings;
  halted: boolean;
};

export function persistDeskClient<S extends DeskPersistInput>(s: S) {
  return {
    venue: s.venue === "alpaca-live" ? "alpaca-paper" : s.venue,
    creds: s.creds,
    watchlist: s.watchlist,
    selected: s.selected,
    barRange: s.barRange,
    chartMode: s.chartMode,
    liveData: s.liveData,
    sim: s.sim,
    strategies: s.strategies,
    botLog: s.botLog.slice(-80),
    botLogClearedAt: s.botLogClearedAt,
    risk: s.risk,
    halted: s.halted,
  };
}

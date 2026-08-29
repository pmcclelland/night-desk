export const LIVE_QUOTE_MS = 8_000;
export const LIVE_ALPACA_MS = 15_000;
export const LIVE_STRATEGY_MS = 20_000;
export const LIVE_HYDRATE_MS = 30_000;

export type LiveFeedHooks = {
  refreshQuotes: () => void;
  refreshAlpaca: () => void;
  tickStrategies: () => void;
  hydrateDesk: () => void;
  isSim: () => boolean;
};

export type LiveFeedClock = {
  setInterval: (fn: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
  isHidden: () => boolean;
};

export function browserClock(): LiveFeedClock {
  return {
    setInterval: (fn, ms) => window.setInterval(fn, ms),
    clearInterval: (id) => window.clearInterval(id),
    addEventListener: (type, fn) => document.addEventListener(type, fn),
    removeEventListener: (type, fn) => document.removeEventListener(type, fn),
    isHidden: () => document.hidden,
  };
}

export function attachLiveFeed(hooks: LiveFeedHooks, clock: LiveFeedClock): () => void {
  const unlessHidden = (fn: () => void) => {
    if (clock.isHidden()) return;
    fn();
  };

  hooks.refreshQuotes();
  if (!hooks.isSim()) hooks.refreshAlpaca();

  const q = clock.setInterval(() => unlessHidden(() => hooks.refreshQuotes()), LIVE_QUOTE_MS);
  const a = clock.setInterval(
    () =>
      unlessHidden(() => {
        if (!hooks.isSim()) hooks.refreshAlpaca();
      }),
    LIVE_ALPACA_MS,
  );
  const s = clock.setInterval(() => unlessHidden(() => hooks.tickStrategies()), LIVE_STRATEGY_MS);
  const p = clock.setInterval(() => unlessHidden(() => hooks.hydrateDesk()), LIVE_HYDRATE_MS);
  const onVis = () => {
    if (clock.isHidden()) return;
    hooks.refreshQuotes();
    if (!hooks.isSim()) hooks.refreshAlpaca();
  };
  clock.addEventListener("visibilitychange", onVis);
  return () => {
    clock.clearInterval(q);
    clock.clearInterval(a);
    clock.clearInterval(s);
    clock.clearInterval(p);
    clock.removeEventListener("visibilitychange", onVis);
  };
}

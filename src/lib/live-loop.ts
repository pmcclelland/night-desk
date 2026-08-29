export const LIVE_POLL_MS = {
  quotes: 8000,
  alpaca: 15000,
  strategies: 20000,
  hydrate: 30000,
} as const;

export interface LiveLoopHandlers {
  refreshQuotes: () => void;
  refreshAlpaca: () => void;
  tickStrategies: () => void;
  hydrateDesk: () => void;
}

/**
 * Existing live tape: quotes / Alpaca book / armed-strategy ticks / desk hydrate,
 * plus a refresh when the tab becomes visible. SNAP tears this down by calling
 * the returned stopper — there is no websocket or SSE to close.
 */
export function startLiveLoop(handlers: LiveLoopHandlers): () => void {
  const unlessHidden = (fn: () => void) => {
    if (typeof document !== "undefined" && document.hidden) return;
    fn();
  };

  const q = window.setInterval(() => unlessHidden(handlers.refreshQuotes), LIVE_POLL_MS.quotes);
  const a = window.setInterval(() => unlessHidden(handlers.refreshAlpaca), LIVE_POLL_MS.alpaca);
  const s = window.setInterval(
    () => unlessHidden(handlers.tickStrategies),
    LIVE_POLL_MS.strategies,
  );
  const p = window.setInterval(() => unlessHidden(handlers.hydrateDesk), LIVE_POLL_MS.hydrate);
  const onVis = () => {
    if (document.hidden) return;
    handlers.refreshQuotes();
    handlers.refreshAlpaca();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    window.clearInterval(q);
    window.clearInterval(a);
    window.clearInterval(s);
    window.clearInterval(p);
    document.removeEventListener("visibilitychange", onVis);
  };
}

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
  /** When provided, every tick and visibility refresh no-ops if this returns false. */
  isLive?: () => boolean;
}

const STOP_KEY = "__nightdeskStopLiveLoop";

function readStop(): (() => void) | undefined {
  return (globalThis as Record<string, unknown>)[STOP_KEY] as (() => void) | undefined;
}

function writeStop(fn: (() => void) | undefined) {
  (globalThis as Record<string, unknown>)[STOP_KEY] = fn;
}

/** Tear down any live tape loop, including one started by a previous HMR/module copy. */
export function stopLiveLoop() {
  const stop = readStop();
  if (!stop) return;
  writeStop(undefined);
  stop();
}

/**
 * Existing live tape: quotes / Alpaca book / armed-strategy ticks / desk hydrate,
 * plus a refresh when the tab becomes visible. SNAP must call `stopLiveLoop`
 * (or the returned stopper). There is no websocket or SSE to close.
 *
 * Only one loop can run. A second start stops the first so polls cannot stack.
 */
export function startLiveLoop(handlers: LiveLoopHandlers): () => void {
  stopLiveLoop();

  const unlessLiveAndVisible = (fn: () => void) => {
    if (handlers.isLive && !handlers.isLive()) return;
    if (typeof document !== "undefined" && document.hidden) return;
    fn();
  };

  const q = window.setInterval(() => unlessLiveAndVisible(handlers.refreshQuotes), LIVE_POLL_MS.quotes);
  const a = window.setInterval(() => unlessLiveAndVisible(handlers.refreshAlpaca), LIVE_POLL_MS.alpaca);
  const s = window.setInterval(
    () => unlessLiveAndVisible(handlers.tickStrategies),
    LIVE_POLL_MS.strategies,
  );
  const p = window.setInterval(() => unlessLiveAndVisible(handlers.hydrateDesk), LIVE_POLL_MS.hydrate);
  const onVis = () => {
    if (handlers.isLive && !handlers.isLive()) return;
    if (document.hidden) return;
    handlers.refreshQuotes();
    handlers.refreshAlpaca();
  };
  document.addEventListener("visibilitychange", onVis);

  const stop = () => {
    window.clearInterval(q);
    window.clearInterval(a);
    window.clearInterval(s);
    window.clearInterval(p);
    document.removeEventListener("visibilitychange", onVis);
    if (readStop() === stop) writeStop(undefined);
  };
  writeStop(stop);
  return stop;
}

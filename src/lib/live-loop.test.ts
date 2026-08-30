import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { LIVE_POLL_MS, startLiveLoop, stopLiveLoop } from "./live-loop.ts";

type TimerHandle = { kind: "interval"; id: number };

function installTimerMocks() {
  const intervals = new Map<number, { fn: () => void; ms: number }>();
  let nextId = 1;
  const listeners = new Map<string, Set<EventListener>>();

  const setIntervalMock = ((fn: () => void, ms?: number) => {
    const id = nextId++;
    intervals.set(id, { fn, ms: ms ?? 0 });
    return id;
  }) as typeof setInterval;

  const clearIntervalMock = ((id: number | string | TimerHandle) => {
    intervals.delete(Number(id));
  }) as typeof clearInterval;

  const documentMock = {
    hidden: false,
    addEventListener(type: string, listener: EventListener) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
  };

  const prev = {
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    window: globalThis.window,
    document: globalThis.document,
  };

  Object.assign(globalThis, {
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
    window: { setInterval: setIntervalMock, clearInterval: clearIntervalMock },
    document: documentMock,
  });

  return {
    intervals,
    listeners,
    documentMock,
    restore() {
      globalThis.setInterval = prev.setInterval;
      globalThis.clearInterval = prev.clearInterval;
      if (prev.window === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        globalThis.window = prev.window;
      }
      if (prev.document === undefined) {
        Reflect.deleteProperty(globalThis, "document");
      } else {
        globalThis.document = prev.document;
      }
    },
  };
}

function makeHandlers() {
  const calls = { quotes: 0, alpaca: 0, strategies: 0, hydrate: 0 };
  let live = true;
  return {
    calls,
    setLive(v: boolean) {
      live = v;
    },
    handlers: {
      refreshQuotes: () => {
        calls.quotes += 1;
      },
      refreshAlpaca: () => {
        calls.alpaca += 1;
      },
      tickStrategies: () => {
        calls.strategies += 1;
      },
      hydrateDesk: () => {
        calls.hydrate += 1;
      },
      isLive: () => live,
    },
  };
}

describe("startLiveLoop", () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    stopLiveLoop();
    restore?.();
    restore = undefined;
  });

  it("schedules the four live polls and visibility refresh", () => {
    const host = installTimerMocks();
    restore = () => host.restore();
    const calls = { quotes: 0, alpaca: 0, strategies: 0, hydrate: 0 };

    const stop = startLiveLoop({
      refreshQuotes: () => {
        calls.quotes += 1;
      },
      refreshAlpaca: () => {
        calls.alpaca += 1;
      },
      tickStrategies: () => {
        calls.strategies += 1;
      },
      hydrateDesk: () => {
        calls.hydrate += 1;
      },
    });

    const delays = [...host.intervals.values()].map((t) => t.ms).sort((a, b) => a - b);
    assert.deepEqual(delays, [
      LIVE_POLL_MS.quotes,
      LIVE_POLL_MS.alpaca,
      LIVE_POLL_MS.strategies,
      LIVE_POLL_MS.hydrate,
    ]);
    assert.equal(host.listeners.get("visibilitychange")?.size, 1);

    for (const timer of host.intervals.values()) timer.fn();
    assert.deepEqual(calls, { quotes: 1, alpaca: 1, strategies: 1, hydrate: 1 });

    const vis = [...(host.listeners.get("visibilitychange") ?? [])][0];
    vis?.(new Event("visibilitychange"));
    assert.equal(calls.quotes, 2);
    assert.equal(calls.alpaca, 2);

    stop();
    assert.equal(host.intervals.size, 0);
    assert.equal(host.listeners.get("visibilitychange")?.size ?? 0, 0);
  });

  it("does not fire while the tab is hidden, and stop prevents later ticks", () => {
    const host = installTimerMocks();
    restore = () => host.restore();
    let quotes = 0;

    const stop = startLiveLoop({
      refreshQuotes: () => {
        quotes += 1;
      },
      refreshAlpaca: () => undefined,
      tickStrategies: () => undefined,
      hydrateDesk: () => undefined,
    });

    host.documentMock.hidden = true;
    for (const timer of host.intervals.values()) timer.fn();
    assert.equal(quotes, 0);

    const vis = [...(host.listeners.get("visibilitychange") ?? [])][0];
    vis?.(new Event("visibilitychange"));
    assert.equal(quotes, 0);

    stop();
    host.documentMock.hidden = false;
    assert.equal(host.intervals.size, 0);
    assert.equal(host.listeners.get("visibilitychange")?.size ?? 0, 0);
    assert.equal(quotes, 0);
  });

  it("does not stack a second start on top of the first", () => {
    const host = installTimerMocks();
    restore = () => host.restore();
    const first = makeHandlers();
    const second = makeHandlers();

    startLiveLoop(first.handlers);
    startLiveLoop(second.handlers);

    assert.equal(host.intervals.size, 4);
    for (const timer of host.intervals.values()) timer.fn();
    assert.deepEqual(first.calls, { quotes: 0, alpaca: 0, strategies: 0, hydrate: 0 });
    assert.deepEqual(second.calls, { quotes: 1, alpaca: 1, strategies: 1, hydrate: 1 });
  });

  it("skips ticks and visibility refresh once isLive is false (SNAP)", () => {
    const host = installTimerMocks();
    restore = () => host.restore();
    const { handlers, calls, setLive } = makeHandlers();

    startLiveLoop(handlers);
    setLive(false);
    for (const timer of host.intervals.values()) timer.fn();
    const vis = [...(host.listeners.get("visibilitychange") ?? [])][0];
    vis?.(new Event("visibilitychange"));
    assert.deepEqual(calls, { quotes: 0, alpaca: 0, strategies: 0, hydrate: 0 });
  });

  it("stopLiveLoop tears down even when SNAP never started a new loop", () => {
    const host = installTimerMocks();
    restore = () => host.restore();
    const { handlers, calls } = makeHandlers();

    startLiveLoop(handlers);
    stopLiveLoop();
    assert.equal(host.intervals.size, 0);
    assert.equal(host.listeners.get("visibilitychange")?.size ?? 0, 0);
    for (const timer of host.intervals.values()) timer.fn();
    assert.deepEqual(calls, { quotes: 0, alpaca: 0, strategies: 0, hydrate: 0 });
  });
});

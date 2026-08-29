import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attachLiveFeed, LIVE_ALPACA_MS, LIVE_HYDRATE_MS, LIVE_QUOTE_MS, LIVE_STRATEGY_MS } from "./live-feed.ts";

function makeClock() {
  const intervals = new Map<number, { fn: () => void; ms: number }>();
  const listeners = new Set<() => void>();
  let nextId = 1;
  let hidden = false;
  return {
    intervals,
    listeners,
    set hidden(v: boolean) {
      hidden = v;
    },
    setInterval(fn: () => void, ms: number) {
      const id = nextId++;
      intervals.set(id, { fn, ms });
      return id;
    },
    clearInterval(id: number) {
      intervals.delete(id);
    },
    addEventListener(_type: string, fn: () => void) {
      listeners.add(fn);
    },
    removeEventListener(_type: string, fn: () => void) {
      listeners.delete(fn);
    },
    isHidden() {
      return hidden;
    },
    tick(ms: number) {
      for (const slot of intervals.values()) {
        if (slot.ms === ms) slot.fn();
      }
    },
    visibility() {
      for (const fn of listeners) fn();
    },
  };
}

function makeHooks() {
  const calls = { quotes: 0, alpaca: 0, strategies: 0, hydrate: 0 };
  let sim = true;
  return {
    calls,
    setSim(v: boolean) {
      sim = v;
    },
    hooks: {
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
      isSim: () => sim,
    },
  };
}

describe("attachLiveFeed", () => {
  it("kicks quotes once, then polls on the live cadence", () => {
    const clock = makeClock();
    const { hooks, calls } = makeHooks();
    attachLiveFeed(hooks, clock);

    assert.equal(calls.quotes, 1);
    assert.equal(calls.alpaca, 0);
    assert.equal(clock.intervals.size, 4);
    assert.deepEqual(
      [...clock.intervals.values()].map((s) => s.ms).sort((a, b) => a - b),
      [LIVE_QUOTE_MS, LIVE_ALPACA_MS, LIVE_STRATEGY_MS, LIVE_HYDRATE_MS],
    );

    clock.tick(LIVE_QUOTE_MS);
    clock.tick(LIVE_ALPACA_MS);
    clock.tick(LIVE_STRATEGY_MS);
    clock.tick(LIVE_HYDRATE_MS);
    assert.equal(calls.quotes, 2);
    assert.equal(calls.alpaca, 0);
    assert.equal(calls.strategies, 1);
    assert.equal(calls.hydrate, 1);
  });

  it("polls Alpaca when the venue is not sim", () => {
    const clock = makeClock();
    const { hooks, calls, setSim } = makeHooks();
    setSim(false);
    attachLiveFeed(hooks, clock);
    assert.equal(calls.alpaca, 1);
    clock.tick(LIVE_ALPACA_MS);
    assert.equal(calls.alpaca, 2);
  });

  it("skips ticks while hidden and resumes on visibility", () => {
    const clock = makeClock();
    const { hooks, calls } = makeHooks();
    attachLiveFeed(hooks, clock);
    clock.hidden = true;
    clock.tick(LIVE_QUOTE_MS);
    assert.equal(calls.quotes, 1);
    clock.visibility();
    assert.equal(calls.quotes, 1);
    clock.hidden = false;
    clock.visibility();
    assert.equal(calls.quotes, 2);
  });

  it("tears down timers and the visibility listener immediately", () => {
    const clock = makeClock();
    const { hooks, calls } = makeHooks();
    const stop = attachLiveFeed(hooks, clock);
    stop();
    assert.equal(clock.intervals.size, 0);
    assert.equal(clock.listeners.size, 0);
    clock.tick(LIVE_QUOTE_MS);
    clock.visibility();
    assert.equal(calls.quotes, 1);
  });
});

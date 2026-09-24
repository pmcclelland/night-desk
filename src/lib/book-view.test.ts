import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { positionDayPlPct, positionWeightPct, toBookPerformanceView } from "./book-view.ts";
import type { Account, Position } from "./types.ts";

const account: Account = {
  cash: 40_000,
  equity: 100_000,
  buyingPower: 40_000,
  lastEquity: 99_000,
  longValue: 60_000,
  shortValue: 0,
  dayPl: 1_000,
  dayPlPct: 1.01,
  realizedToday: 250,
  status: "ACTIVE",
  patternDayTrader: false,
  daytradeCount: 0,
  tradingBlocked: false,
};

const pos: Position = {
  symbol: "AAPL",
  qty: 10,
  avgPrice: 100,
  last: 110,
  marketValue: 1_100,
  costBasis: 1_000,
  unrealizedPl: 100,
  unrealizedPlPct: 10,
  dayPl: 20,
};

describe("book-view", () => {
  it("derives weight and day pct from market value", () => {
    assert.equal(positionWeightPct(10_000, 100_000), 10);
    assert.equal(positionDayPlPct(20, 1_100), (20 / 1_080) * 100);
    assert.equal(positionWeightPct(10, 0), 0);
    assert.equal(positionDayPlPct(5, 5), 0);
  });

  it("joins open positions and leaves thesis empty", () => {
    const view = toBookPerformanceView({
      venue: "sim",
      guest: true,
      liveFeed: true,
      asOf: 1,
      account,
      positions: [pos],
    });
    assert.equal(view.positions.length, 1);
    assert.equal(view.positions[0]?.thesis, null);
    assert.equal(view.unrealizedPl, 100);
    assert.equal(view.realizedToday, 250);
    assert.equal(view.positions[0]?.weightPct, positionWeightPct(1_100, 100_000));
  });
});

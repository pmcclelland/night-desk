import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatThesisAge,
  positionDayPlPct,
  positionWeightPct,
  thesisHealth,
  toBookPerformanceView,
  type BookThesis,
} from "./book-view.ts";
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

const thesis: BookThesis = {
  symbol: "AAPL",
  reasoning: "add on AI spend",
  conviction: "high",
  drivers: ["AI"],
  invalidation: "break 90",
  target: 140,
  asOf: "2026-08-25T00:00:00.000Z",
  lastReviewed: "2026-09-24T00:00:00.000Z",
  writtenAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
  writtenPrice: 100,
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
    assert.equal(view.positions[0]?.health, null);
    assert.equal(view.unrealizedPl, 100);
    assert.equal(view.realizedToday, 250);
    assert.equal(view.positions[0]?.weightPct, positionWeightPct(1_100, 100_000));
  });

  it("attaches thesis health: age, move since written, stale at 30d", () => {
    const now = Date.parse("2026-09-24T00:00:00.000Z");
    const fresh = thesisHealth(thesis, 110, now);
    assert.ok(fresh);
    assert.equal(Math.floor(fresh.ageDays), 30);
    assert.equal(fresh.movePct, 10);
    assert.equal(fresh.stale, true);
    assert.equal(formatThesisAge(fresh.ageDays), "30d");

    const young = thesisHealth(
      { ...thesis, writtenAt: "2026-09-20T00:00:00.000Z", asOf: "2026-09-20T00:00:00.000Z" },
      110,
      now,
    );
    assert.ok(young);
    assert.equal(young.stale, false);
    assert.equal(formatThesisAge(0.2), "5h");
  });

  it("joins a stored thesis onto the row", () => {
    const view = toBookPerformanceView({
      venue: "sim",
      guest: false,
      liveFeed: false,
      asOf: Date.parse("2026-09-24T00:00:00.000Z"),
      account,
      positions: [pos],
      theses: { AAPL: thesis },
    });
    assert.equal(view.positions[0]?.thesis?.reasoning, "add on AI spend");
    assert.equal(view.positions[0]?.health?.stale, true);
    assert.equal(view.positions[0]?.health?.movePct, 10);
  });
});

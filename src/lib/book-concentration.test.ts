import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OTHER_SECTOR,
  TOP_N,
  barWidthPct,
  sectorOf,
  sharePct,
  toConcentrationSnapshot,
} from "./book-concentration.ts";

describe("book-concentration", () => {
  it("share of equity is 0 when equity is 0", () => {
    assert.equal(sharePct(10_000, 0), 0);
    assert.equal(sharePct(0, 100_000), 0);
    assert.equal(sharePct(25_000, 100_000), 25);
  });

  it("caps bar width at 0–100 of |share|", () => {
    assert.equal(barWidthPct(62.4), 62.4);
    assert.equal(barWidthPct(-12), 12);
    assert.equal(barWidthPct(150), 100);
    assert.equal(barWidthPct(Number.NaN), 0);
  });

  it("maps the desk universe and buckets unknown names as Other", () => {
    assert.equal(sectorOf("AAPL"), "Technology");
    assert.equal(sectorOf("SPY"), "Index");
    assert.equal(sectorOf("META"), "Communication");
    assert.equal(sectorOf("TSLA"), "Consumer");
    assert.equal(sectorOf("XYZ"), OTHER_SECTOR);
  });

  it("derives cash %, top-5 share, and sector split from the open book", () => {
    const snap = toConcentrationSnapshot({
      equity: 100_000,
      cash: 18_000,
      positions: [
        { symbol: "NVDA", marketValue: 22_000 },
        { symbol: "AAPL", marketValue: 18_000 },
        { symbol: "MSFT", marketValue: 14_000 },
        { symbol: "SPY", marketValue: 12_000 },
        { symbol: "META", marketValue: 8_000 },
        { symbol: "TSLA", marketValue: 8_000 },
      ],
    });
    assert.equal(snap.cashPct, 18);
    assert.equal(snap.top5.length, TOP_N);
    assert.deepEqual(
      snap.top5.map((p) => p.symbol),
      ["NVDA", "AAPL", "MSFT", "SPY", "META"],
    );
    assert.equal(snap.top5SharePct, 74);
    assert.equal(snap.top5[0]?.sharePct, 22);
    const tech = snap.sectors.find((s) => s.sector === "Technology");
    const comm = snap.sectors.find((s) => s.sector === "Communication");
    const index = snap.sectors.find((s) => s.sector === "Index");
    const consumer = snap.sectors.find((s) => s.sector === "Consumer");
    assert.equal(tech?.sharePct, 54);
    assert.equal(comm?.sharePct, 8);
    assert.equal(index?.sharePct, 12);
    assert.equal(consumer?.sharePct, 8);
    assert.equal(snap.sectors[0]?.sector, "Technology");
  });

  it("keeps fewer than five names and still reports their combined share", () => {
    const snap = toConcentrationSnapshot({
      equity: 50_000,
      cash: 10_000,
      positions: [
        { symbol: "AAPL", marketValue: 30_000 },
        { symbol: "MSFT", marketValue: 10_000 },
      ],
    });
    assert.equal(snap.top5.length, 2);
    assert.equal(snap.top5SharePct, 80);
    assert.equal(snap.cashPct, 20);
  });

  it("ranks by absolute market value so a large short still leads the top 5", () => {
    const snap = toConcentrationSnapshot({
      equity: 100_000,
      cash: 40_000,
      positions: [
        { symbol: "TSLA", marketValue: -25_000 },
        { symbol: "AAPL", marketValue: 10_000 },
        { symbol: "MSFT", marketValue: 8_000 },
      ],
    });
    assert.equal(snap.top5[0]?.symbol, "TSLA");
    assert.equal(snap.top5[0]?.sharePct, -25);
    assert.equal(snap.top5SharePct, -7);
  });

  it("puts unmapped tickers in Other", () => {
    const snap = toConcentrationSnapshot({
      equity: 10_000,
      cash: 1_000,
      positions: [
        { symbol: "AAPL", marketValue: 6_000 },
        { symbol: "XYZ", marketValue: 3_000 },
      ],
    });
    const other = snap.sectors.find((s) => s.sector === OTHER_SECTOR);
    assert.ok(other);
    assert.equal(other.marketValue, 3_000);
    assert.equal(other.sharePct, 30);
  });

  it("is empty when the book has no names", () => {
    const snap = toConcentrationSnapshot({
      equity: 100_000,
      cash: 100_000,
      positions: [],
    });
    assert.deepEqual(snap.top5, []);
    assert.equal(snap.top5SharePct, 0);
    assert.deepEqual(snap.sectors, []);
    assert.equal(snap.cashPct, 100);
  });
});

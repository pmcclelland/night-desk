import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alignByEtDay,
  clipEquityForCurve,
  curveWindow,
  nextCurveRange,
  curvePlotScale,
  curveTimeLabelPlacement,
  layoutCurveTimeLabels,
  formatCurveAxis,
  rebaseToStart,
  reconstructSimCurve,
  seriesReturn,
  toBookCurveSnapshot,
} from "./book-curve.ts";
import type { Bar, EquityPoint } from "./types.ts";

function pt(day: string, v: number): EquityPoint {
  return { t: Date.parse(`${day}T20:00:00.000Z`), v };
}

function bar(day: string, c: number): Bar {
  const t = Date.parse(`${day}T20:00:00.000Z`);
  return { t, o: c, h: c, l: c, c, v: 1 };
}

describe("book-curve", () => {
  it("cycles 1W → 1M → 3M → 1W", () => {
    assert.equal(nextCurveRange("1W"), "1M");
    assert.equal(nextCurveRange("1M"), "3M");
    assert.equal(nextCurveRange("3M"), "1W");
  });

  it("opens 3M three months before now", () => {
    const now = Date.parse("2026-09-24T18:00:00.000Z");
    const w = curveWindow("3M", now);
    assert.equal(w.end, "2026-09-24T18:00:00Z");
    assert.equal(w.start, "2026-06-24T18:00:00Z");
  });

  it("clips 1W to the last five ET sessions", () => {
    const now = Date.parse("2026-09-24T20:00:00.000Z");
    const pts = [
      pt("2026-09-16", 100),
      pt("2026-09-17", 101),
      pt("2026-09-18", 102),
      pt("2026-09-21", 103),
      pt("2026-09-22", 104),
      pt("2026-09-23", 105),
      pt("2026-09-24", 106),
    ];
    const clipped = clipEquityForCurve(pts, "1W", now);
    assert.equal(clipped.length, 5);
    assert.equal(clipped[0]?.v, 102);
    assert.equal(clipped[4]?.v, 106);
  });

  it("reconstructs SIM equity as cash + qty × close", () => {
    const bars = {
      AAPL: [bar("2026-09-22", 100), bar("2026-09-23", 110)],
      MSFT: [bar("2026-09-22", 200), bar("2026-09-23", 190)],
    };
    const curve = reconstructSimCurve(
      [
        { symbol: "AAPL", qty: 2 },
        { symbol: "MSFT", qty: 1 },
      ],
      bars,
      1_000,
    );
    assert.equal(curve.length, 2);
    assert.equal(curve[0]?.v, 1_000 + 2 * 100 + 200);
    assert.equal(curve[1]?.v, 1_000 + 2 * 110 + 190);
  });

  it("forward-fills a missing lot close so one gap does not drop the day", () => {
    const bars = {
      AAPL: [bar("2026-09-22", 100), bar("2026-09-23", 110)],
      MSFT: [bar("2026-09-22", 200)],
    };
    const curve = reconstructSimCurve(
      [
        { symbol: "AAPL", qty: 1 },
        { symbol: "MSFT", qty: 1 },
      ],
      bars,
      0,
    );
    assert.equal(curve.length, 2);
    assert.equal(curve[1]?.v, 110 + 200);
  });

  it("rebases SPY onto the book start and reports vs-SPY return", () => {
    const book = [pt("2026-09-22", 100), pt("2026-09-23", 110)];
    const spy = [pt("2026-09-22", 50), pt("2026-09-23", 55)];
    const snap = toBookCurveSnapshot({
      range: "1M",
      label: "sim",
      book,
      spy,
      now: Date.parse("2026-09-24T20:00:00.000Z"),
    });
    assert.equal(snap.bookRet, 10);
    assert.equal(snap.spyRet, 10);
    assert.equal(snap.vsSpy, 0);
    assert.equal(snap.spy[0]?.v, 100);
    assert.ok(Math.abs((snap.spy[1]?.v ?? 0) - 110) < 1e-9);
  });

  it("aligns book and SPY on the ET day and drops unmatched days", () => {
    const aligned = alignByEtDay(
      [pt("2026-09-22", 100), pt("2026-09-23", 110)],
      [pt("2026-09-23", 50), pt("2026-09-24", 60)],
    );
    assert.equal(aligned.book.length, 1);
    assert.equal(aligned.book[0]?.v, 110);
    assert.equal(aligned.spy[0]?.v, 50);
  });

  it("seriesReturn is null on an empty or zero start", () => {
    assert.equal(seriesReturn([]), null);
    assert.equal(seriesReturn([pt("2026-09-22", 0), pt("2026-09-23", 10)]), null);
  });

  it("pins first and last x labels to the plot edges only when the plot is narrow", () => {
    const labeled = [0, 4, 8, 12];
    const wide = curveTimeLabelPlacement(0, labeled, 20, 8, 200, 800);
    assert.equal(wide.anchor, "middle");
    assert.equal(wide.x, 20);
    const first = curveTimeLabelPlacement(0, labeled, 20, 8, 200, 390);
    assert.equal(first.anchor, "start");
    assert.equal(first.x, 8);
    const last = curveTimeLabelPlacement(12, labeled, 190, 8, 200, 390);
    assert.equal(last.anchor, "end");
    assert.equal(last.x, 208);
    const mid = curveTimeLabelPlacement(4, labeled, 80, 8, 200, 390);
    assert.equal(mid.anchor, "middle");
    assert.equal(mid.x, 80);
  });

  it("drops a narrow interior x label that crowds a pinned edge", () => {
    const ticks = [
      { i: 0, x: 20, text: "Aug 25" },
      { i: 4, x: 48, text: "Aug 31" },
      { i: 8, x: 120, text: "Sep 11" },
      { i: 12, x: 190, text: "Sep 23" },
    ];
    const wide = layoutCurveTimeLabels(ticks, 8, 200, 800);
    assert.equal(wide.length, 4);
    assert.ok(wide.every((l) => l.anchor === "middle"));
    const narrow = layoutCurveTimeLabels(ticks, 8, 200, 390);
    assert.equal(narrow[0]?.text, "Aug 25");
    assert.equal(narrow[0]?.anchor, "start");
    assert.equal(narrow[narrow.length - 1]?.text, "Sep 23");
    assert.equal(narrow[narrow.length - 1]?.anchor, "end");
    assert.equal(narrow.some((l) => l.text === "Aug 31"), false);
    assert.equal(narrow.some((l) => l.text === "Sep 11"), true);
  });

  it("drops a narrow interior x label that crowds the last pinned edge", () => {
    const ticks = [
      { i: 0, x: 20, text: "Aug 25" },
      { i: 8, x: 120, text: "Sep 11" },
      { i: 12, x: 175, text: "Sep 17" },
      { i: 16, x: 190, text: "Sep 23" },
    ];
    const narrow = layoutCurveTimeLabels(ticks, 8, 200, 390);
    assert.equal(narrow.some((l) => l.text === "Sep 17"), false);
    assert.equal(narrow[narrow.length - 1]?.text, "Sep 23");
  });

  it("pads the plot after nicing so the series floor is not a gridline", () => {
    const { min, max, ticks } = curvePlotScale(103_000, 104_500);
    assert.ok(min < 103_000);
    assert.ok(max > 104_500);
    assert.equal(ticks.includes(103_000), false);
    assert.ok(ticks.some((t) => t > 103_000));
  });

  it("formats axis labels with grouping on both large and small values", () => {
    assert.equal(formatCurveAxis(105000), "105,000");
    assert.equal(formatCurveAxis(100000), "100,000");
    assert.equal(formatCurveAxis(12.5), "12.50");
    assert.equal(formatCurveAxis(Number.NaN), "—");
  });

  it("rebaseToStart scales a series to a shared origin", () => {
    const out = rebaseToStart([pt("2026-09-22", 200), pt("2026-09-23", 220)], 100);
    assert.equal(out[0]?.v, 100);
    assert.ok(Math.abs((out[1]?.v ?? 0) - 110) < 1e-9);
  });
});

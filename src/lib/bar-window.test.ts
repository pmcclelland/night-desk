import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clipBarsForRange, etDateKey, normalizeBars, rangeWindow, rfc3339 } from "./bar-window.ts";
import type { Bar } from "./types.ts";

function bar(t: string, px = 100): Bar {
  const ts = Date.parse(t);
  return { t: ts, o: px, h: px + 1, l: px - 1, c: px, v: 1000 };
}

describe("rfc3339", () => {
  it("strips milliseconds Alpaca rejects", () => {
    assert.equal(rfc3339(new Date("2026-08-25T14:01:54.321Z")), "2026-08-25T14:01:54Z");
  });
});

describe("rangeWindow", () => {
  const now = Date.parse("2026-08-25T18:00:00.000Z");

  it("starts 1M about a month before end, not at today", () => {
    const w = rangeWindow("1M", now);
    assert.equal(w.end, "2026-08-25T18:00:00Z");
    assert.equal(w.start, "2026-07-25T18:00:00Z");
  });

  it("pads 1D and 5D so weekends still yield a session", () => {
    const d1 = rangeWindow("1D", now);
    const d5 = rangeWindow("5D", now);
    assert.equal(d1.start, "2026-08-18T18:00:00Z");
    assert.equal(d5.start, "2026-08-13T18:00:00Z");
  });

  it("opens 6M and 1Y far enough back for daily candles", () => {
    const m6 = rangeWindow("6M", now);
    const y1 = rangeWindow("1Y", now);
    assert.equal(m6.start, "2026-02-25T18:00:00Z");
    assert.equal(y1.start, "2025-08-25T18:00:00Z");
  });
});

describe("clipBarsForRange", () => {
  it("keeps only the last ET session for 1D", () => {
    const bars = [
      bar("2026-08-24T14:00:00Z", 100),
      bar("2026-08-24T19:00:00Z", 101),
      bar("2026-08-25T13:30:00Z", 102),
      bar("2026-08-25T15:00:00Z", 103),
    ];
    const clipped = clipBarsForRange(bars, "1D");
    assert.equal(clipped.length, 2);
    assert.equal(etDateKey(clipped[0]!.t), "2026-08-25");
    assert.equal(clipped[1]!.c, 103);
  });

  it("keeps five ET sessions for 5D", () => {
    const bars: Bar[] = [];
    for (let day = 17; day <= 25; day++) {
      bars.push(bar(`2026-08-${String(day).padStart(2, "0")}T14:00:00Z`, day));
    }
    const clipped = clipBarsForRange(bars, "5D");
    const days = [...new Set(clipped.map((b) => etDateKey(b.t)))];
    assert.equal(days.length, 5);
    assert.equal(days[0], "2026-08-21");
    assert.equal(days.at(-1), "2026-08-25");
  });

  it("does not trim daily 1M series", () => {
    const bars = [bar("2026-07-25T04:00:00Z", 90), bar("2026-08-25T04:00:00Z", 110)];
    assert.equal(clipBarsForRange(bars, "1M").length, 2);
  });

  it("drops incomplete OHLC and sorts", () => {
    const raw: Bar[] = [
      { t: Date.parse("2026-08-25T15:00:00Z"), o: 2, h: 3, l: 1, c: 2, v: 1 },
      { t: Date.parse("2026-08-25T14:00:00Z"), o: Number.NaN, h: 1, l: 1, c: 1, v: 1 },
      { t: Date.parse("2026-08-25T13:00:00Z"), o: 1, h: 1, l: 1, c: 1, v: 1 },
    ];
    const out = normalizeBars(raw);
    assert.deepEqual(
      out.map((b) => b.t),
      [Date.parse("2026-08-25T13:00:00Z"), Date.parse("2026-08-25T15:00:00Z")],
    );
  });
});

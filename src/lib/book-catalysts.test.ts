import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CATALYST_DAYS,
  DAY_MS,
  catalystWindow,
  clipCatalysts,
  etDateKeysInWindow,
  etDayFromKey,
  etDayStart,
  formatCatalystDay,
  formatDivDetail,
  formatEarnWhen,
  heldCatalysts,
  inCatalystWindow,
  kindLabel,
  mergeCatalysts,
  seedCatalysts,
  type CatalystRow,
} from "./book-catalysts.ts";

const now = Date.parse("2026-09-24T16:00:00.000Z"); // 12:00 ET

function row(over: Partial<CatalystRow> & Pick<CatalystRow, "id" | "at">): CatalystRow {
  return { symbol: "AAPL", kind: "earn", detail: "AMC", ...over };
}

describe("book-catalysts window", () => {
  it("opens 14 ET days from the start of today", () => {
    const { start, end } = catalystWindow(now);
    assert.equal(start, etDayStart(now));
    assert.equal(end - start, CATALYST_DAYS * DAY_MS);
    assert.equal(etDateKeysInWindow(now).length, CATALYST_DAYS);
    assert.equal(etDateKeysInWindow(now)[0], "2026-09-24");
    assert.equal(etDateKeysInWindow(now).at(-1), "2026-10-07");
  });

  it("keeps today and drops the day after the window", () => {
    assert.equal(inCatalystWindow(etDayFromKey("2026-09-24"), now), true);
    assert.equal(inCatalystWindow(etDayFromKey("2026-10-07"), now), true);
    assert.equal(inCatalystWindow(etDayFromKey("2026-10-08"), now), false);
    assert.equal(inCatalystWindow(etDayFromKey("2026-09-23"), now), false);
  });
});

describe("book-catalysts merge/sort", () => {
  it("sorts soonest first, then symbol, then kind", () => {
    const a = etDayFromKey("2026-09-29");
    const b = etDayFromKey("2026-10-02");
    const merged = mergeCatalysts([
      row({ id: "msft-ex", symbol: "MSFT", kind: "exdiv", at: b, detail: "$0.83" }),
      row({ id: "nvda", symbol: "NVDA", kind: "earn", at: a, detail: "BMO" }),
      row({ id: "aapl", symbol: "AAPL", kind: "earn", at: a, detail: "AMC" }),
      row({ id: "aapl-ex", symbol: "AAPL", kind: "exdiv", at: a, detail: "$0.25" }),
    ]);
    assert.deepEqual(
      merged.map((r) => r.id),
      ["aapl", "aapl-ex", "nvda", "msft-ex"],
    );
  });

  it("clips to the 14-day window and keeps held names", () => {
    const rows = [
      row({ id: "in", at: etDayFromKey("2026-09-29") }),
      row({ id: "out", at: etDayFromKey("2026-10-20") }),
      row({ id: "msft", symbol: "MSFT", at: etDayFromKey("2026-10-02") }),
    ];
    const clipped = clipCatalysts(rows, now);
    assert.deepEqual(
      clipped.map((r) => r.id),
      ["in", "msft"],
    );
    assert.deepEqual(
      heldCatalysts(clipped, ["AAPL"]).map((r) => r.id),
      ["in"],
    );
  });

  it("seeds names inside the window", () => {
    const seeded = clipCatalysts(seedCatalysts(now), now);
    assert.equal(seeded.length, 3);
    assert.ok(seeded.every((r) => inCatalystWindow(r.at, now)));
    assert.deepEqual(
      seeded.map((r) => r.symbol),
      ["AAPL", "MSFT", "NVDA"],
    );
  });

  it("formats the date, time bucket, and dividend", () => {
    assert.equal(formatCatalystDay(etDayFromKey("2026-09-29")), "Sep 29");
    assert.equal(formatEarnWhen("time-after-hours"), "AMC");
    assert.equal(formatEarnWhen("bmo"), "BMO");
    assert.equal(formatEarnWhen("time-not-supplied"), null);
    assert.equal(formatDivDetail(0.83), "$0.83");
    assert.equal(kindLabel("exdiv"), "Ex-div");
  });
});

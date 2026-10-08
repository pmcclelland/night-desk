import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BookCurveSnapshot } from "./book-curve.ts";
import {
  catalystKindPlain,
  checkpointKindPlain,
  convictionPlain,
  curveHeadline,
  directionPlain,
  evidencePlain,
  formatPoints,
  humanizeSlug,
  journalSidePlain,
  newsAgo,
  thesisAgePlain,
} from "./review-copy.ts";

function snap(over: Partial<BookCurveSnapshot> = {}): BookCurveSnapshot {
  return {
    range: "1M",
    label: "sim",
    book: [],
    spy: [],
    bookRet: 4.2,
    spyRet: 3.1,
    vsSpy: 1.1,
    ...over,
  };
}

describe("review-copy", () => {
  it("writes a sentence-style curve headline vs the S&P 500", () => {
    assert.equal(
      curveHeadline(snap()),
      "You're up 4.2% this month, 1.1 points ahead of the S&P 500.",
    );
    assert.equal(
      curveHeadline(snap({ bookRet: -1.3, spyRet: -0.9, vsSpy: -0.4, range: "1W" })),
      "You're down 1.3% this week, 0.4 points behind the S&P 500.",
    );
    assert.equal(curveHeadline(null), "No performance picture for this window yet.");
    assert.match(curveHeadline(snap({ vsSpy: 0.01 })), /about even with the S&P 500/);
  });

  it("maps jargon to plain English", () => {
    assert.equal(directionPlain("long"), "Looking for a rise");
    assert.equal(directionPlain("short"), "Looking for a fall");
    assert.equal(convictionPlain("medium-high"), "Fairly confident");
    assert.equal(evidencePlain("partial"), "Partly supported");
    assert.equal(checkpointKindPlain("break"), "Would break it");
    assert.equal(catalystKindPlain("exdiv"), "Ex-dividend");
    assert.equal(journalSidePlain("long"), "Bought, then sold");
    assert.equal(humanizeSlug("cuda-inference-premium"), "Cuda Inference Premium");
    assert.equal(thesisAgePlain(40, true), "Needs a fresh look (over 30 days old)");
    assert.equal(thesisAgePlain(5, false), "Written 5 days ago");
    assert.equal(formatPoints(-1.14), "1.1");
  });

  it("formats news age from a timestamp", () => {
    const now = Date.parse("2026-10-08T15:00:00.000Z");
    assert.equal(newsAgo(now - 3 * 60_000, now), "3m ago");
    assert.equal(newsAgo(now - 5 * 3_600_000, now), "5h ago");
  });
});

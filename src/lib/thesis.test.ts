import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeThesisWrite,
  normalizeThesis,
  parseDriversInput,
  thesesFromRows,
  thesisIsBlank,
  thesisKey,
} from "./thesis.ts";

describe("thesis", () => {
  it("normalizes desk_kv rows and keeps written timestamps", () => {
    const thesis = normalizeThesis(
      {
        symbol: "aapl",
        reasoning: "  add on AI spend ",
        conviction: "high",
        drivers: "AI, capex",
        invalidation: "break 90",
        target: "140",
        written_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
        written_price: 100,
      },
      { now: "2026-09-24T00:00:00.000Z" },
    );
    assert.ok(thesis);
    assert.equal(thesis.symbol, "AAPL");
    assert.equal(thesis.reasoning, "add on AI spend");
    assert.deepEqual(thesis.drivers, ["AI", "capex"]);
    assert.equal(thesis.writtenAt, "2026-08-01T00:00:00.000Z");
    assert.equal(thesis.updatedAt, "2026-09-01T00:00:00.000Z");
    assert.equal(thesis.asOf, "2026-08-01T00:00:00.000Z");
    assert.equal(thesis.writtenPrice, 100);
    assert.equal(thesisKey("AAPL"), "aapl");
  });

  it("preserves first writtenAt / writtenPrice on later saves", () => {
    const first = mergeThesisWrite(null, {
      symbol: "NVDA",
      reasoning: "inference",
      conviction: "medium",
      drivers: ["AI"],
      invalidation: null,
      target: null,
      last: 200,
    }, "2026-08-01T00:00:00.000Z");
    const next = mergeThesisWrite(first, {
      symbol: "NVDA",
      reasoning: "inference still",
      conviction: "high",
      drivers: ["AI", "export"],
      invalidation: "break 140",
      target: 260,
      last: 240,
    }, "2026-09-24T00:00:00.000Z");
    assert.equal(next.writtenAt, "2026-08-01T00:00:00.000Z");
    assert.equal(next.writtenPrice, 200);
    assert.equal(next.updatedAt, "2026-09-24T00:00:00.000Z");
    assert.equal(next.conviction, "high");
  });

  it("treats an empty draft as blank and maps kv rows by symbol", () => {
    assert.equal(
      thesisIsBlank({ reasoning: "  ", conviction: null, drivers: [], invalidation: "", target: null }),
      true,
    );
    assert.deepEqual(parseDriversInput(" AI, , capex "), ["AI", "capex"]);
    const map = thesesFromRows([
      { key: "msft", value: { symbol: "MSFT", reasoning: "cloud", writtenAt: "2026-01-01T00:00:00.000Z" } },
    ]);
    assert.equal(map.MSFT?.reasoning, "cloud");
  });
});

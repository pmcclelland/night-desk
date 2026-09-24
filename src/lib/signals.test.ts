import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SIGNALS_NOT_CONNECTED,
  connectedSignals,
  disconnectedSignals,
  latestSignalPerTicker,
  parseSignalRow,
  signalsDenied,
} from "./signals.ts";

describe("signals", () => {
  it("degrades to the not-connected snapshot", () => {
    const snap = disconnectedSignals();
    assert.equal(snap.status, "disconnected");
    assert.equal(snap.message, SIGNALS_NOT_CONNECTED);
    assert.deepEqual(snap.byTicker, {});
  });

  it("parses a trader signals row and keeps the latest per ticker", () => {
    const older = parseSignalRow({
      id: "1",
      schema_version: "1",
      as_of: "2026-09-01T00:00:00.000Z",
      mechanism_slug: "trend",
      ticker: "aapl",
      direction: "long",
      conviction_label: "high",
      conviction_score: 0.8,
      status: "active",
      sector_theme: "tech",
      thesis_summary: "old",
      synced_at: "2026-09-01T00:00:00.000Z",
    });
    const newer = parseSignalRow({
      id: "2",
      as_of: "2026-09-20T00:00:00.000Z",
      ticker: "AAPL",
      direction: "long",
      conviction_label: "medium",
      thesis_summary: "new",
    });
    assert.ok(older);
    assert.ok(newer);
    assert.equal(older.ticker, "AAPL");
    const latest = latestSignalPerTicker([older, newer]);
    assert.equal(latest.AAPL?.id, "2");
    assert.equal(latest.AAPL?.thesisSummary, "new");
    assert.equal(connectedSignals(latest).status, "connected");
  });

  it("treats anon deny statuses as disconnected", () => {
    assert.equal(signalsDenied(401), true);
    assert.equal(signalsDenied(403), true);
    assert.equal(signalsDenied(200), false);
    assert.equal(parseSignalRow({ ticker: "AAPL" }), null);
  });
});

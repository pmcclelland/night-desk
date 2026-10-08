import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SIGNALS_NOT_CONNECTED,
  connectedSignals,
  disconnectedSignals,
  groupSignalsByTicker,
  latestSignalPerTicker,
  parseSignalRow,
  signalHasChain,
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
    assert.equal(signalHasChain(older), false);
  });

  it("reads cause-effect chain and checkpoints from the data jsonb", () => {
    const row = parseSignalRow({
      id: "cuda-inference:NVDA",
      ticker: "NVDA",
      thesis_summary: "CUDA premium fades",
      data: {
        provenance: {
          mechanism_slug: "cuda-inference-premium",
          mechanism_title: "CUDA inference premium",
          source_refs: ["https://brain.example/cuda"],
        },
        thesis: {
          summary: "CUDA premium fades",
          chain: [
            { step: 1, claim: "Inference moves off CUDA", evidence_status: "partial", source_ref: "vault/nvda" },
            { step: 2, claim: "Software multiple compresses", evidence_status: "open" },
          ],
          contradictions: ["Datacenter still growing"],
        },
        checkpoints: [
          { kind: "next", date: "2026-10-21", label: "Q3 print", note: null },
          { kind: "break", date: null, label: "CUDA share holds", note: null },
        ],
      },
    });
    assert.ok(row);
    assert.equal(row.mechanismTitle, "CUDA inference premium");
    assert.equal(row.chain.length, 2);
    assert.equal(row.chain[0]?.claim, "Inference moves off CUDA");
    assert.equal(row.chain[0]?.evidenceStatus, "partial");
    assert.equal(row.checkpoints[0]?.kind, "next");
    assert.equal(row.sourceRefs[0], "https://brain.example/cuda");
    assert.equal(signalHasChain(row), true);
    const grouped = groupSignalsByTicker([row]);
    assert.equal(grouped.NVDA?.length, 1);
  });

  it("treats anon deny statuses as disconnected", () => {
    assert.equal(signalsDenied(401), true);
    assert.equal(signalsDenied(403), true);
    assert.equal(signalsDenied(200), false);
    assert.equal(parseSignalRow({ ticker: "AAPL" }), null);
  });
});

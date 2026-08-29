import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LIVE_DATA, persistDeskClient, type DeskPersistInput } from "./desk-persist.ts";

const persistSample: DeskPersistInput = {
  venue: "sim",
  creds: null,
  watchlist: ["AAPL"],
  selected: "AAPL",
  barRange: "1M",
  chartMode: "line",
  liveData: DEFAULT_LIVE_DATA,
  sim: {},
  strategies: [],
  botLog: [],
  botLogClearedAt: 0,
  risk: { maxDailyLossPct: 2, maxPositionPct: 15, defaultQty: 10 },
  halted: false,
};

describe("liveData persist", () => {
  it("defaults off so a first visit does not reopen a stream", () => {
    assert.equal(DEFAULT_LIVE_DATA, false);
    assert.equal(persistDeskClient(persistSample).liveData, false);
  });

  it("writes liveData next to barRange and chartMode in nightdesk.v1", () => {
    const slice = persistDeskClient(persistSample);
    assert.equal(slice.barRange, "1M");
    assert.equal(slice.chartMode, "line");
    assert.equal("liveData" in slice, true);
    const on = persistDeskClient({ ...persistSample, liveData: true });
    assert.equal(on.liveData, true);
  });
});

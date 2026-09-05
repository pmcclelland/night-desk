import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionLiveFeed, sessionTapeAllowed, sessionVenue, tapePollAllowed } from "./tape-gate.ts";

describe("tapePollAllowed", () => {
  it("blocks SNAP polls and lets LIVE or forced boot/user fetches through", () => {
    assert.equal(tapePollAllowed(false), false);
    assert.equal(tapePollAllowed(false, false), false);
    assert.equal(tapePollAllowed(false, true), true);
    assert.equal(tapePollAllowed(true), true);
    assert.equal(tapePollAllowed(true, false), true);
    assert.equal(tapePollAllowed(true, true), true);
  });
});

describe("sessionTapeAllowed", () => {
  it("lets guests poll tape even if stored SNAP is off", () => {
    assert.equal(sessionTapeAllowed(false, true), true);
    assert.equal(sessionTapeAllowed(true, true), true);
    assert.equal(sessionTapeAllowed(false, true, true), true);
  });

  it("matches tapePollAllowed when signed in", () => {
    assert.equal(sessionTapeAllowed(false, false), false);
    assert.equal(sessionTapeAllowed(false, false, true), true);
    assert.equal(sessionTapeAllowed(true, false), true);
  });
});

describe("session overlays", () => {
  it("forces SIM + LIVE tape while logged out and leaves stored settings alone when signed in", () => {
    assert.equal(sessionVenue("alpaca-live", true), "sim");
    assert.equal(sessionVenue("alpaca-paper", true), "sim");
    assert.equal(sessionVenue("sim", true), "sim");
    assert.equal(sessionVenue("alpaca-live", false), "alpaca-live");
    assert.equal(sessionLiveFeed(true, true), true);
    assert.equal(sessionLiveFeed(false, true), true);
    assert.equal(sessionLiveFeed(true, false), true);
    assert.equal(sessionLiveFeed(false, false), false);
  });
});

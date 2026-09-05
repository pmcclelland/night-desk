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
  it("blocks every tape call for a logged-out guest, including force", () => {
    assert.equal(sessionTapeAllowed(false, true), false);
    assert.equal(sessionTapeAllowed(true, true), false);
    assert.equal(sessionTapeAllowed(true, true, true), false);
    assert.equal(sessionTapeAllowed(false, true, true), false);
  });

  it("matches tapePollAllowed when signed in", () => {
    assert.equal(sessionTapeAllowed(false, false), false);
    assert.equal(sessionTapeAllowed(false, false, true), true);
    assert.equal(sessionTapeAllowed(true, false), true);
  });
});

describe("session overlays", () => {
  it("forces SIM + SNAP while logged out and leaves stored settings alone when signed in", () => {
    assert.equal(sessionVenue("alpaca-live", true), "sim");
    assert.equal(sessionVenue("alpaca-paper", true), "sim");
    assert.equal(sessionVenue("sim", true), "sim");
    assert.equal(sessionVenue("alpaca-live", false), "alpaca-live");
    assert.equal(sessionLiveFeed(true, true), false);
    assert.equal(sessionLiveFeed(false, true), false);
    assert.equal(sessionLiveFeed(true, false), true);
    assert.equal(sessionLiveFeed(false, false), false);
  });
});

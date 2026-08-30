import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tapePollAllowed } from "./tape-gate.ts";

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

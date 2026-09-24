import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachJournalThesis,
  buildRoundTrips,
  capJournal,
  clipJournal,
  fillsFromOrders,
  formatHold,
  thesisSnippet,
  type JournalFill,
} from "./book-journal.ts";
import type { BookThesis } from "./book-view.ts";
import type { Order } from "./types.ts";

function fill(partial: Partial<JournalFill> & Pick<JournalFill, "id" | "side" | "qty" | "price" | "t">): JournalFill {
  return { symbol: "AAPL", ...partial };
}

function order(partial: Partial<Order> & Pick<Order, "id" | "side" | "qty">): Order {
  return {
    clientOrderId: partial.id,
    symbol: "AAPL",
    type: "market",
    filledQty: partial.filledQty ?? partial.qty,
    tif: "day",
    status: "filled",
    submittedAt: partial.submittedAt ?? 1,
    filledAt: partial.filledAt ?? 1,
    filledAvgPrice: partial.filledAvgPrice ?? 100,
    source: "manual",
    ...partial,
  };
}

const thesis = (over: Partial<BookThesis> = {}): BookThesis => ({
  symbol: "AAPL",
  reasoning: "add on AI spend",
  conviction: "high",
  drivers: ["AI"],
  invalidation: null,
  target: null,
  asOf: "2026-08-01T00:00:00.000Z",
  lastReviewed: "2026-08-01T00:00:00.000Z",
  writtenAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  writtenPrice: 100,
  ...over,
});

describe("book-journal FIFO", () => {
  it("closes a long as buy then sell", () => {
    const trips = buildRoundTrips([
      fill({ id: "b", side: "buy", qty: 10, price: 100, t: 1 }),
      fill({ id: "s", side: "sell", qty: 10, price: 110, t: 2 }),
    ]);
    assert.equal(trips.length, 1);
    assert.equal(trips[0]?.side, "long");
    assert.equal(trips[0]?.qty, 10);
    assert.equal(trips[0]?.entryPrice, 100);
    assert.equal(trips[0]?.exitPrice, 110);
    assert.equal(trips[0]?.realizedPl, 100);
    assert.equal(trips[0]?.realizedPlPct, 10);
    assert.equal(trips[0]?.holdMs, 1);
  });

  it("closes a short as sell then buy", () => {
    const trips = buildRoundTrips([
      fill({ id: "s", side: "sell", qty: 5, price: 200, t: 1 }),
      fill({ id: "b", side: "buy", qty: 5, price: 180, t: 3 }),
    ]);
    assert.equal(trips.length, 1);
    assert.equal(trips[0]?.side, "short");
    assert.equal(trips[0]?.realizedPl, 100);
    assert.equal(trips[0]?.realizedPlPct, 10);
    assert.equal(trips[0]?.holdMs, 2);
  });

  it("uses FIFO when two buys are closed by one sell", () => {
    const trips = buildRoundTrips([
      fill({ id: "b1", side: "buy", qty: 4, price: 100, t: 1 }),
      fill({ id: "b2", side: "buy", qty: 6, price: 120, t: 2 }),
      fill({ id: "s", side: "sell", qty: 10, price: 130, t: 3 }),
    ]);
    assert.equal(trips.length, 2);
    const first = trips.find((t) => t.entryPrice === 100);
    const second = trips.find((t) => t.entryPrice === 120);
    assert.equal(first?.qty, 4);
    assert.equal(first?.realizedPl, 4 * 30);
    assert.equal(second?.qty, 6);
    assert.equal(second?.realizedPl, 6 * 10);
  });

  it("keeps a remainder lot after a partial close", () => {
    const trips = buildRoundTrips([
      fill({ id: "b", side: "buy", qty: 10, price: 50, t: 1 }),
      fill({ id: "s", side: "sell", qty: 4, price: 60, t: 2 }),
    ]);
    assert.equal(trips.length, 1);
    assert.equal(trips[0]?.qty, 4);
    assert.equal(trips[0]?.realizedPl, 40);
    const rest = buildRoundTrips([
      fill({ id: "b", side: "buy", qty: 10, price: 50, t: 1 }),
      fill({ id: "s", side: "sell", qty: 4, price: 60, t: 2 }),
      fill({ id: "s2", side: "sell", qty: 6, price: 40, t: 3 }),
    ]);
    assert.equal(rest.length, 2);
    assert.equal(rest[0]?.exitPrice, 40);
    assert.equal(rest[0]?.realizedPl, (40 - 50) * 6);
  });

  it("sorts newest exit first", () => {
    const trips = buildRoundTrips([
      fill({ id: "b1", symbol: "AAA", side: "buy", qty: 1, price: 10, t: 1 }),
      fill({ id: "s1", symbol: "AAA", side: "sell", qty: 1, price: 11, t: 2 }),
      fill({ id: "b2", symbol: "BBB", side: "buy", qty: 1, price: 10, t: 3 }),
      fill({ id: "s2", symbol: "BBB", side: "sell", qty: 1, price: 9, t: 8 }),
    ]);
    assert.equal(trips[0]?.symbol, "BBB");
    assert.equal(trips[1]?.symbol, "AAA");
  });

  it("reads filled orders and ignores working ones", () => {
    const fills = fillsFromOrders([
      order({ id: "a", side: "buy", qty: 2, filledAvgPrice: 10, filledAt: 5 }),
      order({ id: "b", side: "sell", qty: 2, status: "accepted", filledQty: 0 }),
    ]);
    assert.equal(fills.length, 1);
    assert.equal(fills[0]?.price, 10);
    assert.equal(fills[0]?.t, 5);
  });

  it("clips to exits inside the curve window", () => {
    const now = Date.parse("2026-09-24T18:00:00.000Z");
    const trips = buildRoundTrips([
      fill({ id: "b", side: "buy", qty: 1, price: 10, t: Date.parse("2026-06-01T00:00:00.000Z") }),
      fill({ id: "s", side: "sell", qty: 1, price: 12, t: Date.parse("2026-06-10T00:00:00.000Z") }),
      fill({ id: "b2", side: "buy", qty: 1, price: 10, t: Date.parse("2026-09-01T00:00:00.000Z") }),
      fill({ id: "s2", side: "sell", qty: 1, price: 11, t: Date.parse("2026-09-20T00:00:00.000Z") }),
    ]);
    const month = clipJournal(trips, "1M", now);
    assert.equal(month.length, 1);
    assert.equal(month[0]?.exitPrice, 11);
    assert.equal(clipJournal(trips, "3M", now).length, 2);
  });

  it("caps newest rows", () => {
    const trips = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      symbol: "X",
      side: "long" as const,
      qty: 1,
      entryAt: i,
      entryPrice: 1,
      exitAt: 10 - i,
      exitPrice: 2,
      holdMs: 1,
      realizedPl: 1,
      realizedPlPct: 100,
    }));
    assert.equal(capJournal(trips, 2).map((t) => t.id).join(","), "0,1");
  });

  it("attaches a thesis written before exit and dashes one written after", () => {
    const trip = buildRoundTrips([
      fill({ id: "b", side: "buy", qty: 1, price: 10, t: Date.parse("2026-09-01T00:00:00.000Z") }),
      fill({ id: "s", side: "sell", qty: 1, price: 11, t: Date.parse("2026-09-10T00:00:00.000Z") }),
    ])[0]!;
    const ok = attachJournalThesis([trip], {
      AAPL: thesis({ writtenAt: "2026-09-05T00:00:00.000Z" }),
    });
    assert.equal(ok[0]?.conviction, "high");
    assert.equal(ok[0]?.snippet, "add on AI spend");
    const late = attachJournalThesis([trip], {
      AAPL: thesis({ writtenAt: "2026-09-20T00:00:00.000Z" }),
    });
    assert.equal(late[0]?.snippet, null);
    assert.equal(late[0]?.conviction, null);
  });

  it("snips a one-line thesis and formats hold time", () => {
    assert.equal(thesisSnippet("first\nsecond"), "first");
    assert.equal(formatHold(3 * 86_400_000), "3d");
    assert.equal(formatHold(2 * 3_600_000), "2h");
  });
});

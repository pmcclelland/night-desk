import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeNews, newsTickers, parseYahooNewsItem } from "./news.ts";

describe("news", () => {
  it("parses a Yahoo search news row", () => {
    const item = parseYahooNewsItem(
      {
        uuid: "abc",
        title: "Apple reports",
        publisher: "Reuters",
        link: "https://finance.yahoo.com/news/apple",
        providerPublishTime: 1_700_000_000,
        relatedTickers: ["aapl", "MSFT"],
      },
      "NVDA",
    );
    assert.ok(item);
    assert.equal(item.id, "abc");
    assert.equal(item.publisher, "Reuters");
    assert.equal(item.publishedAt, 1_700_000_000_000);
    assert.deepEqual(item.tickers, ["AAPL", "MSFT"]);
  });

  it("dedupes and prefers held names when choosing tickers", () => {
    const tickers = newsTickers(["AAPL", "MSFT"], ["SPY", "AAPL", "NVDA"], 3);
    assert.deepEqual(tickers, ["AAPL", "MSFT", "SPY"]);
    const merged = mergeNews(
      [
        {
          id: "1",
          title: "older",
          publisher: null,
          url: "https://a.example/1",
          publishedAt: 1,
          tickers: ["AAPL"],
        },
        {
          id: "1",
          title: "dup",
          publisher: null,
          url: "https://a.example/1",
          publishedAt: 9,
          tickers: ["AAPL"],
        },
        {
          id: "2",
          title: "newer",
          publisher: null,
          url: "https://a.example/2",
          publishedAt: 5,
          tickers: ["MSFT"],
        },
      ],
      10,
    );
    assert.deepEqual(
      merged.map((r) => r.id),
      ["1", "2"],
    );
    assert.equal(merged[0]?.title, "dup");
  });
});

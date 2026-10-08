import { createServerFn } from "@tanstack/react-start";
import { mergeNews, newsTickers, parseYahooNewsItem, type NewsItem } from "@/lib/news";

const UA = "Mozilla/5.0 (compatible; NightDesk/1.0; +https://x.ai)";
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { exp: number; items: NewsItem[] }>();

async function getJson(url: string, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(t);
  }
}

async function yahooNewsForTicker(ticker: string): Promise<NewsItem[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=0&newsCount=6&newsQueryId=news_cie_vespa`;
  try {
    const body = (await getJson(url)) as { news?: unknown[] };
    return (body.news ?? [])
      .map((row) => parseYahooNewsItem(row, ticker))
      .filter((row): row is NewsItem => row !== null);
  } catch {
    return [];
  }
}

export async function loadTickerNews(held: string[], watched: string[]): Promise<NewsItem[]> {
  const tickers = newsTickers(held, watched);
  if (tickers.length === 0) return [];
  const key = tickers.join(",");
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.items;

  const batches = await Promise.all(tickers.map((ticker) => yahooNewsForTicker(ticker)));
  const items = mergeNews(batches.flat());
  cache.set(key, { exp: Date.now() + CACHE_MS, items });
  return items;
}

export const fetchTickerNews = createServerFn({ method: "POST" })
  .validator((input: { held: string[]; watched: string[] }) => input)
  .handler(async ({ data }) => {
    try {
      const items = await loadTickerNews(data.held, data.watched);
      return { ok: true as const, items };
    } catch {
      return { ok: false as const, items: [] as NewsItem[] };
    }
  });

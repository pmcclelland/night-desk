export type NewsItem = {
  id: string;
  title: string;
  publisher: string | null;
  url: string;
  publishedAt: number;
  tickers: string[];
};

export type NewsSnapshot =
  | { status: "loading" }
  | { status: "empty"; items: [] }
  | { status: "ok"; items: NewsItem[] }
  | { status: "error"; items: []; message: string };

export const NEWS_EMPTY = "No recent headlines for these names.";
export const NEWS_ERROR = "Couldn't load headlines right now.";
export const NEWS_TICKER_CAP = 8;
export const NEWS_ITEM_CAP = 16;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asUnixMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n > 1e12 ? n : n * 1000;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseYahooNewsItem(row: unknown, fallbackTicker?: string): NewsItem | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const title = asString(r.title);
  const url = asString(r.link) ?? asString(r.url);
  const id = asString(r.uuid) ?? url;
  if (!title || !url || !id) return null;
  const publisher =
    asString(r.publisher) ??
    (r.publisher && typeof r.publisher === "object"
      ? asString((r.publisher as Record<string, unknown>).displayName)
      : null);
  const publishedAt = asUnixMs(r.providerPublishTime) ?? asUnixMs(r.publishedAt) ?? 0;
  const related = Array.isArray(r.relatedTickers)
    ? r.relatedTickers.map((t) => asString(t)?.toUpperCase()).filter((t): t is string => Boolean(t))
    : [];
  const tickers = related.length ? related : fallbackTicker ? [fallbackTicker] : [];
  return { id, title, publisher, url, publishedAt, tickers };
}

export function mergeNews(items: NewsItem[], cap = NEWS_ITEM_CAP): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  const sorted = [...items].sort((a, b) => b.publishedAt - a.publishedAt || a.id.localeCompare(b.id));
  for (const item of sorted) {
    const key = item.id || item.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}

export function newsTickers(held: string[], watched: string[], cap = NEWS_TICKER_CAP): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...held, ...watched]) {
    const s = raw.trim().toUpperCase();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

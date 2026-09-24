import {
  clipCatalysts,
  etDateKeysInWindow,
  etDayFromKey,
  formatDivDetail,
  formatEarnWhen,
  heldCatalysts,
  mergeCatalysts,
  type CatalystRow,
} from "@/lib/book-catalysts";
import type { Creds } from "@/lib/types";

const UA = "Mozilla/5.0 (compatible; NightDesk/1.0; +https://x.ai)";
const CACHE_MS = 60 * 60 * 1000;
const cache = new Map<string, { exp: number; rows: CatalystRow[] }>();

type NasdaqRow = {
  symbol?: string;
  time?: string;
};

function nasdaqTime(raw: string | undefined) {
  return formatEarnWhen(raw);
}

async function getJson(url: string, headers: Record<string, string>, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchNasdaqEarnings(symbols: string[], now = Date.now()): Promise<CatalystRow[]> {
  const held = new Set(symbols.map((s) => s.toUpperCase()));
  if (held.size === 0) return [];
  const out: CatalystRow[] = [];
  const keys = etDateKeysInWindow(now);
  await Promise.all(
    keys.map(async (key) => {
      try {
        const body = (await getJson(`https://api.nasdaq.com/api/calendar/earnings?date=${key}`, {
          "User-Agent": UA,
          Origin: "https://www.nasdaq.com",
          Referer: "https://www.nasdaq.com/",
        })) as { data?: { rows?: NasdaqRow[] } | null };
        for (const row of body.data?.rows ?? []) {
          const symbol = row.symbol?.toUpperCase();
          if (!symbol || !held.has(symbol)) continue;
          const at = etDayFromKey(key);
          if (!Number.isFinite(at)) continue;
          out.push({
            id: `earn:${symbol}:${key}`,
            symbol,
            kind: "earn",
            at,
            detail: nasdaqTime(row.time),
          });
        }
      } catch {
        /* skip that day */
      }
    }),
  );
  return out;
}

type AlpacaDiv = {
  symbol?: string;
  source_symbol?: string;
  ex_date?: string;
  rate?: string | number;
};

export async function fetchAlpacaExDiv(
  creds: Creds,
  symbols: string[],
  now = Date.now(),
): Promise<CatalystRow[]> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter(Boolean);
  if (unique.length === 0) return [];
  const keys = etDateKeysInWindow(now);
  const start = keys[0];
  const end = keys.at(-1);
  if (!start || !end) return [];
  try {
    const params = new URLSearchParams({
      symbols: unique.join(","),
      types: "cash_dividend",
      start,
      end,
      limit: "1000",
    });
    const body = (await getJson(`https://data.alpaca.markets/v1/corporate-actions?${params}`, {
      "APCA-API-KEY-ID": creds.keyId,
      "APCA-API-SECRET-KEY": creds.secret,
    })) as {
      corporate_actions?: { cash_dividends?: AlpacaDiv[] };
      cash_dividends?: AlpacaDiv[];
    };
    const rows = body.corporate_actions?.cash_dividends ?? body.cash_dividends ?? [];
    const out: CatalystRow[] = [];
    for (const row of rows) {
      const symbol = (row.symbol || row.source_symbol || "").toUpperCase();
      const at = row.ex_date ? etDayFromKey(row.ex_date) : Number.NaN;
      const rate = Number(row.rate);
      if (!symbol || !Number.isFinite(at)) continue;
      out.push({
        id: `exdiv:${symbol}:${row.ex_date}`,
        symbol,
        kind: "exdiv",
        at,
        detail: formatDivDetail(rate),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadOwnerCatalysts(input: {
  symbols: string[];
  creds: Creds | null;
  useAlpaca: boolean;
  now?: number;
}): Promise<CatalystRow[]> {
  const now = input.now ?? Date.now();
  const symbols = [...new Set(input.symbols.map((s) => s.toUpperCase()))].filter(Boolean).slice(0, 40);
  const key = `${input.useAlpaca ? "a" : "y"}:${symbols.join(",")}`;
  const hit = cache.get(key);
  if (hit && hit.exp > now) return hit.rows;
  const [earn, divs] = await Promise.all([
    fetchNasdaqEarnings(symbols, now),
    input.useAlpaca && input.creds
      ? fetchAlpacaExDiv(input.creds, symbols, now)
      : Promise.resolve([] as CatalystRow[]),
  ]);
  const rows = heldCatalysts(clipCatalysts(mergeCatalysts([...earn, ...divs]), now), symbols);
  cache.set(key, { exp: now + CACHE_MS, rows });
  return rows;
}

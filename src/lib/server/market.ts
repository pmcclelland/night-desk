import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { loadDesk } from "@/lib/server/desk-store";
import { nameOf, SEED } from "@/lib/universe";
import type { Bar, BarRange, BarSource, Creds, Quote, TapeSource, Venue } from "@/lib/types";

const UA = "Mozilla/5.0 (compatible; NightDesk/1.0; +https://x.ai)";

const RANGE: Record<BarRange, { range: string; interval: string; alpaca: string }> = {
  "1D": { range: "1d", interval: "5m", alpaca: "5Min" },
  "5D": { range: "5d", interval: "15m", alpaca: "15Min" },
  "1M": { range: "1mo", interval: "1d", alpaca: "1Day" },
  "6M": { range: "6mo", interval: "1d", alpaca: "1Day" },
  "1Y": { range: "1y", interval: "1d", alpaca: "1Day" },
};

async function getJson(url: string, headers: Record<string, string>, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(t);
  }
}

function seedQuote(symbol: string, now: number): Quote {
  const s = SEED[symbol] ?? { last: 100, prev: 99, high: 101, low: 98, volume: 1_000_000 };
  const jitter = 1 + Math.sin(now / 15000 + symbol.length) * 0.0008;
  const last = s.last * jitter;
  const spread = Math.max(0.01, last * 0.00025);
  return {
    symbol,
    name: nameOf(symbol),
    last,
    prevClose: s.prev,
    change: last - s.prev,
    changePct: ((last - s.prev) / s.prev) * 100,
    high: Math.max(s.high, last),
    low: Math.min(s.low, last),
    open: s.prev,
    volume: s.volume,
    bid: last - spread / 2,
    ask: last + spread / 2,
    ts: now,
  };
}

interface SparkMeta {
  symbol?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketOpen?: number;
  shortName?: string;
  longName?: string;
}

interface SparkResult {
  symbol: string;
  response: Array<{
    meta: SparkMeta;
    timestamp?: number[];
    indicators?: { quote?: Array<{ close?: Array<number | null> }> };
  }>;
}

function quoteFromSpark(symbol: string, meta: SparkMeta, now: number): Quote {
  const last = Number(meta.regularMarketPrice);
  const prev = Number(meta.previousClose ?? meta.chartPreviousClose ?? last);
  const high = Number(meta.regularMarketDayHigh ?? last);
  const low = Number(meta.regularMarketDayLow ?? last);
  const open = Number(meta.regularMarketOpen ?? prev);
  const volume = Number(meta.regularMarketVolume ?? 0);
  const spread = Math.max(0.01, last * 0.00025);
  return {
    symbol,
    name: nameOf(symbol) || meta.shortName || meta.longName || symbol,
    last,
    prevClose: prev,
    change: last - prev,
    changePct: prev ? ((last - prev) / prev) * 100 : 0,
    high,
    low,
    open,
    volume,
    bid: last - spread / 2,
    ask: last + spread / 2,
    ts: now,
  };
}

async function yahooQuotes(
  symbols: string[],
  now: number,
): Promise<{ quotes: Record<string, Quote>; hit: number }> {
  const out: Record<string, Quote> = {};
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));
  await Promise.all(
    chunks.map(async (chunk) => {
      const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${chunk.join(",")}&range=1d&interval=5m`;
      try {
        const body = (await getJson(url, { "User-Agent": UA })) as {
          spark?: { result?: SparkResult[] };
        };
        for (const r of body.spark?.result ?? []) {
          const meta = r.response?.[0]?.meta;
          if (!meta || !Number.isFinite(Number(meta.regularMarketPrice))) continue;
          out[r.symbol] = quoteFromSpark(r.symbol, meta, now);
        }
      } catch {
        /* fall through to seed */
      }
    }),
  );
  const hit = Object.keys(out).length;
  for (const s of unique) {
    if (!out[s]) out[s] = seedQuote(s, now);
  }
  return { quotes: out, hit };
}

type Snap = {
  latestTrade?: { p?: number; t?: string };
  latestQuote?: { bp?: number; ap?: number };
  dailyBar?: { o?: number; h?: number; l?: number; v?: number; c?: number };
  prevDailyBar?: { c?: number };
};

function usableCreds(creds?: Creds | null): Creds | null {
  if (creds?.keyId && creds.secret) return creds;
  return null;
}

async function credsForUser(userId: string, fallback?: Creds | null): Promise<{
  venue?: Venue;
  creds: Creds | null;
}> {
  try {
    const desk = await loadDesk(userId);
    return { venue: desk.venue, creds: usableCreds(desk.creds) ?? usableCreds(fallback) };
  } catch {
    return { creds: usableCreds(fallback) };
  }
}

function alpacaHeaders(creds: Creds) {
  return {
    "APCA-API-KEY-ID": creds.keyId,
    "APCA-API-SECRET-KEY": creds.secret,
  };
}

async function alpacaQuotes(symbols: string[], creds: Creds, now: number): Promise<Record<string, Quote> | null> {
  try {
    const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(","))}&feed=iex`;
    const body = (await getJson(url, alpacaHeaders(creds))) as unknown;

    let rows: Record<string, Snap> = {};
    if (body && typeof body === "object") {
      const rec = body as Record<string, unknown>;
      if (rec.snapshots && typeof rec.snapshots === "object") {
        rows = rec.snapshots as Record<string, Snap>;
      } else {
        rows = rec as Record<string, Snap>;
      }
    }
    const out: Record<string, Quote> = {};
    for (const [symbol, snap] of Object.entries(rows)) {
      if (!snap || typeof snap !== "object") continue;
      const last = Number(snap.latestTrade?.p ?? snap.dailyBar?.c);
      if (!Number.isFinite(last)) continue;
      const prev = Number(snap.prevDailyBar?.c ?? last);
      const bid = Number(snap.latestQuote?.bp ?? last);
      const ask = Number(snap.latestQuote?.ap ?? last);
      out[symbol] = {
        symbol,
        name: nameOf(symbol),
        last,
        prevClose: prev,
        change: last - prev,
        changePct: prev ? ((last - prev) / prev) * 100 : 0,
        high: Number(snap.dailyBar?.h ?? last),
        low: Number(snap.dailyBar?.l ?? last),
        open: Number(snap.dailyBar?.o ?? prev),
        volume: Number(snap.dailyBar?.v ?? 0),
        bid: Number.isFinite(bid) ? bid : last,
        ask: Number.isFinite(ask) ? ask : last,
        ts: now,
      };
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export async function loadQuotes(data: {
  symbols: string[];
  venue: Venue;
  creds?: Creds | null;
}): Promise<{ quotes: Record<string, Quote>; source: TapeSource }> {
  const now = Date.now();
  const symbols = data.symbols.map((s) => s.toUpperCase()).filter(Boolean);
  if (symbols.length === 0) return { quotes: {}, source: "seed" };
  const creds = usableCreds(data.creds);
  if ((data.venue === "alpaca-paper" || data.venue === "alpaca-live") && creds) {
    const live = await alpacaQuotes(symbols, creds, now);
    if (live) {
      const missing = symbols.filter((s) => !live[s]);
      if (missing.length) {
        const y = await yahooQuotes(missing, now);
        return { quotes: { ...y.quotes, ...live }, source: "mixed" };
      }
      return { quotes: live, source: "alpaca" };
    }
  }
  const y = await yahooQuotes(symbols, now);
  return { quotes: y.quotes, source: y.hit ? "yahoo" : "seed" };
}

export const fetchQuotes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { symbols: string[]; venue: Venue; creds?: Creds | null }) => input)
  .handler(async ({ context, data }) => {
    const resolved = await credsForUser(context.userId, data.creds);
    return loadQuotes({
      symbols: data.symbols,
      venue: resolved.venue ?? data.venue,
      creds: resolved.creds,
    });
  });

interface YahooChart {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

function barsFromYahoo(body: YahooChart): Bar[] {
  const r = body.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0];
  const bars: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q?.open?.[i];
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (![o, h, l, c].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    bars.push({
      t: (ts[i] ?? 0) * 1000,
      o: o as number,
      h: h as number,
      l: l as number,
      c: c as number,
      v: typeof v === "number" ? v : 0,
    });
  }
  return bars;
}

function syntheticBars(symbol: string, range: BarRange, now: number): Bar[] {
  const seed = SEED[symbol]?.last ?? 100;
  const n = range === "1D" ? 78 : range === "5D" ? 130 : range === "1M" ? 22 : range === "6M" ? 130 : 252;
  const step = range === "1D" ? 5 * 60_000 : range === "5D" ? 15 * 60_000 : 24 * 60 * 60_000;
  const bars: Bar[] = [];
  let px = seed * 0.97;
  for (let i = 0; i < n; i++) {
    const drift = (seed - px) * 0.04;
    const shock = Math.sin(i * 0.45 + symbol.length) * seed * 0.004;
    const o = px;
    const c = px + drift + shock;
    const h = Math.max(o, c) + seed * 0.002;
    const l = Math.min(o, c) - seed * 0.002;
    bars.push({ t: now - (n - i) * step, o, h, l, c, v: 1_000_000 + i * 1200 });
    px = c;
  }
  return bars;
}

async function yahooBars(symbol: string, range: BarRange): Promise<Bar[]> {
  const spec = RANGE[range];
  const pre = range === "1D" ? "&includePrePost=true" : "";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${spec.interval}&range=${spec.range}${pre}`;
  const body = (await getJson(url, { "User-Agent": UA })) as YahooChart;
  return barsFromYahoo(body);
}

async function alpacaBars(symbol: string, range: BarRange, creds: Creds): Promise<Bar[] | null> {
  try {
    const spec = RANGE[range];
    const limit = range === "1D" ? 200 : range === "5D" ? 200 : 300;
    const url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${spec.alpaca}&limit=${limit}&adjustment=split&feed=iex`;
    const body = (await getJson(url, alpacaHeaders(creds))) as {
      bars?: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>;
    };
    const bars = (body.bars ?? []).map((b) => ({
      t: Date.parse(b.t),
      o: b.o,
      h: b.h,
      l: b.l,
      c: b.c,
      v: b.v,
    }));
    return bars.length ? bars : null;
  } catch {
    return null;
  }
}

export async function loadBars(data: {
  symbol: string;
  range: BarRange;
  venue: Venue;
  creds?: Creds | null;
}): Promise<{ bars: Bar[]; source: BarSource }> {
  const symbol = data.symbol.toUpperCase();
  if ((data.venue === "alpaca-paper" || data.venue === "alpaca-live") && usableCreds(data.creds)) {
    const live = await alpacaBars(symbol, data.range, usableCreds(data.creds)!);
    if (live) return { bars: live, source: "alpaca" };
  }
  try {
    const bars = await yahooBars(symbol, data.range);
    if (bars.length) return { bars, source: "yahoo" };
  } catch {
    /* seed */
  }
  return { bars: syntheticBars(symbol, data.range, Date.now()), source: "seed" };
}

export const fetchBars = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { symbol: string; range: BarRange; venue: Venue; creds?: Creds | null }) => input)
  .handler(async ({ context, data }) => {
    const resolved = await credsForUser(context.userId, data.creds);
    return loadBars({
      symbol: data.symbol,
      range: data.range,
      venue: resolved.venue ?? data.venue,
      creds: resolved.creds,
    });
  });

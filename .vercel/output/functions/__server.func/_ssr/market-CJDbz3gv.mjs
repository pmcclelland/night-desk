import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { a as nameOf, n as SEED } from "./universe--yuFOVKq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/market-CJDbz3gv.js
var UA = "Mozilla/5.0 (compatible; NightDesk/1.0; +https://x.ai)";
var RANGE = {
	"1D": {
		range: "1d",
		interval: "5m",
		alpaca: "5Min"
	},
	"5D": {
		range: "5d",
		interval: "15m",
		alpaca: "15Min"
	},
	"1M": {
		range: "1mo",
		interval: "1d",
		alpaca: "1Day"
	},
	"6M": {
		range: "6mo",
		interval: "1d",
		alpaca: "1Day"
	},
	"1Y": {
		range: "1y",
		interval: "1d",
		alpaca: "1Day"
	}
};
async function getJson(url, headers, ms = 8e3) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		const res = await fetch(url, {
			headers: {
				Accept: "application/json",
				...headers
			},
			signal: ctrl.signal
		});
		const text = await res.text();
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return JSON.parse(text);
	} finally {
		clearTimeout(t);
	}
}
function seedQuote(symbol, now) {
	const s = SEED[symbol] ?? {
		last: 100,
		prev: 99,
		high: 101,
		low: 98,
		volume: 1e6
	};
	const jitter = 1 + Math.sin(now / 15e3 + symbol.length) * 8e-4;
	const last = s.last * jitter;
	const spread = Math.max(.01, last * 25e-5);
	return {
		symbol,
		name: nameOf(symbol),
		last,
		prevClose: s.prev,
		change: last - s.prev,
		changePct: (last - s.prev) / s.prev * 100,
		high: Math.max(s.high, last),
		low: Math.min(s.low, last),
		open: s.prev,
		volume: s.volume,
		bid: last - spread / 2,
		ask: last + spread / 2,
		ts: now
	};
}
function quoteFromSpark(symbol, meta, now) {
	const last = Number(meta.regularMarketPrice);
	const prev = Number(meta.previousClose ?? meta.chartPreviousClose ?? last);
	const high = Number(meta.regularMarketDayHigh ?? last);
	const low = Number(meta.regularMarketDayLow ?? last);
	const open = Number(meta.regularMarketOpen ?? prev);
	const volume = Number(meta.regularMarketVolume ?? 0);
	const spread = Math.max(.01, last * 25e-5);
	return {
		symbol,
		name: nameOf(symbol) || meta.shortName || meta.longName || symbol,
		last,
		prevClose: prev,
		change: last - prev,
		changePct: prev ? (last - prev) / prev * 100 : 0,
		high,
		low,
		open,
		volume,
		bid: last - spread / 2,
		ask: last + spread / 2,
		ts: now
	};
}
async function yahooQuotes(symbols, now) {
	const out = {};
	const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter(Boolean);
	const chunks = [];
	for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));
	await Promise.all(chunks.map(async (chunk) => {
		const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${chunk.join(",")}&range=1d&interval=5m`;
		try {
			const body = await getJson(url, { "User-Agent": UA });
			for (const r of body.spark?.result ?? []) {
				const meta = r.response?.[0]?.meta;
				if (!meta || !Number.isFinite(Number(meta.regularMarketPrice))) continue;
				out[r.symbol] = quoteFromSpark(r.symbol, meta, now);
			}
		} catch {}
	}));
	const hit = Object.keys(out).length;
	for (const s of unique) if (!out[s]) out[s] = seedQuote(s, now);
	return {
		quotes: out,
		hit
	};
}
function alpacaHeaders(creds) {
	return {
		"APCA-API-KEY-ID": creds.keyId,
		"APCA-API-SECRET-KEY": creds.secret
	};
}
async function alpacaQuotes(symbols, creds, now) {
	try {
		const body = await getJson(`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(","))}&feed=iex`, alpacaHeaders(creds));
		let rows = {};
		if (body && typeof body === "object") {
			const rec = body;
			if (rec.snapshots && typeof rec.snapshots === "object") rows = rec.snapshots;
			else rows = rec;
		}
		const out = {};
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
				changePct: prev ? (last - prev) / prev * 100 : 0,
				high: Number(snap.dailyBar?.h ?? last),
				low: Number(snap.dailyBar?.l ?? last),
				open: Number(snap.dailyBar?.o ?? prev),
				volume: Number(snap.dailyBar?.v ?? 0),
				bid: Number.isFinite(bid) ? bid : last,
				ask: Number.isFinite(ask) ? ask : last,
				ts: now
			};
		}
		return Object.keys(out).length ? out : null;
	} catch {
		return null;
	}
}
var fetchQuotes_createServerFn_handler = createServerRpc({
	id: "5e0c367001645e2ea4b82ce038a0bf45f05667fa2033ee44a2ee59dd7ef4f3ae",
	name: "fetchQuotes",
	filename: "src/lib/server/market.ts"
}, (opts) => fetchQuotes.__executeServer(opts));
var fetchQuotes = createServerFn({ method: "POST" }).validator((input) => input).handler(fetchQuotes_createServerFn_handler, async ({ data }) => {
	const now = Date.now();
	const symbols = data.symbols.map((s) => s.toUpperCase()).filter(Boolean);
	if (symbols.length === 0) return {
		quotes: {},
		source: "seed"
	};
	if ((data.venue === "alpaca-paper" || data.venue === "alpaca-live") && data.creds) {
		const live = await alpacaQuotes(symbols, data.creds, now);
		if (live) {
			const missing = symbols.filter((s) => !live[s]);
			if (missing.length) return {
				quotes: {
					...(await yahooQuotes(missing, now)).quotes,
					...live
				},
				source: "mixed"
			};
			return {
				quotes: live,
				source: "alpaca"
			};
		}
	}
	const y = await yahooQuotes(symbols, now);
	return {
		quotes: y.quotes,
		source: y.hit ? "yahoo" : "seed"
	};
});
function barsFromYahoo(body) {
	const r = body.chart?.result?.[0];
	const ts = r?.timestamp ?? [];
	const q = r?.indicators?.quote?.[0];
	const bars = [];
	for (let i = 0; i < ts.length; i++) {
		const o = q?.open?.[i];
		const h = q?.high?.[i];
		const l = q?.low?.[i];
		const c = q?.close?.[i];
		const v = q?.volume?.[i];
		if (![
			o,
			h,
			l,
			c
		].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
		bars.push({
			t: (ts[i] ?? 0) * 1e3,
			o,
			h,
			l,
			c,
			v: typeof v === "number" ? v : 0
		});
	}
	return bars;
}
function syntheticBars(symbol, range, now) {
	const seed = SEED[symbol]?.last ?? 100;
	const n = range === "1D" ? 78 : range === "5D" ? 130 : range === "1M" ? 22 : range === "6M" ? 130 : 252;
	const step = range === "1D" ? 3e5 : range === "5D" ? 9e5 : 864e5;
	const bars = [];
	let px = seed * .97;
	for (let i = 0; i < n; i++) {
		const drift = (seed - px) * .04;
		const shock = Math.sin(i * .45 + symbol.length) * seed * .004;
		const o = px;
		const c = px + drift + shock;
		const h = Math.max(o, c) + seed * .002;
		const l = Math.min(o, c) - seed * .002;
		bars.push({
			t: now - (n - i) * step,
			o,
			h,
			l,
			c,
			v: 1e6 + i * 1200
		});
		px = c;
	}
	return bars;
}
async function yahooBars(symbol, range) {
	const spec = RANGE[range];
	const pre = range === "1D" ? "&includePrePost=true" : "";
	return barsFromYahoo(await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${spec.interval}&range=${spec.range}${pre}`, { "User-Agent": UA }));
}
async function alpacaBars(symbol, range, creds) {
	try {
		const spec = RANGE[range];
		const limit = range === "1D" ? 200 : range === "5D" ? 200 : 300;
		const bars = ((await getJson(`https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?timeframe=${spec.alpaca}&limit=${limit}&adjustment=split&feed=iex`, alpacaHeaders(creds))).bars ?? []).map((b) => ({
			t: Date.parse(b.t),
			o: b.o,
			h: b.h,
			l: b.l,
			c: b.c,
			v: b.v
		}));
		return bars.length ? bars : null;
	} catch {
		return null;
	}
}
var fetchBars_createServerFn_handler = createServerRpc({
	id: "3aee79f4a822642bd4190df7cd1d921afbf0038e852123b6339df50a26dc44d3",
	name: "fetchBars",
	filename: "src/lib/server/market.ts"
}, (opts) => fetchBars.__executeServer(opts));
var fetchBars = createServerFn({ method: "POST" }).validator((input) => input).handler(fetchBars_createServerFn_handler, async ({ data }) => {
	const symbol = data.symbol.toUpperCase();
	if ((data.venue === "alpaca-paper" || data.venue === "alpaca-live") && data.creds) {
		const live = await alpacaBars(symbol, data.range, data.creds);
		if (live) return {
			bars: live,
			source: "alpaca"
		};
	}
	try {
		const bars = await yahooBars(symbol, data.range);
		if (bars.length) return {
			bars,
			source: "yahoo"
		};
	} catch {}
	return {
		bars: syntheticBars(symbol, data.range, Date.now()),
		source: "seed"
	};
});
//#endregion
export { fetchBars_createServerFn_handler, fetchQuotes_createServerFn_handler };

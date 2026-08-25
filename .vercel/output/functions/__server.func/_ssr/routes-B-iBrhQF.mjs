import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogOverlay, c as Slot, i as DialogDescription$1, n as DialogClose, o as DialogPortal, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as nameOf, i as STARTING_CASH, n as SEED, o as normalizeSymbol, r as STARTER_LOTS, t as DEFAULT_WATCHLIST } from "./universe--yuFOVKq.mjs";
import { a as Power, c as Expand, i as Settings, o as Minimize2, r as Shrink, s as Maximize2, t as X } from "../_libs/lucide-react.mjs";
import { i as qt, n as an, r as nn, t as Qt } from "../_libs/react-resizable-panels.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B-iBrhQF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var usd = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
var usdCompact = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});
new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 4
});
function money(n, compact = false) {
	if (!Number.isFinite(n)) return "—";
	return compact && Math.abs(n) >= 1e4 ? usdCompact.format(n) : usd.format(n);
}
function px(n) {
	if (!Number.isFinite(n)) return "—";
	if (n >= 1e3) return n.toFixed(2);
	if (n >= 100) return n.toFixed(2);
	if (n >= 1) return n.toFixed(2);
	return n.toFixed(4);
}
function qty(n) {
	if (!Number.isFinite(n)) return "—";
	if (Number.isInteger(n)) return n.toLocaleString("en-US");
	return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
function pct(n, signed = true) {
	if (!Number.isFinite(n)) return "—";
	return `${n >= 0 && signed ? "+" : ""}${n.toFixed(2)}%`;
}
function signedMoney(n) {
	if (!Number.isFinite(n)) return "—";
	const core = usd.format(Math.abs(n));
	if (n > 0) return `+${core}`;
	if (n < 0) return `-${core}`;
	return core;
}
function vol(n) {
	if (!Number.isFinite(n)) return "—";
	if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
	return String(Math.round(n));
}
function clockTime(ts = Date.now()) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	}).format(new Date(ts));
}
function clockDate(ts = Date.now()) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		weekday: "short",
		month: "short",
		day: "2-digit"
	}).format(new Date(ts));
}
function barTime(ts, intraday) {
	const d = new Date(ts);
	if (intraday) return new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).format(d);
	return new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		month: "short",
		day: "numeric"
	}).format(d);
}
function signClass(n) {
	if (n > 1e-7) return "text-up";
	if (n < -1e-7) return "text-down";
	return "text-muted";
}
function nyParts(date) {
	const fmt = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	});
	const map = {};
	for (const p of fmt.formatToParts(date)) if (p.type !== "literal") map[p.type] = p.value;
	return {
		minutes: Number(map.hour) * 60 + Number(map.minute) + Number(map.second) / 60,
		weekend: map.weekday === "Sat" || map.weekday === "Sun",
		weekday: map.weekday ?? ""
	};
}
var PRE = 240;
var OPEN = 570;
var CLOSE = 960;
var POST = 1200;
function sessionAt(minutes, weekend) {
	if (weekend) return "closed";
	if (minutes >= OPEN && minutes < CLOSE) return "open";
	if (minutes >= PRE && minutes < OPEN) return "pre";
	if (minutes >= CLOSE && minutes < POST) return "post";
	return "closed";
}
function minutesToNext(minutes, weekend) {
	if (weekend) return (nyParts(/* @__PURE__ */ new Date()).weekday === "Sat" ? 2 : 1) * 24 * 60 - minutes + OPEN;
	if (minutes < PRE) return PRE - minutes;
	if (minutes < OPEN) return OPEN - minutes;
	if (minutes < CLOSE) return CLOSE - minutes;
	if (minutes < POST) return POST - minutes;
	return 1440 - minutes + PRE;
}
function formatCountdown(totalMin) {
	const m = Math.max(0, Math.round(totalMin));
	const h = Math.floor(m / 60);
	const mm = m % 60;
	if (h <= 0) return `${mm}m`;
	return `${h}h ${mm.toString().padStart(2, "0")}m`;
}
var LABELS = {
	pre: "PRE-MARKET",
	open: "MARKET OPEN",
	post: "AFTER HOURS",
	closed: "CLOSED"
};
function getMarketClock(now = Date.now()) {
	const parts = nyParts(new Date(now));
	const session = sessionAt(parts.minutes, parts.weekend);
	const until = minutesToNext(parts.minutes, parts.weekend);
	const nextLabel = session === "pre" ? "open" : session === "open" ? "close" : session === "post" ? "bell" : "pre";
	return {
		session,
		timestamp: now,
		nextChange: now + until * 6e4,
		label: LABELS[session],
		countdown: `${formatCountdown(until)} to ${nextLabel}`
	};
}
function useIsDesktop() {
	const [desktop, setDesktop] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const apply = () => setDesktop(mq.matches);
		apply();
		mq.addEventListener("change", apply);
		return () => mq.removeEventListener("change", apply);
	}, []);
	return desktop;
}
function useNow(ms = 1e3) {
	const [now, setNow] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		setNow(Date.now());
		const id = window.setInterval(() => setNow(Date.now()), ms);
		return () => window.clearInterval(id);
	}, [ms]);
	return now;
}
function id(prefix) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function seedQuote(symbol, now = Date.now()) {
	const s = SEED[symbol] ?? {
		last: 100,
		prev: 100,
		high: 101,
		low: 99,
		volume: 1e6
	};
	const spread = Math.max(.01, s.last * 3e-4);
	return {
		symbol,
		name: nameOf(symbol),
		last: s.last,
		prevClose: s.prev,
		change: s.last - s.prev,
		changePct: (s.last - s.prev) / s.prev * 100,
		high: s.high,
		low: s.low,
		open: s.prev,
		volume: s.volume,
		bid: s.last - spread / 2,
		ask: s.last + spread / 2,
		ts: now
	};
}
function quoteMapFromSeed(symbols, now = Date.now()) {
	const map = {};
	for (const sym of symbols) map[sym] = seedQuote(sym, now);
	return map;
}
function markPositions(positions, quotes) {
	return positions.map((p) => {
		const q = quotes[p.symbol];
		const last = q?.last ?? p.last;
		const prev = q?.prevClose ?? last;
		const marketValue = p.qty * last;
		const costBasis = p.qty * p.avgPrice;
		const unrealizedPl = (last - p.avgPrice) * p.qty;
		const unrealizedPlPct = p.avgPrice !== 0 ? unrealizedPl / Math.abs(costBasis) * 100 : 0;
		const dayPl = (last - prev) * p.qty;
		return {
			...p,
			last,
			marketValue,
			costBasis,
			unrealizedPl,
			unrealizedPlPct,
			dayPl
		};
	});
}
function deriveAccount(book, quotes) {
	const positions = markPositions(book.positions, quotes);
	let longValue = 0;
	let shortValue = 0;
	let dayPl = book.realizedToday;
	for (const p of positions) {
		if (p.qty >= 0) longValue += p.marketValue;
		else shortValue += p.marketValue;
		dayPl += p.dayPl;
	}
	const equity = book.cash + longValue + shortValue;
	const lastEquity = equity - dayPl;
	return {
		cash: book.cash,
		equity,
		buyingPower: Math.max(0, book.cash),
		lastEquity,
		longValue,
		shortValue,
		dayPl,
		dayPlPct: lastEquity !== 0 ? dayPl / lastEquity * 100 : 0,
		realizedToday: book.realizedToday,
		status: "ACTIVE",
		patternDayTrader: false,
		daytradeCount: 0,
		tradingBlocked: false
	};
}
function createStarterBook(now = Date.now()) {
	const quotes = quoteMapFromSeed(STARTER_LOTS.map((l) => l.symbol), now);
	const positions = STARTER_LOTS.map((lot) => ({
		symbol: lot.symbol,
		qty: lot.qty,
		avgPrice: lot.avg,
		last: lot.avg,
		marketValue: lot.qty * lot.avg,
		costBasis: lot.qty * lot.avg,
		unrealizedPl: 0,
		unrealizedPlPct: 0,
		dayPl: 0
	}));
	const cost = STARTER_LOTS.reduce((s, l) => s + l.qty * l.avg, 0);
	const book = {
		cash: STARTING_CASH - cost,
		realizedToday: 0,
		positions,
		orders: [],
		equityHistory: []
	};
	book.equityHistory = [{
		t: now,
		v: deriveAccount(book, quotes).equity
	}];
	return book;
}
function lastOf(quotes, symbol) {
	return quotes[symbol]?.last;
}
function applyFill(book, order, px, now) {
	const qtySigned = order.side === "buy" ? order.qty : -order.qty;
	const notional = qtySigned * px;
	let cash = book.cash - notional;
	let realizedToday = book.realizedToday;
	const positions = book.positions.map((p) => ({ ...p }));
	const idx = positions.findIndex((p) => p.symbol === order.symbol);
	if (idx === -1) positions.push({
		symbol: order.symbol,
		qty: qtySigned,
		avgPrice: px,
		last: px,
		marketValue: qtySigned * px,
		costBasis: qtySigned * px,
		unrealizedPl: 0,
		unrealizedPlPct: 0,
		dayPl: 0
	});
	else {
		const pos = positions[idx];
		const newQty = pos.qty + qtySigned;
		if (pos.qty !== 0 && Math.sign(pos.qty) !== Math.sign(qtySigned) && newQty !== 0) {
			const closing = Math.min(Math.abs(qtySigned), Math.abs(pos.qty));
			realizedToday += (px - pos.avgPrice) * closing * Math.sign(pos.qty);
		} else if (newQty === 0) realizedToday += (px - pos.avgPrice) * pos.qty;
		if (newQty === 0) positions.splice(idx, 1);
		else if (Math.sign(newQty) !== Math.sign(pos.qty) && pos.qty !== 0) {
			pos.qty = newQty;
			pos.avgPrice = px;
		} else if (Math.sign(qtySigned) === Math.sign(pos.qty) || pos.qty === 0) {
			const absOld = Math.abs(pos.qty);
			const absAdd = Math.abs(qtySigned);
			pos.avgPrice = (pos.avgPrice * absOld + px * absAdd) / (absOld + absAdd);
			pos.qty = newQty;
		} else {
			pos.qty = newQty;
			pos.avgPrice = px;
		}
	}
	const filled = {
		...order,
		status: "filled",
		filledQty: order.qty,
		filledAt: now,
		filledAvgPrice: px
	};
	const orders = book.orders.map((o) => o.id === order.id ? filled : o);
	if (!orders.some((o) => o.id === order.id)) orders.unshift(filled);
	return {
		...book,
		cash,
		realizedToday,
		positions,
		orders
	};
}
function slip(side, last) {
	const bps = 2 + Math.random() * 3;
	return last * (1 + (side === "buy" ? 1 : -1) * bps * 1e-4);
}
function submitSimOrder(book, quotes, req, now = Date.now()) {
	const last = lastOf(quotes, req.symbol);
	if (!last || !Number.isFinite(last)) {
		const order = {
			id: id("ord"),
			clientOrderId: id("c"),
			symbol: req.symbol,
			side: req.side,
			type: req.type,
			qty: req.qty,
			filledQty: 0,
			limitPrice: req.limitPrice,
			stopPrice: req.stopPrice,
			tif: req.tif,
			status: "rejected",
			submittedAt: now,
			source: req.source,
			message: "No quote"
		};
		return {
			book: {
				...book,
				orders: [order, ...book.orders]
			},
			order,
			error: `No quote for ${req.symbol}`
		};
	}
	if (req.qty <= 0) {
		const order = {
			id: id("ord"),
			clientOrderId: id("c"),
			symbol: req.symbol,
			side: req.side,
			type: req.type,
			qty: req.qty,
			filledQty: 0,
			limitPrice: req.limitPrice,
			stopPrice: req.stopPrice,
			tif: req.tif,
			status: "rejected",
			submittedAt: now,
			source: req.source,
			message: "Invalid qty"
		};
		return {
			book: {
				...book,
				orders: [order, ...book.orders]
			},
			order,
			error: "Qty must be > 0"
		};
	}
	const order = {
		id: id("ord"),
		clientOrderId: id("c"),
		symbol: req.symbol,
		side: req.side,
		type: req.type,
		qty: req.qty,
		filledQty: 0,
		limitPrice: req.limitPrice,
		stopPrice: req.stopPrice,
		tif: req.tif,
		status: "new",
		submittedAt: now,
		source: req.source
	};
	if (req.type === "market" || req.type === "limit" && req.limitPrice !== void 0 && (req.side === "buy" && last <= req.limitPrice || req.side === "sell" && last >= req.limitPrice) || req.type === "stop" && req.stopPrice !== void 0 && (req.side === "buy" && last >= req.stopPrice || req.side === "sell" && last <= req.stopPrice)) {
		const px = slip(req.side, last);
		if (req.side === "buy" && px * req.qty > book.cash + .01) {
			const rejected = {
				...order,
				status: "rejected",
				message: "Insufficient cash"
			};
			return {
				book: {
					...book,
					orders: [rejected, ...book.orders]
				},
				order: rejected,
				error: "Insufficient cash"
			};
		}
		const next = applyFill({
			...book,
			orders: [order, ...book.orders]
		}, order, px, now);
		return {
			book: next,
			order: next.orders.find((o) => o.id === order.id)
		};
	}
	const working = {
		...order,
		status: "accepted"
	};
	return {
		book: {
			...book,
			orders: [working, ...book.orders]
		},
		order: working
	};
}
var WORKING = [
	"new",
	"accepted",
	"partially_filled"
];
function matchWorkingOrders(book, quotes, now = Date.now()) {
	let next = book;
	const fills = [];
	for (const order of book.orders) {
		if (!WORKING.includes(order.status)) continue;
		const last = lastOf(quotes, order.symbol);
		if (!last) continue;
		let hit = false;
		if (order.type === "limit" && order.limitPrice !== void 0 && (order.side === "buy" && last <= order.limitPrice || order.side === "sell" && last >= order.limitPrice)) hit = true;
		if (order.type === "stop" && order.stopPrice !== void 0 && (order.side === "buy" && last >= order.stopPrice || order.side === "sell" && last <= order.stopPrice)) hit = true;
		if (!hit) continue;
		const px = order.type === "limit" && order.limitPrice ? order.limitPrice : slip(order.side, last);
		if (order.side === "buy" && px * (order.qty - order.filledQty) > next.cash + .01) continue;
		next = applyFill(next, order, px, now);
		const filled = next.orders.find((o) => o.id === order.id);
		if (filled) fills.push(filled);
	}
	return {
		book: next,
		fills
	};
}
function cancelSimOrder(book, id) {
	return {
		...book,
		orders: book.orders.map((o) => o.id === id && WORKING.includes(o.status) ? {
			...o,
			status: "canceled"
		} : o)
	};
}
function cancelAllSim(book) {
	return {
		...book,
		orders: book.orders.map((o) => WORKING.includes(o.status) ? {
			...o,
			status: "canceled"
		} : o)
	};
}
function flattenSymbol(book, quotes, symbol, source) {
	const pos = book.positions.find((p) => p.symbol === symbol);
	if (!pos || pos.qty === 0) return {
		book,
		error: `No position in ${symbol}`
	};
	return submitSimOrder(book, quotes, {
		symbol,
		side: pos.qty > 0 ? "sell" : "buy",
		type: "market",
		qty: Math.abs(pos.qty),
		tif: "day",
		source
	});
}
function flattenAll(book, quotes, source) {
	let next = book;
	const orders = [];
	for (const pos of [...book.positions]) {
		const r = flattenSymbol(next, quotes, pos.symbol, source);
		next = r.book;
		if (r.order) orders.push(r.order);
	}
	return {
		book: next,
		orders
	};
}
function seedBars(symbol, n = 80) {
	const seed = SEED[symbol]?.last ?? 100;
	const prev = SEED[symbol]?.prev ?? seed * .99;
	const bars = [];
	let px = prev * .97;
	const step = 864e5;
	for (let i = 0; i < n; i++) {
		const t = Date.UTC(2026, 7, 25) - (n - i) * step;
		const drift = (seed - px) * .08;
		const shock = Math.sin(i / 3.7 + symbol.length) * seed * .006;
		const o = px;
		const c = i === n - 1 ? seed : px + drift + shock;
		const h = Math.max(o, c) + seed * .004;
		const l = Math.min(o, c) - seed * .004;
		bars.push({
			t,
			o,
			h,
			l,
			c,
			v: 2e6 + i * 8e3
		});
		px = c;
	}
	return bars;
}
function snapshotEquity(book, quotes, now = Date.now()) {
	const acct = deriveAccount(book, quotes);
	const history = [...book.equityHistory, {
		t: now,
		v: acct.equity
	}].slice(-240);
	return {
		...book,
		equityHistory: history
	};
}
function sma(values, period) {
	const out = Array(values.length).fill(NaN);
	if (period <= 0 || values.length < period) return out;
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i] ?? 0;
		if (i >= period) sum -= values[i - period] ?? 0;
		if (i >= period - 1) out[i] = sum / period;
	}
	return out;
}
function stdev(values, period) {
	const out = Array(values.length).fill(NaN);
	for (let i = period - 1; i < values.length; i++) {
		let mean = 0;
		for (let j = i - period + 1; j <= i; j++) mean += values[j] ?? 0;
		mean /= period;
		let v = 0;
		for (let j = i - period + 1; j <= i; j++) {
			const d = (values[j] ?? 0) - mean;
			v += d * d;
		}
		out[i] = Math.sqrt(v / period);
	}
	return out;
}
function closes(bars) {
	return bars.map((b) => b.c);
}
function lastFinite(arr) {
	for (let i = arr.length - 1; i >= 0; i--) {
		const v = arr[i];
		if (v !== void 0 && Number.isFinite(v)) return v;
	}
	return NaN;
}
function rsi(values, period = 14) {
	const out = Array(values.length).fill(NaN);
	if (values.length <= period) return out;
	let gain = 0;
	let loss = 0;
	for (let i = 1; i <= period; i++) {
		const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
		if (d >= 0) gain += d;
		else loss -= d;
	}
	let ag = gain / period;
	let al = loss / period;
	out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
	for (let i = period + 1; i < values.length; i++) {
		const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
		const g = d > 0 ? d : 0;
		const l = d < 0 ? -d : 0;
		ag = (ag * (period - 1) + g) / period;
		al = (al * (period - 1) + l) / period;
		out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
	}
	return out;
}
function localThesis(symbol, last, bars) {
	const c = closes(bars);
	if (c.length < 30) return `${symbol} ${last.toFixed(2)} — not enough history for a setup.`;
	const s20 = lastFinite(sma(c, 20));
	const s50 = lastFinite(sma(c, 50));
	const r = lastFinite(rsi(c, 14));
	const hi = Math.max(...bars.slice(-20).map((b) => b.h));
	const lo = Math.min(...bars.slice(-20).map((b) => b.l));
	const vs20 = Number.isFinite(s20) ? (last - s20) / s20 * 100 : 0;
	const trend = Number.isFinite(s20) && Number.isFinite(s50) ? s20 > s50 ? "intermediate trend up (SMA20 > SMA50)" : "intermediate trend down (SMA20 < SMA50)" : "trend mixed";
	const stretch = vs20 > 4 ? "extended vs SMA20" : vs20 < -4 ? "washed out vs SMA20" : "near SMA20";
	const rsiNote = Number.isFinite(r) ? r > 70 ? `RSI ${r.toFixed(0)} overbought` : r < 30 ? `RSI ${r.toFixed(0)} oversold` : `RSI ${r.toFixed(0)} mid-range` : "RSI n/a";
	const pos = last >= (lo + hi) / 2 ? "upper half of 20-bar range" : "lower half of 20-bar range";
	return `${symbol} ${last.toFixed(2)} · ${trend} · ${stretch} · ${rsiNote} · ${pos}.`;
}
var KIND_META = {
	"sma-cross": {
		label: "SMA CROSS",
		blurb: "Buy when fast SMA crosses above slow. Flatten on the reverse.",
		defaults: {
			fast: 10,
			slow: 30
		}
	},
	"mean-rev": {
		label: "MEAN REV",
		blurb: "Fade ±2σ moves versus SMA. Flatten back through the mean.",
		defaults: {
			period: 20,
			z: 2
		}
	},
	breakout: {
		label: "BREAKOUT",
		blurb: "Buy a close through the N-bar high. Flatten through the N-bar low.",
		defaults: { lookback: 20 }
	},
	momentum: {
		label: "MOMENTUM",
		blurb: "Buy N-bar return above the hurdle. Flatten when it rolls over.",
		defaults: {
			lookback: 20,
			hurdle: 2
		}
	}
};
function evaluateStrategy(s, bars) {
	const c = closes(bars);
	if (c.length < 10) return {
		action: "none",
		note: "warming up"
	};
	const last = c[c.length - 1] ?? NaN;
	if (s.kind === "sma-cross") {
		const fastN = s.params.fast ?? 10;
		const slowN = s.params.slow ?? 30;
		const f = sma(c, fastN);
		const sl = sma(c, slowN);
		const f0 = lastFinite(f.slice(0, -1));
		const f1 = lastFinite(f);
		const s0 = lastFinite(sl.slice(0, -1));
		const s1 = lastFinite(sl);
		if (![
			f0,
			f1,
			s0,
			s1
		].every(Number.isFinite)) return {
			action: "none",
			note: "warming up"
		};
		if (f0 <= s0 && f1 > s1) return {
			action: "buy",
			note: `fast ${f1.toFixed(2)} crossed above slow ${s1.toFixed(2)}`
		};
		if (f0 >= s0 && f1 < s1) return {
			action: "sell",
			note: `fast ${f1.toFixed(2)} crossed below slow ${s1.toFixed(2)}`
		};
		return {
			action: f1 > s1 ? "buy" : "flat",
			note: `fast ${f1.toFixed(2)} / slow ${s1.toFixed(2)}`
		};
	}
	if (s.kind === "mean-rev") {
		const period = s.params.period ?? 20;
		const zThr = s.params.z ?? 2;
		const m = lastFinite(sma(c, period));
		const sd = lastFinite(stdev(c, period));
		if (!Number.isFinite(m) || !Number.isFinite(sd) || sd === 0) return {
			action: "none",
			note: "warming up"
		};
		const z = (last - m) / sd;
		if (z <= -zThr) return {
			action: "buy",
			note: `z ${z.toFixed(2)} oversold vs SMA${period}`
		};
		if (z >= zThr) return {
			action: "sell",
			note: `z ${z.toFixed(2)} overbought vs SMA${period}`
		};
		if (Math.abs(z) < .3) return {
			action: "flat",
			note: `z ${z.toFixed(2)} at the mean`
		};
		return {
			action: "none",
			note: `z ${z.toFixed(2)}`
		};
	}
	if (s.kind === "breakout") {
		const n = Math.max(5, s.params.lookback ?? 20);
		const window = bars.slice(-n - 1, -1);
		if (window.length < n) return {
			action: "none",
			note: "warming up"
		};
		const hi = Math.max(...window.map((b) => b.h));
		const lo = Math.min(...window.map((b) => b.l));
		if (last > hi) return {
			action: "buy",
			note: `broke ${n}-bar high ${hi.toFixed(2)}`
		};
		if (last < lo) return {
			action: "sell",
			note: `broke ${n}-bar low ${lo.toFixed(2)}`
		};
		return {
			action: "none",
			note: `range ${lo.toFixed(2)}–${hi.toFixed(2)}`
		};
	}
	const n = Math.max(5, s.params.lookback ?? 20);
	const hurdle = (s.params.hurdle ?? 2) / 100;
	if (c.length <= n) return {
		action: "none",
		note: "warming up"
	};
	const ret = last / (c[c.length - 1 - n] ?? last) - 1;
	if (ret >= hurdle) return {
		action: "buy",
		note: `${n}-bar ${(ret * 100).toFixed(1)}%`
	};
	if (ret <= -hurdle) return {
		action: "sell",
		note: `${n}-bar ${(ret * 100).toFixed(1)}%`
	};
	return {
		action: "none",
		note: `${n}-bar ${(ret * 100).toFixed(1)}%`
	};
}
function backtest(kind, params, bars) {
	const dummy = {
		id: "bt",
		kind,
		name: kind,
		symbol: "X",
		qty: 1,
		armed: false,
		params,
		lastSignal: "none",
		lastFiredAt: 0,
		note: ""
	};
	let pos = 0;
	let entry = 0;
	let trades = 0;
	let wins = 0;
	let equity = 1;
	let peak = 1;
	let maxDd = 0;
	for (let i = 30; i < bars.length; i++) {
		const sig = evaluateStrategy(dummy, bars.slice(0, i + 1));
		const px = bars[i].c;
		if (sig.action === "buy" && pos <= 0) {
			if (pos < 0) {
				const r = (entry - px) / entry;
				trades += 1;
				if (r > 0) wins += 1;
				equity *= 1 + r;
			}
			pos = 1;
			entry = px;
		} else if ((sig.action === "sell" || sig.action === "flat") && pos > 0) {
			const r = (px - entry) / entry;
			trades += 1;
			if (r > 0) wins += 1;
			equity *= 1 + r;
			pos = sig.action === "sell" ? -1 : 0;
			entry = px;
		}
		peak = Math.max(peak, equity);
		maxDd = Math.max(maxDd, (peak - equity) / peak);
	}
	return {
		trades,
		winRate: trades ? wins / trades * 100 : 0,
		netPct: (equity - 1) * 100,
		maxDdPct: maxDd * 100
	};
}
function defaultStrategies() {
	return [
		{
			id: "sma-spy",
			kind: "sma-cross",
			name: "SPY FAST/SLOW",
			symbol: "SPY",
			qty: 5,
			armed: false,
			params: {
				fast: 10,
				slow: 30
			},
			lastSignal: "none",
			lastFiredAt: 0,
			note: "disarmed"
		},
		{
			id: "mr-qqq",
			kind: "mean-rev",
			name: "QQQ FADE",
			symbol: "QQQ",
			qty: 5,
			armed: false,
			params: {
				period: 20,
				z: 2
			},
			lastSignal: "none",
			lastFiredAt: 0,
			note: "disarmed"
		},
		{
			id: "bo-nvda",
			kind: "breakout",
			name: "NVDA HIGH",
			symbol: "NVDA",
			qty: 8,
			armed: false,
			params: { lookback: 20 },
			lastSignal: "none",
			lastFiredAt: 0,
			note: "disarmed"
		},
		{
			id: "mo-tsla",
			kind: "momentum",
			name: "TSLA THRUST",
			symbol: "TSLA",
			qty: 6,
			armed: false,
			params: {
				lookback: 15,
				hurdle: 3
			},
			lastSignal: "none",
			lastFiredAt: 0,
			note: "disarmed"
		}
	];
}
var EMPTY_ACCOUNT = {
	cash: 0,
	equity: 0,
	buyingPower: 0,
	lastEquity: 0,
	longValue: 0,
	shortValue: 0,
	dayPl: 0,
	dayPlPct: 0,
	realizedToday: 0,
	status: "—",
	patternDayTrader: false,
	daytradeCount: 0,
	tradingBlocked: false
};
function line(kind, text) {
	return {
		id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
		t: Date.now(),
		kind,
		text
	};
}
var seedSymbols = [...DEFAULT_WATCHLIST, ...STARTER_LOTS.map((l) => l.symbol)];
var useDesk = create()(persist((set, get) => ({
	venue: "sim",
	creds: null,
	connected: false,
	connectError: null,
	watchlist: [...DEFAULT_WATCHLIST],
	selected: "AAPL",
	quotes: quoteMapFromSeed(seedSymbols),
	tapeSource: "seed",
	bars: seedBars("AAPL"),
	barsSymbol: "AAPL",
	barRange: "1M",
	barsSource: "seed",
	barsLoading: false,
	sim: createStarterBook(),
	account: null,
	alpacaPositions: [],
	alpacaOrders: [],
	strategies: defaultStrategies(),
	botLog: [],
	risk: {
		maxDailyLossPct: 2,
		maxPositionPct: 15,
		defaultQty: 10
	},
	halted: false,
	settingsOpen: false,
	mobileTab: "chart",
	immersive: false,
	chartFocus: false,
	setVenue: (v) => set({
		venue: v,
		connected: v === "sim",
		connectError: null
	}),
	setCreds: (c) => set({ creds: c }),
	setConnected: (ok, error = null) => set({
		connected: ok,
		connectError: error ?? null
	}),
	setSelected: (s) => set({ selected: s.toUpperCase() }),
	setBarRange: (r) => set({ barRange: r }),
	setQuotes: (q, source) => set({
		quotes: {
			...get().quotes,
			...q
		},
		...source ? { tapeSource: source } : {}
	}),
	setBars: (symbol, bars, source) => set({
		bars,
		barsSymbol: symbol,
		barsLoading: false,
		...source ? { barsSource: source } : {}
	}),
	setBarsLoading: (v) => set({ barsLoading: v }),
	setSim: (sim) => set({ sim }),
	setAlpacaBook: (a) => set({
		account: a.account,
		alpacaPositions: a.positions,
		alpacaOrders: a.orders
	}),
	setStrategies: (s) => set({ strategies: s }),
	patchStrategy: (id, patch) => set({ strategies: get().strategies.map((x) => x.id === id ? {
		...x,
		...patch
	} : x) }),
	addWatch: (s) => {
		const sym = s.toUpperCase();
		if (!sym || get().watchlist.includes(sym)) return;
		set({ watchlist: [...get().watchlist, sym] });
	},
	rmWatch: (s) => set({ watchlist: get().watchlist.filter((x) => x !== s) }),
	log: (kind, text) => set({ botLog: [...get().botLog, line(kind, text)].slice(-200) }),
	setHalted: (v) => set({ halted: v }),
	setRisk: (r) => set({ risk: {
		...get().risk,
		...r
	} }),
	setSettingsOpen: (v) => set({ settingsOpen: v }),
	setMobileTab: (t) => set({ mobileTab: t }),
	setImmersive: (v) => set({ immersive: v }),
	setChartFocus: (v) => set({ chartFocus: v }),
	toggleChartFocus: () => set({ chartFocus: !get().chartFocus }),
	resetSim: () => set({
		sim: createStarterBook(),
		venue: "sim",
		halted: false,
		connected: true,
		connectError: null
	})
}), {
	name: "nightdesk.v1",
	partialize: (s) => ({
		venue: s.venue === "alpaca-live" ? "alpaca-paper" : s.venue,
		creds: s.creds,
		watchlist: s.watchlist,
		selected: s.selected,
		barRange: s.barRange,
		sim: s.sim,
		strategies: s.strategies,
		botLog: s.botLog.slice(-80),
		risk: s.risk,
		halted: s.halted
	})
}));
function selectAccount(s) {
	if (s.venue === "sim") return deriveAccount(s.sim, s.quotes);
	return s.account ?? EMPTY_ACCOUNT;
}
function selectPositions(s) {
	if (s.venue === "sim") return markPositions(s.sim.positions, s.quotes);
	return s.alpacaPositions;
}
function useLiveBook() {
	const venue = useDesk((s) => s.venue);
	const sim = useDesk((s) => s.sim);
	const quotes = useDesk((s) => s.quotes);
	const alpacaAccount = useDesk((s) => s.account);
	const alpacaPositions = useDesk((s) => s.alpacaPositions);
	const alpacaOrders = useDesk((s) => s.alpacaOrders);
	return (0, import_react.useMemo)(() => {
		if (venue === "sim") return {
			account: deriveAccount(sim, quotes),
			positions: markPositions(sim.positions, quotes),
			orders: sim.orders
		};
		return {
			account: alpacaAccount ?? EMPTY_ACCOUNT,
			positions: alpacaPositions,
			orders: alpacaOrders
		};
	}, [
		venue,
		sim,
		quotes,
		alpacaAccount,
		alpacaPositions,
		alpacaOrders
	]);
}
var HELP = `Commands
  BUY 10 AAPL                 market buy
  SELL 5 NVDA                 market sell
  BUY 10 AAPL 185.5           limit buy
  STOP SELL 10 AAPL 170       stop sell
  BUY AAPL $2500              notional market
  FLATTEN AAPL | FLATTEN ALL
  CANCEL ALL
  ARM sma-spy | DISARM sma-spy
  THESIS NVDA
  WATCH ADD AMD | WATCH RM AMD
  HALT | RESUME | STATUS | HELP
Natural language is sent to Grok when it does not match a command.`;
function helpText() {
	return HELP;
}
function sideOf(w) {
	if (w === "BUY" || w === "LONG" || w === "COVER") return "buy";
	if (w === "SELL" || w === "SHORT") return "sell";
	return null;
}
function parseCommand(raw, lastPrice) {
	const text = raw.trim();
	if (!text) return null;
	const u = text.toUpperCase();
	if (u === "HELP" || u === "?") return { op: "help" };
	if (u === "STATUS" || u === "POS" || u === "POSITIONS") return { op: "status" };
	if (u === "HALT" || u === "KILL" || u === "KILL SWITCH" || u === "STOP BOT") return { op: "halt" };
	if (u === "RESUME" || u === "UNHALT") return { op: "resume" };
	if (u === "FLATTEN" || u === "FLATTEN ALL" || u === "CLOSE ALL") return { op: "flatten" };
	if (u === "CANCEL" || u === "CANCEL ALL" || u === "CXL ALL") return { op: "cancel" };
	const flatten = u.match(/^FLATTEN\s+([A-Z][A-Z0-9.]{0,9})$/);
	if (flatten?.[1]) return {
		op: "flatten",
		symbol: flatten[1]
	};
	const thesis = u.match(/^(THESIS|ANALYZE|ANALYSE)\s+([A-Z][A-Z0-9.]{0,9})$/);
	if (thesis?.[2]) return {
		op: "thesis",
		symbol: thesis[2]
	};
	const watch = u.match(/^WATCH\s+(ADD|RM|REMOVE|DEL)\s+([A-Z][A-Z0-9.]{0,9})$/);
	if (watch?.[1] && watch[2]) return {
		op: "watch",
		action: watch[1] === "ADD" ? "add" : "rm",
		symbol: watch[2]
	};
	const arm = u.match(/^(ARM|DISARM)\s+([A-Z0-9._-]+)$/);
	if (arm?.[1] && arm[2]) return {
		op: arm[1] === "ARM" ? "arm" : "disarm",
		id: arm[2].toLowerCase()
	};
	const select = u.match(/^(SELECT|CHART|SHOW)\s+([A-Z][A-Z0-9.]{0,9})$/);
	if (select?.[2]) return {
		op: "select",
		symbol: select[2]
	};
	const stop = u.match(/^STOP\s+(BUY|SELL)\s+(\d+(?:\.\d+)?)\s+([A-Z][A-Z0-9.]{0,9})\s+(\d+(?:\.\d+)?)$/);
	if (stop) return {
		op: "order",
		request: {
			symbol: stop[3],
			side: stop[1] === "BUY" ? "buy" : "sell",
			type: "stop",
			qty: Number(stop[2]),
			tif: "day",
			stopPrice: Number(stop[4]),
			source: "bot"
		}
	};
	const mkt = u.match(/^(BUY|SELL|LONG|SHORT|COVER)\s+(\d+(?:\.\d+)?)\s+([A-Z][A-Z0-9.]{0,9})(?:\s+(\d+(?:\.\d+)?))?(?:\s+(DAY|GTC|IOC))?$/);
	if (mkt) {
		const side = sideOf(mkt[1]);
		const limit = mkt[4] ? Number(mkt[4]) : void 0;
		const tif = mkt[5]?.toLowerCase() ?? "day";
		const type = limit !== void 0 ? "limit" : "market";
		return {
			op: "order",
			request: {
				symbol: mkt[3],
				side,
				type,
				qty: Number(mkt[2]),
				tif,
				limitPrice: limit,
				source: "bot"
			}
		};
	}
	const notional = u.match(/^(BUY|SELL)\s+([A-Z][A-Z0-9.]{0,9})\s+\$(\d+(?:\.\d+)?)$/);
	if (notional && lastPrice && lastPrice > 0) {
		const dollars = Number(notional[3]);
		const qty = Math.floor(dollars / lastPrice * 1e4) / 1e4;
		return {
			op: "order",
			request: {
				symbol: notional[2],
				side: notional[1] === "BUY" ? "buy" : "sell",
				type: "market",
				qty,
				tif: "day",
				source: "bot"
			}
		};
	}
	if (/^[A-Z]{1,5}$/.test(u) && u.length <= 5) return {
		op: "select",
		symbol: normalizeSymbol(u)
	};
	return {
		op: "ask",
		text
	};
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var fetchQuotes = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("5e0c367001645e2ea4b82ce038a0bf45f05667fa2033ee44a2ee59dd7ef4f3ae"));
var fetchBars = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("3aee79f4a822642bd4190df7cd1d921afbf0038e852123b6339df50a26dc44d3"));
var pingAlpaca = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("f933f05ada1bd67cc5be98bb37eb9e6c711baf688c265aef5a347421b1596ef0"));
var fetchAccountSnapshot = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("cb7af05d17751ac33e65ab421cef3ef500b4ba6675ff32446fd2fd4c9411934b"));
var submitAlpacaOrder = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("883d59fd5489426b66674e567dab3abb00eb33eb9d8e1d1861ddc76696024601"));
var cancelAlpacaOrder = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("34cfd8b1a350b921dddb403c14f73122f90926a989eb8b2b302c7115e63cc8c1"));
var cancelAllAlpaca = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("12756aea4185bdcb4aa10017af01cc228665ce7bdef96776e2745b2116b55b89"));
var closeAlpacaPosition = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("a960e657c06549777807cf2fa131137507a123fcb65ed6947791d5ddc5429dc0"));
var closeAllAlpaca = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("be9aa40168a8df26bd0056c8aa521ad6ac6f1efc283f676bb650b7aabf3e70ef"));
createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("a38db775eac05c9beaaaf3f87230f6211ff85a0f9480d31ecd904ca58cde431d"));
var askDesk = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("c0bf3fc535bf25e04517a2179ac179f2f19a8ac8fa704dc2c7f681a27ab933b1"));
function unique(xs) {
	return [...new Set(xs.filter(Boolean))];
}
async function refreshQuotes() {
	const s = useDesk.getState();
	const symbols = unique([
		s.selected,
		...s.watchlist,
		...s.sim.positions.map((p) => p.symbol),
		...s.alpacaPositions.map((p) => p.symbol),
		...s.strategies.map((st) => st.symbol)
	]);
	try {
		const pack = await fetchQuotes({ data: {
			symbols,
			venue: s.venue,
			creds: s.creds
		} });
		const quotes = pack.quotes;
		const { setQuotes, setSim, venue, sim, log } = useDesk.getState();
		setQuotes(quotes, pack.source);
		if (venue === "sim") {
			const matched = matchWorkingOrders(sim, quotes);
			let next = matched.book;
			next = snapshotEquity(next, quotes);
			setSim(next);
			for (const f of matched.fills) {
				log("fill", `FILL ${f.side.toUpperCase()} ${f.qty} ${f.symbol} @ ${f.filledAvgPrice?.toFixed(2)}`);
				toast.success(`Filled ${f.side} ${f.qty} ${f.symbol}`);
			}
		}
	} catch (err) {
		useDesk.getState().log("err", err instanceof Error ? err.message : "Quote feed failed");
	}
}
async function refreshBars() {
	const s = useDesk.getState();
	s.setBarsLoading(true);
	try {
		const pack = await fetchBars({ data: {
			symbol: s.selected,
			range: s.barRange,
			venue: s.venue,
			creds: s.creds
		} });
		if (!pack.bars.length) {
			useDesk.getState().setBarsLoading(false);
			useDesk.getState().log("err", `No bars for ${s.selected} ${s.barRange}`);
			return;
		}
		useDesk.getState().setBars(s.selected, pack.bars, pack.source);
	} catch (err) {
		useDesk.getState().setBarsLoading(false);
		useDesk.getState().log("err", err instanceof Error ? err.message : "Chart feed failed");
	}
}
async function refreshAlpaca() {
	const s = useDesk.getState();
	if (s.venue === "sim" || !s.creds) return;
	try {
		const snap = await fetchAccountSnapshot({ data: {
			venue: s.venue,
			creds: s.creds
		} });
		useDesk.getState().setAlpacaBook(snap);
	} catch (err) {
		useDesk.getState().log("err", err instanceof Error ? err.message : "Alpaca snapshot failed");
	}
}
function riskHaltIfNeeded() {
	const s = useDesk.getState();
	const acct = selectAccount(s);
	if (acct.lastEquity > 0 && acct.dayPlPct <= -s.risk.maxDailyLossPct && !s.halted) {
		s.setHalted(true);
		s.log("err", `Daily loss ${acct.dayPlPct.toFixed(2)}% hit cap. Desk halted.`);
		toast.error("Daily loss cap — desk halted");
	}
}
async function placeOrder(req) {
	const s = useDesk.getState();
	if (s.halted) {
		s.log("err", "Desk is halted. RESUME to trade.");
		return {
			ok: false,
			error: "Halted"
		};
	}
	const acct = selectAccount(s);
	if (acct.tradingBlocked) return {
		ok: false,
		error: "Trading blocked"
	};
	const notional = (s.quotes[req.symbol]?.last ?? 0) * req.qty;
	if (acct.equity > 0 && notional / acct.equity > s.risk.maxPositionPct / 100 && req.side === "buy") {
		const msg = `Order ${notional.toFixed(0)} exceeds max position ${s.risk.maxPositionPct}%`;
		s.log("err", msg);
		return {
			ok: false,
			error: msg
		};
	}
	if (s.venue === "sim") {
		const result = submitSimOrder(s.sim, s.quotes, req);
		s.setSim(result.book);
		if (result.error) {
			s.log("err", result.error);
			toast.error(result.error);
			return {
				ok: false,
				error: result.error
			};
		}
		const o = result.order;
		const fillNote = o.status === "filled" ? `FILL ${o.side.toUpperCase()} ${o.qty} ${o.symbol} @ ${o.filledAvgPrice?.toFixed(2)}` : `ACK ${o.side.toUpperCase()} ${o.type} ${o.qty} ${o.symbol} (${o.status})`;
		s.log(o.status === "filled" ? "fill" : "sys", fillNote);
		if (o.status === "filled") toast.success(fillNote);
		riskHaltIfNeeded();
		return { ok: true };
	}
	if (!s.creds) {
		s.log("err", "Connect Alpaca keys in Settings.");
		return {
			ok: false,
			error: "No keys"
		};
	}
	const res = await submitAlpacaOrder({ data: {
		venue: s.venue,
		creds: s.creds,
		symbol: req.symbol,
		side: req.side,
		type: req.type,
		qty: req.qty,
		tif: req.tif,
		limitPrice: req.limitPrice,
		stopPrice: req.stopPrice
	} });
	if (!res.ok) {
		s.log("err", res.error);
		toast.error(res.error);
		return {
			ok: false,
			error: res.error
		};
	}
	s.log("sys", `ACK ${res.order.side.toUpperCase()} ${res.order.qty} ${res.order.symbol}`);
	await refreshAlpaca();
	return { ok: true };
}
async function cancelOrder(id) {
	const s = useDesk.getState();
	if (s.venue === "sim") {
		s.setSim(cancelSimOrder(s.sim, id));
		s.log("sys", `Canceled ${id}`);
		return;
	}
	if (!s.creds) return;
	const res = await cancelAlpacaOrder({ data: {
		venue: s.venue,
		creds: s.creds,
		id
	} });
	if (!res.ok) s.log("err", res.error);
	else s.log("sys", `Canceled ${id}`);
	await refreshAlpaca();
}
async function killSwitch(flattenBook) {
	const s = useDesk.getState();
	s.setHalted(true);
	s.setStrategies(s.strategies.map((st) => ({
		...st,
		armed: false
	})));
	if (s.venue === "sim") {
		let book = cancelAllSim(s.sim);
		if (flattenBook) book = flattenAll(book, s.quotes, "bot").book;
		s.setSim(book);
	} else if (s.creds) {
		await cancelAllAlpaca({ data: {
			venue: s.venue,
			creds: s.creds
		} });
		if (flattenBook) await closeAllAlpaca({ data: {
			venue: s.venue,
			creds: s.creds
		} });
		await refreshAlpaca();
	}
	s.log("err", flattenBook ? "KILL — canceled working + flattened" : "KILL — canceled working, strategies disarmed");
	toast.error("Kill switch engaged");
}
async function flatten(symbol) {
	const s = useDesk.getState();
	if (s.venue === "sim") {
		if (!symbol) {
			const r = flattenAll(s.sim, s.quotes, "bot");
			s.setSim(r.book);
			s.log("fill", `Flattened ${r.orders.length} names`);
			return;
		}
		const r = flattenSymbol(s.sim, s.quotes, symbol, "bot");
		s.setSim(r.book);
		if (r.error) s.log("err", r.error);
		else s.log("fill", `Flattened ${symbol}`);
		return;
	}
	if (!s.creds) return;
	if (!symbol) {
		const r = await closeAllAlpaca({ data: {
			venue: s.venue,
			creds: s.creds
		} });
		if (!r.ok) s.log("err", r.error);
		else s.log("sys", "Flattened all");
	} else {
		const r = await closeAlpacaPosition({ data: {
			venue: s.venue,
			creds: s.creds,
			symbol
		} });
		if (!r.ok) s.log("err", r.error);
		else s.log("sys", `Flattened ${symbol}`);
	}
	await refreshAlpaca();
}
async function connectAlpaca(venue, keyId, secret) {
	const s = useDesk.getState();
	if (venue === "sim") {
		s.setVenue("sim");
		s.setCreds(null);
		s.setConnected(true);
		s.log("sys", "Venue SIM — local blotter, Yahoo delayed tape.");
		return { ok: true };
	}
	const creds = {
		keyId: keyId.trim(),
		secret: secret.trim()
	};
	if (!creds.keyId || !creds.secret) return {
		ok: false,
		error: "Enter key and secret"
	};
	const ping = await pingAlpaca({ data: {
		venue,
		creds
	} });
	if (!ping.ok) {
		s.setConnected(false, ping.error);
		s.log("err", ping.error);
		return ping;
	}
	s.setCreds(creds);
	s.setVenue(venue);
	s.setConnected(true);
	s.setAlpacaBook({
		account: ping.account,
		positions: [],
		orders: []
	});
	s.log("sys", `Connected ${venue === "alpaca-live" ? "LIVE" : "PAPER"} · equity ${ping.account.equity.toFixed(0)} · tape Alpaca IEX (Yahoo fallback)`);
	await refreshAlpaca();
	await refreshQuotes();
	return { ok: true };
}
async function tickStrategies() {
	const s = useDesk.getState();
	if (s.halted) return;
	const armed = s.strategies.filter((st) => st.armed);
	if (armed.length === 0) return;
	for (const st of armed) try {
		const sig = evaluateStrategy(st, (await fetchBars({ data: {
			symbol: st.symbol,
			range: "6M",
			venue: s.venue,
			creds: s.creds
		} })).bars);
		useDesk.getState().patchStrategy(st.id, {
			lastSignal: sig.action,
			note: sig.note
		});
		if (Date.now() - st.lastFiredAt < 9e5 && st.lastFiredAt !== 0) continue;
		const qty = selectPositions(useDesk.getState()).find((p) => p.symbol === st.symbol)?.qty ?? 0;
		if (sig.action === "buy" && qty <= 0) {
			if ((await placeOrder({
				symbol: st.symbol,
				side: "buy",
				type: "market",
				qty: st.qty,
				tif: "day",
				source: "strategy"
			})).ok) {
				useDesk.getState().patchStrategy(st.id, {
					lastFiredAt: Date.now(),
					lastSignal: "buy"
				});
				useDesk.getState().log("signal", `${st.name} BUY ${st.qty} ${st.symbol} · ${sig.note}`);
			}
		} else if ((sig.action === "sell" || sig.action === "flat") && qty > 0) {
			await flatten(st.symbol);
			useDesk.getState().patchStrategy(st.id, {
				lastFiredAt: Date.now(),
				lastSignal: sig.action
			});
			useDesk.getState().log("signal", `${st.name} FLATTEN ${st.symbol} · ${sig.note}`);
		}
	} catch (err) {
		useDesk.getState().log("err", `${st.name}: ${err instanceof Error ? err.message : "tick failed"}`);
	}
}
async function runGrokCommands(commands) {
	for (const c of commands) if (c.op === "buy" || c.op === "sell") {
		if (!c.symbol || !c.qty) continue;
		await placeOrder({
			symbol: c.symbol.toUpperCase(),
			side: c.op,
			type: c.type ?? "market",
			qty: c.qty,
			tif: "day",
			limitPrice: c.limitPrice,
			stopPrice: c.stopPrice,
			source: "bot"
		});
	} else if (c.op === "flatten") await flatten(c.symbol?.toUpperCase());
	else if (c.op === "cancel_all") {
		const st = useDesk.getState();
		if (st.venue === "sim") st.setSim(cancelAllSim(st.sim));
		else if (st.creds) await cancelAllAlpaca({ data: {
			venue: st.venue,
			creds: st.creds
		} });
		st.log("sys", "Canceled working orders");
	} else if (c.op === "halt") await killSwitch(false);
	else if (c.op === "resume") {
		useDesk.getState().setHalted(false);
		useDesk.getState().log("sys", "Desk resumed");
	} else if (c.op === "thesis" && c.symbol) await runThesis(c.symbol.toUpperCase());
}
async function runThesis(symbol) {
	const s = useDesk.getState();
	const last = s.quotes[symbol]?.last ?? 0;
	let bars = s.selected === symbol ? s.bars : [];
	if (bars.length < 30) bars = (await fetchBars({ data: {
		symbol,
		range: "6M",
		venue: s.venue,
		creds: s.creds
	} })).bars;
	const local = localThesis(symbol, last || bars.at(-1)?.c || 0, bars);
	s.log("ai", local);
	const grok = await askDesk({ data: {
		text: `Write a 3-sentence trade thesis for ${symbol}. Last ${last}. Be specific, no hype.`,
		selected: symbol,
		last,
		equity: selectAccount(s).equity,
		positions: selectPositions(s).map((p) => `${p.symbol}:${p.qty}`).join(",")
	} });
	if (grok.ok && grok.say) s.log("ai", grok.say);
}
async function runConsole(raw) {
	const s = useDesk.getState();
	const text = raw.trim();
	if (!text) return;
	s.log("cmd", text);
	const last = s.quotes[s.selected]?.last;
	const cmd = parseCommand(text, last);
	if (!cmd) return;
	if (cmd.op === "help") {
		s.log("sys", helpText());
		return;
	}
	if (cmd.op === "status") {
		const acct = selectAccount(s);
		const pos = selectPositions(s);
		s.log("sys", `EQ ${acct.equity.toFixed(2)}  CASH ${acct.cash.toFixed(2)}  DAY ${acct.dayPl.toFixed(2)}  N=${pos.length}  ${s.halted ? "HALTED" : "LIVE"}`);
		for (const p of pos) s.log("sys", `  ${p.symbol}  ${p.qty}  @${p.avgPrice.toFixed(2)}  pnl ${p.unrealizedPl.toFixed(0)}`);
		return;
	}
	if (cmd.op === "halt") {
		await killSwitch(false);
		return;
	}
	if (cmd.op === "resume") {
		s.setHalted(false);
		s.log("sys", "Desk resumed");
		return;
	}
	if (cmd.op === "flatten") {
		await flatten(cmd.symbol);
		return;
	}
	if (cmd.op === "cancel") {
		if (s.venue === "sim") s.setSim(cancelAllSim(s.sim));
		else if (s.creds) await cancelAllAlpaca({ data: {
			venue: s.venue,
			creds: s.creds
		} });
		s.log("sys", "Canceled working");
		return;
	}
	if (cmd.op === "thesis") {
		s.setSelected(cmd.symbol);
		await runThesis(cmd.symbol);
		return;
	}
	if (cmd.op === "watch") {
		if (cmd.action === "add") s.addWatch(cmd.symbol);
		else s.rmWatch(cmd.symbol);
		s.log("sys", `Watchlist ${cmd.action} ${cmd.symbol}`);
		await refreshQuotes();
		return;
	}
	if (cmd.op === "arm" || cmd.op === "disarm") {
		const st = s.strategies.find((x) => x.id === cmd.id);
		if (!st) {
			s.log("err", `No strategy ${cmd.id}`);
			return;
		}
		s.patchStrategy(st.id, { armed: cmd.op === "arm" });
		s.log("sys", `${cmd.op.toUpperCase()} ${st.name}`);
		return;
	}
	if (cmd.op === "select") {
		s.setSelected(cmd.symbol);
		if (!s.watchlist.includes(cmd.symbol)) s.addWatch(cmd.symbol);
		return;
	}
	if (cmd.op === "order") {
		await placeOrder(cmd.request);
		return;
	}
	if (cmd.op === "ask") {
		const grok = await askDesk({ data: {
			text: cmd.text,
			selected: s.selected,
			last,
			equity: selectAccount(s).equity,
			positions: selectPositions(s).map((p) => `${p.symbol}:${p.qty}`).join(",")
		} });
		if (!grok.ok) {
			s.log("err", grok.error + " — use HELP for the command language.");
			return;
		}
		if (grok.say) s.log("ai", grok.say);
		if (grok.commands.length) await runGrokCommands(grok.commands);
	}
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono text-2xs font-medium uppercase tracking-wide transition-[color,background-color,opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:bg-accent/90",
			ghost: "bg-transparent text-muted hover:bg-elevated hover:text-fg",
			outline: "border border-border bg-transparent text-fg hover:bg-elevated",
			buy: "bg-up text-bg hover:bg-up/90",
			sell: "bg-down text-fg hover:bg-down/90",
			halt: "border border-down/50 bg-down/15 text-down hover:bg-down/25"
		},
		size: {
			sm: "h-7 px-2",
			md: "h-9 px-3",
			lg: "h-11 px-4",
			icon: "size-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "md"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
var VENUE = {
	sim: "SIM",
	"alpaca-paper": "PAPER",
	"alpaca-live": "LIVE"
};
var TAPE = {
	alpaca: {
		label: "IEX",
		title: "Alpaca Market Data — IEX real-time"
	},
	yahoo: {
		label: "YH",
		title: "Yahoo Finance delayed tape"
	},
	mixed: {
		label: "MIX",
		title: "Alpaca IEX with Yahoo fill-ins"
	},
	seed: {
		label: "SEED",
		title: "Offline seed quotes"
	}
};
function HeaderBar() {
	const now = useNow(1e3);
	const clock = now ? getMarketClock(now) : null;
	const venue = useDesk((s) => s.venue);
	const halted = useDesk((s) => s.halted);
	const tapeSource = useDesk((s) => s.tapeSource);
	const immersive = useDesk((s) => s.immersive);
	const chartFocus = useDesk((s) => s.chartFocus);
	const setImmersive = useDesk((s) => s.setImmersive);
	const setChartFocus = useDesk((s) => s.setChartFocus);
	const { account } = useLiveBook();
	const openSettings = useDesk((s) => s.setSettingsOpen);
	const tape = TAPE[tapeSource];
	const tapeWarn = venue !== "sim" && tapeSource !== "alpaca";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg px-2 md:h-10 md:px-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs font-medium tracking-widest text-accent",
					children: "NIGHTDESK"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("hidden font-mono text-micro tracking-widest uppercase md:inline", venue === "alpaca-live" ? "text-down" : "text-muted"),
					children: VENUE[venue]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					title: tape.title,
					className: cn("hidden font-mono text-micro tracking-widest uppercase md:inline", tapeWarn ? "text-down" : "text-subtle"),
					children: tape.label
				}),
				halted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-micro tracking-widest text-down uppercase",
					children: "Halt"
				}) : null,
				chartFocus ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setChartFocus(false),
					className: "hidden font-mono text-micro tracking-widest text-accent uppercase md:inline",
					title: "Exit chart focus",
					children: "Chart"
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "ml-auto flex min-w-0 items-center gap-2 overflow-hidden md:gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hidden items-center gap-2 font-mono text-2xs md:flex",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", clock?.session === "open" ? "led-live bg-up" : clock?.session === "pre" || clock?.session === "post" ? "bg-accent" : "bg-subtle") }), clock ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: clock.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							suppressHydrationWarning: true,
							className: "tabular-nums text-fg",
							children: clockTime(now)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							suppressHydrationWarning: true,
							className: "text-subtle",
							children: [clockDate(now), " ET"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-subtle",
							children: clock.countdown
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "NYSE"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "EQ",
					value: money(account.equity, true)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "CASH",
					value: money(account.cash, true),
					className: "hidden sm:flex"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "DAY",
					value: `${signedMoney(account.dayPl)} ${pct(account.dayPlPct)}`,
					valueClass: signClass(account.dayPl)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "halt",
					size: "sm",
					className: "hidden md:inline-flex",
					onClick: () => void killSwitch(false),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { className: "size-3" }), "Kill"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					className: "size-9 md:size-7",
					onClick: () => setImmersive(!immersive),
					"aria-label": immersive ? "Exit fullscreen" : "Enter fullscreen",
					title: immersive ? "Exit fullscreen (Esc)" : "Fullscreen (Shift+F)",
					children: immersive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize2, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					className: "size-9 md:size-7",
					onClick: () => openSettings(true),
					"aria-label": "Settings",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4" })
				})
			]
		})]
	});
}
function Stat({ label, value, className, valueClass }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex min-w-0 flex-col leading-none", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-micro tracking-widest text-subtle uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("truncate font-mono text-2xs tabular-nums text-fg", valueClass),
			children: value
		})]
	});
}
function TickerTape() {
	const watchlist = useDesk((s) => s.watchlist);
	const quotes = useDesk((s) => s.quotes);
	const setSelected = useDesk((s) => s.setSelected);
	const items = watchlist.map((sym) => quotes[sym]).filter(Boolean);
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-8 items-center border-b border-border bg-bg px-3 font-mono text-micro tracking-widest text-subtle uppercase",
		children: "Loading tape…"
	});
	const row = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center",
		children: items.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setSelected(q.symbol),
			className: "flex h-8 shrink-0 items-center gap-2 border-r border-border px-3 font-mono text-2xs tabular-nums",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-accent",
					children: q.symbol
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-fg",
					children: px(q.last)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: signClass(q.change),
					children: pct(q.changePct)
				})
			]
		}, q.symbol + q.ts))
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative h-8 overflow-hidden border-b border-border bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("tape-track flex w-max", items.length < 6 && "md:animate-none"),
			children: [row, row]
		})
	});
}
function Panel$1({ title, action, children, className, bodyClassName }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("flex h-full min-h-0 min-w-0 flex-col border-border bg-surface", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex h-7 shrink-0 items-center justify-between gap-2 border-b border-border px-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "truncate font-mono text-micro font-medium tracking-widest text-accent uppercase",
				children: title
			}), action ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-1",
				children: action
			}) : null]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("min-h-0 flex-1 overflow-auto", bodyClassName),
			children
		})]
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("h-9 w-full border border-border bg-bg px-2 font-mono text-xs text-fg outline-none transition-[border-color,box-shadow] duration-[var(--motion-quick)] placeholder:text-subtle focus:border-accent focus:ring-1 focus:ring-accent", className),
		...props
	});
}
function Watchlist() {
	const watchlist = useDesk((s) => s.watchlist);
	const quotes = useDesk((s) => s.quotes);
	const selected = useDesk((s) => s.selected);
	const setSelected = useDesk((s) => s.setSelected);
	const addWatch = useDesk((s) => s.addWatch);
	const rmWatch = useDesk((s) => s.rmWatch);
	const [draft, setDraft] = (0, import_react.useState)("");
	function add() {
		const s = normalizeSymbol(draft);
		if (!s) return;
		addWatch(s);
		setSelected(s);
		setDraft("");
		refreshQuotes();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel$1, {
		title: "Watch",
		bodyClassName: "overflow-auto",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
			className: "flex items-center gap-1",
			onSubmit: (e) => {
				e.preventDefault();
				add();
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: draft,
				onChange: (e) => setDraft(e.target.value.toUpperCase()),
				placeholder: "ADD",
				className: "h-6 w-16 border-0 bg-transparent px-1 text-micro",
				"aria-label": "Add symbol"
			})
		}),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full font-mono text-2xs tabular-nums",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-left font-medium",
						children: "Sym"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-right font-medium",
						children: "Last"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-right font-medium",
						children: "Chg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "hidden px-2 py-1 text-right font-medium lg:table-cell",
						children: "Vol"
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: watchlist.map((sym) => {
				const q = quotes[sym];
				const chg = q?.changePct ?? 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: cn("cursor-pointer border-t border-border/60 hover:bg-elevated", selected === sym && "bg-elevated"),
					onClick: () => setSelected(sym),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1.5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: selected === sym ? "text-accent" : "text-fg",
									children: sym
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-subtle hover:text-down",
									"aria-label": `Remove ${sym}`,
									onClick: (e) => {
										e.stopPropagation();
										rmWatch(sym);
									},
									children: "×"
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1.5 text-right text-fg",
							children: q ? px(q.last) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: cn("px-2 py-1.5 text-right", signClass(chg)),
							children: q ? pct(chg) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "hidden px-2 py-1.5 text-right text-muted lg:table-cell",
							children: q ? vol(q.volume) : "—"
						})
					]
				}, sym);
			}) })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-2 md:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "lg",
				variant: "outline",
				className: "w-full",
				onClick: add,
				children: ["Add ", draft || "symbol"]
			})
		})]
	});
}
var RANGES = [
	"1D",
	"5D",
	"1M",
	"6M",
	"1Y"
];
function niceNum(range, round) {
	const exp = Math.floor(Math.log10(range));
	const f = range / 10 ** exp;
	let nf;
	if (round) {
		if (f < 1.5) nf = 1;
		else if (f < 3) nf = 2;
		else if (f < 7) nf = 5;
		else nf = 10;
	} else if (f <= 1) nf = 1;
	else if (f <= 2) nf = 2;
	else if (f <= 5) nf = 5;
	else nf = 10;
	return nf * 10 ** exp;
}
function ticks(min, max, count = 5) {
	const step = niceNum(niceNum(max - min || 1, false) / (count - 1), true);
	const start = Math.floor(min / step) * step;
	const out = [];
	for (let v = start; v <= max + step / 2; v += step) out.push(v);
	return out;
}
function CandleChart() {
	const selected = useDesk((s) => s.selected);
	const quotes = useDesk((s) => s.quotes);
	const bars = useDesk((s) => s.bars);
	const barRange = useDesk((s) => s.barRange);
	const setBarRange = useDesk((s) => s.setBarRange);
	const loading = useDesk((s) => s.barsLoading);
	const barsSource = useDesk((s) => s.barsSource);
	const chartFocus = useDesk((s) => s.chartFocus);
	const toggleChartFocus = useDesk((s) => s.toggleChartFocus);
	const { positions } = useLiveBook();
	const q = quotes[selected];
	const pos = positions.find((p) => p.symbol === selected);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel$1, {
		title: `${selected}  ${nameOf(selected)}`,
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1",
			children: [
				RANGES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setBarRange(r),
					className: cn("h-6 px-1.5 font-mono text-micro tracking-wide", r === barRange ? "text-accent" : "text-subtle hover:text-fg"),
					children: r
				}, r)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: () => void runThesis(selected),
					children: "Thesis"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					className: "size-7",
					onClick: toggleChartFocus,
					"aria-label": chartFocus ? "Exit chart focus" : "Focus chart",
					title: chartFocus ? "Exit chart (Esc)" : "Focus chart (F)",
					children: chartFocus ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shrink, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Expand, { className: "size-3.5" })
				})
			]
		}),
		bodyClassName: "flex min-h-0 flex-col overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex shrink-0 items-baseline gap-3 border-b border-border px-3 py-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-lg tabular-nums text-fg",
					children: q ? px(q.last) : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("font-mono text-xs tabular-nums", signClass(q?.change ?? 0)),
					children: q ? `${signedMoney(q.change)}  ${pct(q.changePct)}` : ""
				}),
				q ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "hidden font-mono text-micro text-muted md:inline",
					children: [
						"H ",
						px(q.high),
						"  L ",
						px(q.low),
						"  O ",
						px(q.open),
						barsSource === "alpaca" ? "  IEX" : barsSource === "yahoo" ? "  YH" : ""
					]
				}) : null,
				pos ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: cn("ml-auto font-mono text-micro tabular-nums", signClass(pos.unrealizedPl)),
					children: [
						"POS ",
						pos.qty,
						"  ",
						signedMoney(pos.unrealizedPl)
					]
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative min-h-0 flex-1",
			children: loading && bars.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center font-mono text-micro tracking-widest text-subtle uppercase",
				children: "Loading bars"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartSvg, {
				bars,
				range: barRange,
				last: q?.last
			})
		})]
	});
}
function ChartSvg({ bars, range, last }) {
	const wrap = (0, import_react.useRef)(null);
	const [size, setSize] = (0, import_react.useState)({
		w: 0,
		h: 0
	});
	const [hover, setHover] = (0, import_react.useState)(null);
	const intraday = range === "1D" || range === "5D";
	(0, import_react.useEffect)(() => {
		const parent = wrap.current;
		if (!parent) return;
		const apply = () => {
			const w = parent.clientWidth;
			const h = parent.clientHeight;
			setSize((prev) => prev.w === w && prev.h === h ? prev : {
				w,
				h
			});
		};
		apply();
		const ro = new ResizeObserver(apply);
		ro.observe(parent);
		return () => ro.disconnect();
	}, []);
	const layout = (0, import_react.useMemo)(() => {
		const { w, h } = size;
		if (w < 8 || h < 8 || bars.length === 0) return null;
		const padL = 8;
		const padR = 52;
		const padT = 14;
		const padB = 22;
		const volH = Math.max(28, h * .18);
		const plotH = h - padT - padB - volH - 6;
		const plotW = w - padL - padR;
		const cs = closes(bars);
		const s20 = sma(cs, 20);
		const s50 = sma(cs, 50);
		const hi = Math.max(...bars.map((b) => b.h), last ?? 0);
		const lo = Math.min(...bars.map((b) => b.l), last ?? hi);
		const span = hi - lo || 1;
		const min = lo - span * .04;
		const max = hi + span * .04;
		const maxV = Math.max(...bars.map((b) => b.v), 1);
		const xAt = (i) => padL + (i + .5) / bars.length * plotW;
		const yAt = (p) => padT + (max - p) / (max - min) * plotH;
		const candleW = Math.max(1.5, plotW / bars.length * .7);
		const maPath = (arr) => {
			const pts = [];
			for (let i = 0; i < arr.length; i++) {
				const v = arr[i];
				if (!Number.isFinite(v)) continue;
				pts.push(`${pts.length ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`);
			}
			return pts.join(" ");
		};
		return {
			w,
			h,
			padL,
			padR,
			padT,
			padB,
			volH,
			plotW,
			min,
			max,
			maxV,
			xAt,
			yAt,
			candleW,
			s20: maPath(s20),
			s50: maPath(s50),
			priceTicks: ticks(min, max, 5),
			timeStep: Math.max(1, Math.floor(bars.length / 5))
		};
	}, [
		bars,
		last,
		size
	]);
	function onMove(e) {
		if (!layout || bars.length === 0) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const x = ("touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX) - rect.left;
		const i = Math.round((x - layout.padL) / layout.plotW * bars.length - .5);
		setHover(Math.max(0, Math.min(bars.length - 1, i)));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: wrap,
		className: "absolute inset-0",
		children: layout ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: layout.w,
			height: layout.h,
			className: "size-full",
			onMouseMove: onMove,
			onMouseLeave: () => setHover(null),
			onTouchStart: onMove,
			onTouchMove: onMove,
			children: [
				layout.priceTicks.map((t) => {
					const y = layout.yAt(t);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: layout.padL,
						x2: layout.padL + layout.plotW,
						y1: y,
						y2: y,
						className: "stroke-border",
						strokeWidth: "1"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: layout.w - 6,
						y,
						textAnchor: "end",
						dominantBaseline: "middle",
						className: "fill-subtle font-mono",
						fontSize: "10",
						children: t >= 1e3 ? t.toFixed(0) : t.toFixed(2)
					})] }, t);
				}),
				bars.map((b, i) => {
					const x = layout.xAt(i);
					const bull = b.c >= b.o;
					const y1 = layout.yAt(Math.max(b.o, b.c));
					const y2 = layout.yAt(Math.min(b.o, b.c));
					const vh = b.v / layout.maxV * layout.volH;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
						className: bull ? "stroke-up fill-up" : "stroke-down fill-down",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
								x1: x,
								x2: x,
								y1: layout.yAt(b.h),
								y2: layout.yAt(b.l),
								strokeWidth: "1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: x - layout.candleW / 2,
								y: y1,
								width: layout.candleW,
								height: Math.max(1, y2 - y1)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: x - layout.candleW / 2,
								y: layout.h - layout.padB - vh,
								width: layout.candleW,
								height: vh,
								className: "opacity-35"
							})
						]
					}, b.t);
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: layout.s20,
					className: "fill-none stroke-accent",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: layout.s50,
					className: "fill-none stroke-muted",
					strokeWidth: "1"
				}),
				last && Number.isFinite(last) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: layout.padL,
						x2: layout.padL + layout.plotW,
						y1: layout.yAt(last),
						y2: layout.yAt(last),
						className: "stroke-accent",
						strokeDasharray: "3 3"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: layout.w - layout.padR,
						y: layout.yAt(last) - 8,
						width: layout.padR - 4,
						height: 16,
						className: "fill-accent"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: layout.w - layout.padR / 2 - 2,
						y: layout.yAt(last),
						textAnchor: "middle",
						dominantBaseline: "middle",
						className: "fill-bg font-mono",
						fontSize: "10",
						children: px(last)
					})
				] }) : null,
				bars.map((b, i) => i % layout.timeStep === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: layout.xAt(i),
					y: layout.h - layout.padB + 12,
					textAnchor: "middle",
					className: "fill-subtle font-mono",
					fontSize: "10",
					children: barTime(b.t, intraday)
				}, `t-${b.t}`) : null),
				hover !== null && bars[hover] ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: layout.xAt(hover),
					x2: layout.xAt(hover),
					y1: layout.padT,
					y2: layout.h - layout.padB,
					className: "stroke-fg opacity-30"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoverLabel, {
					x: layout.xAt(hover),
					maxW: layout.w - layout.padR,
					padL: layout.padL,
					text: `${barTime(bars[hover].t, intraday)}  O ${px(bars[hover].o)}  H ${px(bars[hover].h)}  L ${px(bars[hover].l)}  C ${px(bars[hover].c)}`
				})] }) : null
			]
		}) : bars.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-full items-center justify-center font-mono text-micro text-subtle",
			children: "No bars"
		}) : null
	});
}
function HoverLabel({ x, maxW, padL, text }) {
	const tw = Math.min(420, text.length * 6.2 + 12);
	const bx = Math.min(Math.max(padL, x - tw / 2), maxW - tw);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
		x: bx,
		y: 2,
		width: tw,
		height: 16,
		className: "fill-surface stroke-border"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
		x: bx + 6,
		y: 10,
		dominantBaseline: "middle",
		className: "fill-fg font-mono",
		fontSize: "10",
		children: text
	})] });
}
var TYPES = [
	"market",
	"limit",
	"stop"
];
var TIFS = [
	"day",
	"gtc",
	"ioc"
];
function OrderTicket() {
	const selected = useDesk((s) => s.selected);
	const quotes = useDesk((s) => s.quotes);
	const risk = useDesk((s) => s.risk);
	const halted = useDesk((s) => s.halted);
	const venue = useDesk((s) => s.venue);
	const { account, positions } = useLiveBook();
	const pos = positions.find((p) => p.symbol === selected);
	const q = quotes[selected];
	const [side, setSide] = (0, import_react.useState)("buy");
	const [type, setType] = (0, import_react.useState)("market");
	const [tif, setTif] = (0, import_react.useState)("day");
	const [qty, setQty] = (0, import_react.useState)(String(risk.defaultQty));
	const [limit, setLimit] = (0, import_react.useState)("");
	const [stop, setStop] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const last = q?.last ?? 0;
	const n = Number(qty) || 0;
	const estPx = type === "limit" && Number(limit) ? Number(limit) : last;
	const notional = n * estPx;
	const sized = (0, import_react.useMemo)(() => {
		if (!stop || !estPx) return null;
		const riskAmt = account.equity * .005;
		const dist = Math.abs(estPx - Number(stop));
		if (dist <= 0) return null;
		return Math.max(1, Math.floor(riskAmt / dist));
	}, [
		stop,
		estPx,
		account.equity
	]);
	async function submit() {
		if (!n || halted) return;
		if (venue === "alpaca-live") {
			if (!window.confirm(`LIVE ${side.toUpperCase()} ${n} ${selected}?`)) return;
		}
		setBusy(true);
		await placeOrder({
			symbol: selected,
			side,
			type,
			qty: n,
			tif,
			limitPrice: type === "limit" ? Number(limit) || void 0 : void 0,
			stopPrice: type === "stop" || stop ? Number(stop) || void 0 : void 0,
			source: "manual"
		});
		setBusy(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel$1, {
		title: "Ticket",
		bodyClassName: "overflow-auto p-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex w-full gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
					active: side === "buy",
					tone: "up",
					onClick: () => setSide("buy"),
					children: "Buy"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
					active: side === "sell",
					tone: "down",
					onClick: () => setSide("sell"),
					children: "Sell"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex w-full gap-1",
				children: TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
					active: type === t,
					onClick: () => setType(t),
					children: t === "market" ? "Mkt" : t === "limit" ? "Lmt" : "Stp"
				}, t))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-3 block font-mono text-micro tracking-widest text-subtle uppercase",
				children: ["Qty", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: qty,
					onChange: (e) => setQty(e.target.value),
					inputMode: "decimal",
					className: "mt-1"
				})]
			}),
			type === "limit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-2 block font-mono text-micro tracking-widest text-subtle uppercase",
				children: ["Limit", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: limit,
					onChange: (e) => setLimit(e.target.value),
					inputMode: "decimal",
					placeholder: last ? px(last) : "",
					className: "mt-1"
				})]
			}) : null,
			type === "stop" || type === "limit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-2 block font-mono text-micro tracking-widest text-subtle uppercase",
				children: ["Stop", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: stop,
					onChange: (e) => setStop(e.target.value),
					inputMode: "decimal",
					className: "mt-1"
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex gap-1",
				children: TIFS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Seg, {
					active: tif === t,
					onClick: () => setTif(t),
					children: t
				}, t))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 space-y-1 font-mono text-2xs tabular-nums text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Last",
						v: last ? px(last) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Est",
						v: notional ? money(notional) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "BP",
						v: money(account.buyingPower, true)
					}),
					pos ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "Pos",
						v: String(pos.qty)
					}) : null,
					sized ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "text-accent",
						onClick: () => setQty(String(sized)),
						children: [
							"Size to 50 bps risk: ",
							sized,
							" sh"
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: side === "buy" ? "buy" : "sell",
				size: "lg",
				className: "mt-3 w-full",
				disabled: busy || halted || n <= 0,
				onClick: () => void submit(),
				children: halted ? "Halted" : `${side} ${n || ""} ${selected}`
			}),
			pos ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				size: "lg",
				className: "mt-1 w-full",
				disabled: halted,
				onClick: () => void flatten(selected),
				children: ["Flatten ", selected]
			}) : null
		]
	});
}
function Seg({ active, onClick, children, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: cn("h-8 flex-1 border font-mono text-micro tracking-widest uppercase", active && tone === "up" && "border-up bg-up/15 text-up", active && tone === "down" && "border-down bg-down/15 text-down", active && !tone && "border-accent bg-accent/10 text-accent", !active && "border-border text-muted hover:text-fg"),
		children
	});
}
function Row({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-subtle",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-fg",
			children: v
		})]
	});
}
function Blotter() {
	const [tab, setTab] = (0, import_react.useState)("pos");
	const { positions, orders } = useLiveBook();
	const setSelected = useDesk((s) => s.setSelected);
	const working = orders.filter((o) => [
		"new",
		"accepted",
		"partially_filled"
	].includes(o.status));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel$1, {
		title: "Blotter",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: cn("font-mono text-micro tracking-widest uppercase", tab === "pos" ? "text-accent" : "text-subtle"),
				onClick: () => setTab("pos"),
				children: ["Pos ", positions.length]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: cn("font-mono text-micro tracking-widest uppercase", tab === "ord" ? "text-accent" : "text-subtle"),
				onClick: () => setTab("ord"),
				children: ["Ord ", working.length]
			})]
		}),
		children: tab === "pos" ? positions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: "No open risk" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full font-mono text-2xs tabular-nums",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-left font-medium",
						children: "Sym"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-right font-medium",
						children: "Qty"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "hidden px-2 py-1 text-right font-medium sm:table-cell",
						children: "Avg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-right font-medium",
						children: "P&L"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-2 py-1 text-right font-medium" })
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: positions.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "cursor-pointer border-t border-border/60 hover:bg-elevated",
				onClick: () => setSelected(p.symbol),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-fg",
						children: p.symbol
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-right",
						children: qty(p.qty)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "hidden px-2 py-1.5 text-right text-muted sm:table-cell",
						children: px(p.avgPrice)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: cn("px-2 py-1.5 text-right", signClass(p.unrealizedPl)),
						children: [
							signedMoney(p.unrealizedPl),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-micro",
								children: pct(p.unrealizedPlPct)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-right",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-micro text-muted hover:text-down",
							onClick: (e) => {
								e.stopPropagation();
								flatten(p.symbol);
							},
							children: "X"
						})
					})
				]
			}, p.symbol)) })]
		}) : orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { text: "No orders this session" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full font-mono text-2xs tabular-nums",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "sticky top-0 bg-surface text-micro tracking-widest text-subtle uppercase",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-left font-medium",
						children: "Sym"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-left font-medium",
						children: "Side"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-right font-medium",
						children: "Qty"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-2 py-1 text-left font-medium",
						children: "St"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-2 py-1 text-right font-medium" })
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: orders.slice(0, 40).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-t border-border/60",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-fg",
						children: o.symbol
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: cn("px-2 py-1.5 uppercase", o.side === "buy" ? "text-up" : "text-down"),
						children: o.side
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-right",
						children: qty(o.qty)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-muted",
						children: o.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-2 py-1.5 text-right",
						children: [
							"new",
							"accepted",
							"partially_filled"
						].includes(o.status) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => void cancelOrder(o.id),
							children: "Cxl"
						}) : null
					})
				]
			}, o.id)) })]
		})
	});
}
function Empty({ text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-full items-center justify-center px-4 font-mono text-micro tracking-widest text-subtle uppercase",
		children: text
	});
}
var KIND = {
	cmd: "text-accent",
	fill: "text-up",
	signal: "text-accent",
	sys: "text-muted",
	err: "text-down",
	ai: "text-fg"
};
function BotConsole() {
	const log = useDesk((s) => s.botLog);
	const halted = useDesk((s) => s.halted);
	const [text, setText] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const input = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [log.length]);
	(0, import_react.useEffect)(() => {
		function onKey(e) {
			if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
				e.preventDefault();
				input.current?.focus();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	async function send() {
		const v = text.trim();
		if (!v || busy) return;
		setText("");
		setBusy(true);
		await runConsole(v);
		setBusy(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel$1, {
		title: halted ? "Bot · Halted" : "Bot",
		bodyClassName: "flex min-h-0 flex-col overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: scroller,
			className: "min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-2xs leading-5",
			children: log.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 text-subtle tabular-nums",
					children: clockTime(line.t).slice(0, 8)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("whitespace-pre-wrap break-words", KIND[line.kind] ?? "text-fg"),
					children: line.kind === "cmd" ? `› ${line.text}` : line.text
				})]
			}, line.id))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "flex h-11 shrink-0 items-center gap-2 border-t border-border px-2 md:h-9",
			onSubmit: (e) => {
				e.preventDefault();
				send();
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-accent",
					children: "›"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: input,
					value: text,
					onChange: (e) => setText(e.target.value),
					placeholder: "BUY 10 NVDA  ·  THESIS AAPL  ·  HALT",
					className: "h-full min-w-0 flex-1 bg-transparent font-mono text-xs text-fg outline-none placeholder:text-subtle",
					autoCapitalize: "off",
					autoComplete: "off",
					spellCheck: false
				}),
				busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "console-cursor h-3 w-1.5 bg-accent" }) : null
			]
		})]
	});
}
function StrategyLab() {
	const strategies = useDesk((s) => s.strategies);
	const bars = useDesk((s) => s.bars);
	const barsSymbol = useDesk((s) => s.barsSymbol);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel$1, {
		title: "Algos",
		bodyClassName: "overflow-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "divide-y divide-border",
			children: strategies.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyRow, {
				st,
				bars: st.symbol === barsSymbol ? bars : []
			}, st.id))
		})
	});
}
function StrategyRow({ st, bars }) {
	const patch = useDesk((s) => s.patchStrategy);
	const setSelected = useDesk((s) => s.setSelected);
	const meta = KIND_META[st.kind];
	const stats = (0, import_react.useMemo)(() => {
		if (bars.length < 40) return null;
		return backtest(st.kind, st.params, bars);
	}, [
		bars,
		st.kind,
		st.params
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "px-2 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "min-w-0 text-left",
				onClick: () => setSelected(st.symbol),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "font-mono text-2xs tracking-wide text-fg",
					children: [
						st.name,
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-accent",
							children: st.symbol
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate font-mono text-micro text-muted",
					children: st.note || meta.blurb
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: st.armed ? "buy" : "outline",
				onClick: () => patch(st.id, {
					armed: !st.armed,
					lastFiredAt: 0
				}),
				children: st.armed ? "Armed" : "Arm"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-1 flex flex-wrap gap-2 font-mono text-micro tabular-nums text-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["qty ", st.qty] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: st.lastSignal === "buy" ? "text-up" : st.lastSignal === "sell" ? "text-down" : "",
					children: ["sig ", st.lastSignal]
				}),
				stats ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [stats.trades, " tr"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"win ",
						stats.winRate.toFixed(0),
						"%"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: signClass(stats.netPct),
						children: pct(stats.netPct)
					})
				] }) : null
			]
		})]
	});
}
var Dialog = Dialog$1;
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-bg/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed top-1/2 left-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 border border-border bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_8%,transparent)]", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute top-3 right-3 text-muted hover:text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		})]
	})] });
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-mono text-xs font-medium tracking-widest text-accent uppercase", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("mt-1 text-xs text-muted", className),
		...props
	});
}
var VENUES = [
	{
		id: "sim",
		label: "Simulation",
		hint: "Local blotter. Yahoo delayed tape."
	},
	{
		id: "alpaca-paper",
		label: "Alpaca Paper",
		hint: "Paper orders + Alpaca IEX tape."
	},
	{
		id: "alpaca-live",
		label: "Alpaca Live",
		hint: "Real capital. Same IEX tape as paper."
	}
];
var TAPE_LABEL = {
	alpaca: "Alpaca IEX",
	yahoo: "Yahoo Finance",
	mixed: "Alpaca IEX + Yahoo fill",
	seed: "Offline seed"
};
function SettingsDialog() {
	const open = useDesk((s) => s.settingsOpen);
	const setOpen = useDesk((s) => s.setSettingsOpen);
	const venue = useDesk((s) => s.venue);
	const creds = useDesk((s) => s.creds);
	const risk = useDesk((s) => s.risk);
	const setRisk = useDesk((s) => s.setRisk);
	const connectError = useDesk((s) => s.connectError);
	const resetSim = useDesk((s) => s.resetSim);
	const tapeSource = useDesk((s) => s.tapeSource);
	const barsSource = useDesk((s) => s.barsSource);
	const [draftVenue, setDraftVenue] = (0, import_react.useState)(venue);
	const [keyId, setKeyId] = (0, import_react.useState)(creds?.keyId ?? "");
	const [secret, setSecret] = (0, import_react.useState)(creds?.secret ?? "");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	async function save() {
		setBusy(true);
		setMsg(null);
		const res = await connectAlpaca(draftVenue, keyId, secret);
		setBusy(false);
		if (res.ok) setMsg(draftVenue === "sim" ? "Simulation desk armed." : "Alpaca connected.");
		else setMsg(res.error);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "w-[min(92vw,480px)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Desk settings" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Keys stay in this browser and are sent only to Alpaca via the app proxy. Never stored on the server." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 space-y-2",
					children: VENUES.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setDraftVenue(v.id),
						className: cn("flex w-full flex-col border px-3 py-2 text-left", draftVenue === v.id ? "border-accent bg-elevated" : "border-border hover:bg-elevated"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs text-fg",
							children: v.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-micro text-muted",
							children: v.hint
						})]
					}, v.id))
				}),
				draftVenue !== "sim" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block font-mono text-micro tracking-widest text-subtle uppercase",
						children: ["Key ID", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: keyId,
							onChange: (e) => setKeyId(e.target.value),
							className: "mt-1",
							autoComplete: "off"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block font-mono text-micro tracking-widest text-subtle uppercase",
						children: ["Secret", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: secret,
							onChange: (e) => setSecret(e.target.value),
							className: "mt-1",
							autoComplete: "off"
						})]
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 border border-border bg-elevated px-3 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-micro tracking-widest text-subtle uppercase",
							children: "Market data"
						}),
						draftVenue === "sim" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-mono text-2xs leading-relaxed text-muted",
							children: "Quotes and candles from Yahoo Finance (delayed). Book is the local $100k sim. No keys."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-mono text-2xs leading-relaxed text-muted",
							children: "Same Alpaca key pair drives both APIs. Tape and candles from data.alpaca.markets (IEX real-time on free keys; SIP if you subscribe). Account, positions, and orders from the paper or live trading host. Yahoo fills any missed snapshot. REST poll — quotes 8s, book 15s."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-mono text-micro tracking-widest text-subtle uppercase",
							children: [
								"Live tape ",
								TAPE_LABEL[tapeSource],
								" · bars ",
								barsSource === "alpaca" ? "IEX" : barsSource === "yahoo" ? "YH" : "SEED"
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block font-mono text-micro tracking-widest text-subtle uppercase",
						children: ["Max day loss %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: String(risk.maxDailyLossPct),
							onChange: (e) => setRisk({ maxDailyLossPct: Number(e.target.value) || 0 }),
							className: "mt-1",
							inputMode: "decimal"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block font-mono text-micro tracking-widest text-subtle uppercase",
						children: ["Max pos %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: String(risk.maxPositionPct),
							onChange: (e) => setRisk({ maxPositionPct: Number(e.target.value) || 0 }),
							className: "mt-1",
							inputMode: "decimal"
						})]
					})]
				}),
				msg || connectError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 font-mono text-2xs text-accent",
					children: msg ?? connectError
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => void save(),
						disabled: busy,
						size: "lg",
						className: "flex-1",
						children: busy ? "Connecting…" : "Save venue"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "lg",
						onClick: () => {
							resetSim();
							setDraftVenue("sim");
							setMsg("Sim book reset to $100,000.");
						},
						children: "Reset SIM"
					})]
				})
			]
		})
	});
}
function nativeFullscreenElement() {
	const doc = document;
	return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}
function isNativeFullscreen() {
	return Boolean(nativeFullscreenElement());
}
async function requestNativeFullscreen(el) {
	const node = el;
	try {
		if (node.requestFullscreen) {
			await node.requestFullscreen({ navigationUI: "hide" });
			return true;
		}
		if (node.webkitRequestFullscreen) {
			await node.webkitRequestFullscreen();
			return true;
		}
	} catch {
		return false;
	}
	return false;
}
async function exitNativeFullscreen() {
	if (!isNativeFullscreen()) return;
	const doc = document;
	const fn = document.exitFullscreen ?? doc.webkitExitFullscreen;
	if (!fn) return;
	try {
		await fn.call(document);
	} catch {}
}
function subscribeFullscreen(cb) {
	document.addEventListener("fullscreenchange", cb);
	document.addEventListener("webkitfullscreenchange", cb);
	return () => {
		document.removeEventListener("fullscreenchange", cb);
		document.removeEventListener("webkitfullscreenchange", cb);
	};
}
var TABS = [
	{
		id: "watch",
		label: "Tape"
	},
	{
		id: "chart",
		label: "Chart"
	},
	{
		id: "trade",
		label: "Trade"
	},
	{
		id: "book",
		label: "Book"
	},
	{
		id: "bot",
		label: "Bot"
	}
];
function isTypingTarget(el) {
	if (!(el instanceof HTMLElement)) return false;
	const tag = el.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}
function TerminalShell() {
	const desktop = useIsDesktop();
	const selected = useDesk((s) => s.selected);
	const barRange = useDesk((s) => s.barRange);
	const venue = useDesk((s) => s.venue);
	const mobileTab = useDesk((s) => s.mobileTab);
	const setMobileTab = useDesk((s) => s.setMobileTab);
	const immersive = useDesk((s) => s.immersive);
	const chartFocus = useDesk((s) => s.chartFocus);
	const rootRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const s = useDesk.getState();
		if (s.botLog.length === 0) s.log("sys", "NIGHTDESK online. Venue SIM. Type HELP or BUY 10 AAPL.");
		refreshQuotes();
		refreshBars();
		if (s.venue !== "sim" && s.creds) refreshAlpaca();
	}, []);
	(0, import_react.useEffect)(() => {
		refreshBars();
	}, [selected, barRange]);
	(0, import_react.useEffect)(() => {
		const q = window.setInterval(() => void refreshQuotes(), 8e3);
		const a = window.setInterval(() => {
			if (useDesk.getState().venue !== "sim") refreshAlpaca();
		}, 15e3);
		const s = window.setInterval(() => void tickStrategies(), 2e4);
		return () => {
			window.clearInterval(q);
			window.clearInterval(a);
			window.clearInterval(s);
		};
	}, [venue]);
	(0, import_react.useEffect)(() => {
		return subscribeFullscreen(() => {
			useDesk.getState().setImmersive(isNativeFullscreen());
		});
	}, []);
	(0, import_react.useEffect)(() => {
		const el = rootRef.current;
		if (!el) return;
		if (!immersive) {
			if (isNativeFullscreen()) exitNativeFullscreen();
			return;
		}
		if (isNativeFullscreen()) return;
		requestNativeFullscreen(el);
	}, [immersive]);
	(0, import_react.useEffect)(() => {
		function onKey(e) {
			if (e.key === "Escape") {
				const st = useDesk.getState();
				if (st.chartFocus) {
					st.setChartFocus(false);
					e.preventDefault();
					return;
				}
				if (st.immersive) {
					st.setImmersive(false);
					e.preventDefault();
				}
				return;
			}
			if (isTypingTarget(e.target)) return;
			if (e.key === "F" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault();
				useDesk.getState().setImmersive(!useDesk.getState().immersive);
				return;
			}
			if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
				e.preventDefault();
				useDesk.getState().toggleChartFocus();
			}
		}
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, []);
	const hideChrome = immersive || chartFocus;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: rootRef,
		className: cn("flex h-dvh flex-col overflow-hidden bg-bg text-fg", immersive && "desk-fs"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: "dark",
				position: "top-right",
				toastOptions: { className: "bg-elevated text-fg border-border font-mono text-xs rounded-none" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsDialog, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeaderBar, {}),
			hideChrome ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TickerTape, {}),
			desktop ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopLayout, { chartFocus }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileLayout, {
				tab: mobileTab,
				setTab: setMobileTab,
				chartFocus,
				hideNav: hideChrome
			})
		]
	});
}
function DesktopLayout({ chartFocus }) {
	const main = an({
		id: "nightdesk-desk",
		panelIds: ["top", "bottom"]
	});
	const top = an({
		id: "nightdesk-top",
		panelIds: [
			"watch",
			"chart",
			"ticket"
		]
	});
	const bot = an({
		id: "nightdesk-bot",
		panelIds: [
			"book",
			"algos",
			"console"
		]
	});
	if (chartFocus) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-0 flex-1",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleChart, {})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(qt, {
		orientation: "vertical",
		className: "min-h-0 flex-1",
		defaultLayout: main.defaultLayout,
		onLayoutChanged: main.onLayoutChanged,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
				id: "top",
				defaultSize: "64%",
				minSize: "30%",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(qt, {
					orientation: "horizontal",
					className: "h-full",
					defaultLayout: top.defaultLayout,
					onLayoutChanged: top.onLayoutChanged,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "watch",
							defaultSize: "20%",
							minSize: "14%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Watchlist, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "w-px bg-border" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "chart",
							defaultSize: "56%",
							minSize: "30%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full min-h-0 border-x border-border",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleChart, {})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "w-px bg-border" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "ticket",
							defaultSize: "24%",
							minSize: "18%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderTicket, {})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "h-px bg-border" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
				id: "bottom",
				defaultSize: "36%",
				minSize: "18%",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(qt, {
					orientation: "horizontal",
					className: "h-full",
					defaultLayout: bot.defaultLayout,
					onLayoutChanged: bot.onLayoutChanged,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "book",
							defaultSize: "34%",
							minSize: "18%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Blotter, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "w-px bg-border" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "algos",
							defaultSize: "24%",
							minSize: "16%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyLab, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "w-px bg-border" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "console",
							defaultSize: "42%",
							minSize: "22%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BotConsole, {})
						})
					]
				})
			})
		]
	});
}
function MobileLayout({ tab, setTab, chartFocus, hideNav }) {
	const active = chartFocus ? "chart" : tab;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-0 flex-1 overflow-hidden",
		children: [
			active === "watch" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Watchlist, {}) : null,
			active === "chart" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleChart, {}) : null,
			active === "trade" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderTicket, {}) : null,
			active === "book" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Blotter, {}) : null,
			active === "bot" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-full min-h-0 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-h-0 flex-[2]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BotConsole, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-h-0 flex-1 border-t border-border",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StrategyLab, {})
				})]
			}) : null
		]
	}), hideNav ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "grid h-14 shrink-0 grid-cols-5 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]",
		children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => setTab(t.id),
			className: cn("font-mono text-micro tracking-widest uppercase", tab === t.id ? "text-accent" : "text-muted"),
			children: t.label
		}, t.id))
	})] });
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerminalShell, {});
}
//#endregion
export { Home as component };

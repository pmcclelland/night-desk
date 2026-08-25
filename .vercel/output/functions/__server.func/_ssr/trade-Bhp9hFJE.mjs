import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/trade-Bhp9hFJE.js
function host(venue) {
	return venue === "alpaca-live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
}
function headers(creds) {
	return {
		"APCA-API-KEY-ID": creds.keyId,
		"APCA-API-SECRET-KEY": creds.secret,
		Accept: "application/json",
		"Content-Type": "application/json"
	};
}
async function alpaca(venue, creds, path, init) {
	const res = await fetch(`${host(venue)}${path}`, {
		...init,
		headers: {
			...headers(creds),
			...init?.headers
		}
	});
	const text = await res.text();
	if (!res.ok) {
		let msg = `Alpaca ${res.status}`;
		try {
			const j = JSON.parse(text);
			if (j.message) msg = j.message;
		} catch {
			if (text) msg = text.slice(0, 180);
		}
		throw new Error(msg);
	}
	if (!text) return {};
	return JSON.parse(text);
}
function mapAccount(a) {
	const equity = Number(a.equity);
	const lastEquity = Number(a.last_equity);
	const dayPl = equity - lastEquity;
	return {
		cash: Number(a.cash),
		equity,
		buyingPower: Number(a.buying_power),
		lastEquity,
		longValue: Number(a.long_market_value),
		shortValue: Number(a.short_market_value),
		dayPl,
		dayPlPct: lastEquity ? dayPl / lastEquity * 100 : 0,
		realizedToday: 0,
		status: a.status,
		patternDayTrader: a.pattern_day_trader,
		daytradeCount: a.daytrade_count,
		tradingBlocked: a.trading_blocked
	};
}
function mapPosition(p) {
	const qty = Number(p.qty);
	const last = Number(p.current_price);
	const avg = Number(p.avg_entry_price);
	return {
		symbol: p.symbol,
		qty,
		avgPrice: avg,
		last,
		marketValue: Number(p.market_value),
		costBasis: Number(p.cost_basis),
		unrealizedPl: Number(p.unrealized_pl),
		unrealizedPlPct: Number(p.unrealized_plpc) * 100,
		dayPl: Number(p.unrealized_intraday_pl)
	};
}
function mapOrder(o) {
	const type = o.type === "limit" || o.type === "stop" || o.type === "market" ? o.type : "market";
	const tif = o.time_in_force === "gtc" || o.time_in_force === "ioc" ? o.time_in_force : "day";
	const status = [
		"new",
		"accepted",
		"partially_filled",
		"filled",
		"canceled",
		"rejected",
		"expired"
	].includes(o.status) ? o.status : o.status === "pending_new" || o.status === "held" ? "accepted" : o.status === "done_for_day" ? "expired" : "new";
	return {
		id: o.id,
		clientOrderId: o.client_order_id,
		symbol: o.symbol,
		side: o.side,
		type,
		qty: Number(o.qty),
		filledQty: Number(o.filled_qty),
		limitPrice: o.limit_price ? Number(o.limit_price) : void 0,
		stopPrice: o.stop_price ? Number(o.stop_price) : void 0,
		tif,
		status,
		submittedAt: Date.parse(o.submitted_at),
		filledAt: o.filled_at ? Date.parse(o.filled_at) : void 0,
		filledAvgPrice: o.filled_avg_price ? Number(o.filled_avg_price) : void 0,
		source: "manual"
	};
}
var pingAlpaca_createServerFn_handler = createServerRpc({
	id: "f933f05ada1bd67cc5be98bb37eb9e6c711baf688c265aef5a347421b1596ef0",
	name: "pingAlpaca",
	filename: "src/lib/server/trade.ts"
}, (opts) => pingAlpaca.__executeServer(opts));
var pingAlpaca = createServerFn({ method: "POST" }).validator((input) => input).handler(pingAlpaca_createServerFn_handler, async ({ data }) => {
	try {
		return {
			ok: true,
			account: mapAccount(await alpaca(data.venue, data.creds, "/v2/account"))
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Connect failed"
		};
	}
});
var fetchAccountSnapshot_createServerFn_handler = createServerRpc({
	id: "cb7af05d17751ac33e65ab421cef3ef500b4ba6675ff32446fd2fd4c9411934b",
	name: "fetchAccountSnapshot",
	filename: "src/lib/server/trade.ts"
}, (opts) => fetchAccountSnapshot.__executeServer(opts));
var fetchAccountSnapshot = createServerFn({ method: "POST" }).validator((input) => input).handler(fetchAccountSnapshot_createServerFn_handler, async ({ data }) => {
	const [acct, positions, orders] = await Promise.all([
		alpaca(data.venue, data.creds, "/v2/account"),
		alpaca(data.venue, data.creds, "/v2/positions").catch(() => []),
		alpaca(data.venue, data.creds, "/v2/orders?status=all&limit=80&direction=desc").catch(() => [])
	]);
	return {
		account: mapAccount(acct),
		positions: positions.map(mapPosition),
		orders: orders.map(mapOrder)
	};
});
var submitAlpacaOrder_createServerFn_handler = createServerRpc({
	id: "883d59fd5489426b66674e567dab3abb00eb33eb9d8e1d1861ddc76696024601",
	name: "submitAlpacaOrder",
	filename: "src/lib/server/trade.ts"
}, (opts) => submitAlpacaOrder.__executeServer(opts));
var submitAlpacaOrder = createServerFn({ method: "POST" }).validator((input) => input).handler(submitAlpacaOrder_createServerFn_handler, async ({ data }) => {
	const body = {
		symbol: data.symbol,
		side: data.side,
		type: data.type,
		time_in_force: data.tif,
		qty: String(data.qty)
	};
	if (data.type === "limit" && data.limitPrice !== void 0) body.limit_price = String(data.limitPrice);
	if (data.type === "stop" && data.stopPrice !== void 0) body.stop_price = String(data.stopPrice);
	try {
		return {
			ok: true,
			order: mapOrder(await alpaca(data.venue, data.creds, "/v2/orders", {
				method: "POST",
				body: JSON.stringify(body)
			}))
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Order rejected"
		};
	}
});
var cancelAlpacaOrder_createServerFn_handler = createServerRpc({
	id: "34cfd8b1a350b921dddb403c14f73122f90926a989eb8b2b302c7115e63cc8c1",
	name: "cancelAlpacaOrder",
	filename: "src/lib/server/trade.ts"
}, (opts) => cancelAlpacaOrder.__executeServer(opts));
var cancelAlpacaOrder = createServerFn({ method: "POST" }).validator((input) => input).handler(cancelAlpacaOrder_createServerFn_handler, async ({ data }) => {
	try {
		await alpaca(data.venue, data.creds, `/v2/orders/${encodeURIComponent(data.id)}`, { method: "DELETE" });
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Cancel failed"
		};
	}
});
var cancelAllAlpaca_createServerFn_handler = createServerRpc({
	id: "12756aea4185bdcb4aa10017af01cc228665ce7bdef96776e2745b2116b55b89",
	name: "cancelAllAlpaca",
	filename: "src/lib/server/trade.ts"
}, (opts) => cancelAllAlpaca.__executeServer(opts));
var cancelAllAlpaca = createServerFn({ method: "POST" }).validator((input) => input).handler(cancelAllAlpaca_createServerFn_handler, async ({ data }) => {
	try {
		await alpaca(data.venue, data.creds, "/v2/orders", { method: "DELETE" });
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Cancel-all failed"
		};
	}
});
var closeAlpacaPosition_createServerFn_handler = createServerRpc({
	id: "a960e657c06549777807cf2fa131137507a123fcb65ed6947791d5ddc5429dc0",
	name: "closeAlpacaPosition",
	filename: "src/lib/server/trade.ts"
}, (opts) => closeAlpacaPosition.__executeServer(opts));
var closeAlpacaPosition = createServerFn({ method: "POST" }).validator((input) => input).handler(closeAlpacaPosition_createServerFn_handler, async ({ data }) => {
	try {
		await alpaca(data.venue, data.creds, `/v2/positions/${encodeURIComponent(data.symbol)}`, { method: "DELETE" });
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Flatten failed"
		};
	}
});
var closeAllAlpaca_createServerFn_handler = createServerRpc({
	id: "be9aa40168a8df26bd0056c8aa521ad6ac6f1efc283f676bb650b7aabf3e70ef",
	name: "closeAllAlpaca",
	filename: "src/lib/server/trade.ts"
}, (opts) => closeAllAlpaca.__executeServer(opts));
var closeAllAlpaca = createServerFn({ method: "POST" }).validator((input) => input).handler(closeAllAlpaca_createServerFn_handler, async ({ data }) => {
	try {
		await alpaca(data.venue, data.creds, "/v2/positions", { method: "DELETE" });
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Flatten-all failed"
		};
	}
});
var fetchEquityHistory_createServerFn_handler = createServerRpc({
	id: "a38db775eac05c9beaaaf3f87230f6211ff85a0f9480d31ecd904ca58cde431d",
	name: "fetchEquityHistory",
	filename: "src/lib/server/trade.ts"
}, (opts) => fetchEquityHistory.__executeServer(opts));
var fetchEquityHistory = createServerFn({ method: "POST" }).validator((input) => input).handler(fetchEquityHistory_createServerFn_handler, async ({ data }) => {
	try {
		const body = await alpaca(data.venue, data.creds, "/v2/account/portfolio/history?period=1M&timeframe=1D");
		const pts = [];
		for (let i = 0; i < (body.timestamp?.length ?? 0); i++) {
			const v = body.equity?.[i];
			const t = body.timestamp[i];
			if (typeof v === "number" && typeof t === "number") pts.push({
				t: t * 1e3,
				v
			});
		}
		return pts;
	} catch {
		return [];
	}
});
//#endregion
export { cancelAllAlpaca_createServerFn_handler, cancelAlpacaOrder_createServerFn_handler, closeAllAlpaca_createServerFn_handler, closeAlpacaPosition_createServerFn_handler, fetchAccountSnapshot_createServerFn_handler, fetchEquityHistory_createServerFn_handler, pingAlpaca_createServerFn_handler, submitAlpacaOrder_createServerFn_handler };

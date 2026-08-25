//#region node_modules/.nitro/vite/services/ssr/assets/universe--yuFOVKq.js
var NAMES = {
	SPY: "S&P 500",
	QQQ: "Nasdaq 100",
	IWM: "Russell 2000",
	DIA: "Dow Jones",
	AAPL: "Apple",
	MSFT: "Microsoft",
	NVDA: "NVIDIA",
	AMZN: "Amazon",
	GOOGL: "Alphabet",
	META: "Meta",
	TSLA: "Tesla",
	AVGO: "Broadcom",
	JPM: "JPMorgan",
	GS: "Goldman Sachs",
	XOM: "Exxon Mobil",
	UNH: "UnitedHealth",
	AMD: "AMD",
	NFLX: "Netflix",
	COST: "Costco",
	GLD: "Gold Trust",
	TLT: "20Y Treasury",
	ARM: "Arm Holdings",
	PLTR: "Palantir",
	COIN: "Coinbase",
	BA: "Boeing",
	DIS: "Disney",
	NKE: "Nike",
	V: "Visa",
	MA: "Mastercard",
	HD: "Home Depot"
};
var DEFAULT_WATCHLIST = [
	"SPY",
	"QQQ",
	"IWM",
	"AAPL",
	"MSFT",
	"NVDA",
	"AMZN",
	"GOOGL",
	"META",
	"TSLA",
	"AVGO",
	"JPM",
	"AMD",
	"GLD",
	"TLT"
];
var SEED = {
	SPY: {
		last: 763.47,
		prev: 765.72,
		high: 765.22,
		low: 762.08,
		volume: 31916629
	},
	QQQ: {
		last: 706.32,
		prev: 713.44,
		high: 709.79,
		low: 702.7,
		volume: 37094975
	},
	IWM: {
		last: 297.97,
		prev: 299.96,
		high: 299.74,
		low: 297.4,
		volume: 12813758
	},
	DIA: {
		last: 533.65,
		prev: 532.22,
		high: 534.48,
		low: 531.86,
		volume: 4284127
	},
	AAPL: {
		last: 310.34,
		prev: 309.35,
		high: 313.36,
		low: 309.97,
		volume: 34379936
	},
	MSFT: {
		last: 487.31,
		prev: 483.24,
		high: 490.61,
		low: 481.86,
		volume: 16754809
	},
	NVDA: {
		last: 208.48,
		prev: 214.72,
		high: 215.59,
		low: 207.37,
		volume: 134405887
	},
	AMZN: {
		last: 262.07,
		prev: 258.63,
		high: 263.32,
		low: 259.05,
		volume: 27975466
	},
	GOOGL: {
		last: 348.06,
		prev: 344.82,
		high: 351.6,
		low: 342.5,
		volume: 26279090
	},
	META: {
		last: 559.02,
		prev: 549.9,
		high: 561.42,
		low: 546.3,
		volume: 12868199
	},
	TSLA: {
		last: 348.95,
		prev: 362.86,
		high: 363.24,
		low: 348.26,
		volume: 39022052
	},
	AVGO: {
		last: 358.76,
		prev: 368.45,
		high: 366.12,
		low: 358.71,
		volume: 18635761
	},
	JPM: {
		last: 356.39,
		prev: 351.58,
		high: 358.28,
		low: 352.82,
		volume: 4236267
	},
	GS: {
		last: 1036.28,
		prev: 1039.28,
		high: 1047.28,
		low: 1030.18,
		volume: 1986510
	},
	XOM: {
		last: 164.05,
		prev: 165.11,
		high: 165.22,
		low: 162.25,
		volume: 10341598
	},
	UNH: {
		last: 398.76,
		prev: 390.11,
		high: 399.58,
		low: 390.86,
		volume: 4680109
	},
	AMD: {
		last: 456.75,
		prev: 473.25,
		high: 468.14,
		low: 451.18,
		volume: 16521739
	},
	NFLX: {
		last: 80.01,
		prev: 79.59,
		high: 80.62,
		low: 79.02,
		volume: 20917627
	},
	COST: {
		last: 971.4,
		prev: 947.74,
		high: 974.5,
		low: 951.39,
		volume: 2202405
	},
	GLD: {
		last: 426.69,
		prev: 423.36,
		high: 429.42,
		low: 424.21,
		volume: 18706942
	},
	TLT: {
		last: 82.56,
		prev: 82.05,
		high: 82.88,
		low: 82.45,
		volume: 28999572
	},
	ARM: {
		last: 238.78,
		prev: 243.32,
		high: 240.25,
		low: 233.29,
		volume: 3303912
	},
	PLTR: {
		last: 175.89,
		prev: 179.94,
		high: 178.75,
		low: 171.31,
		volume: 35003354
	},
	COIN: {
		last: 179.48,
		prev: 186.49,
		high: 191.84,
		low: 178.52,
		volume: 13096337
	},
	BA: {
		last: 210.46,
		prev: 214.2,
		high: 213.31,
		low: 208.7,
		volume: 7055202
	},
	DIS: {
		last: 110.61,
		prev: 107.78,
		high: 111.87,
		low: 108.08,
		volume: 12059583
	},
	NKE: {
		last: 40.75,
		prev: 40.76,
		high: 41.34,
		low: 40.68,
		volume: 18808641
	},
	V: {
		last: 382.41,
		prev: 371.04,
		high: 383.43,
		low: 372.21,
		volume: 8469839
	},
	MA: {
		last: 599.86,
		prev: 580.63,
		high: 599.99,
		low: 584.22,
		volume: 3121031
	},
	HD: {
		last: 337.43,
		prev: 335.61,
		high: 342.22,
		low: 335.17,
		volume: 3289739
	}
};
var STARTING_CASH = 1e5;
var STARTER_LOTS = [
	{
		symbol: "AAPL",
		qty: 35,
		avg: 302
	},
	{
		symbol: "MSFT",
		qty: 18,
		avg: 492
	},
	{
		symbol: "NVDA",
		qty: 40,
		avg: 201
	},
	{
		symbol: "SPY",
		qty: 20,
		avg: 770
	},
	{
		symbol: "META",
		qty: 8,
		avg: 540
	},
	{
		symbol: "TSLA",
		qty: 12,
		avg: 355
	}
];
function nameOf(symbol) {
	return NAMES[symbol] ?? symbol;
}
function normalizeSymbol(raw) {
	return raw.trim().toUpperCase().replace(/\s+/g, "");
}
//#endregion
export { nameOf as a, STARTING_CASH as i, SEED as n, normalizeSymbol as o, STARTER_LOTS as r, DEFAULT_WATCHLIST as t };

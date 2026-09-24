# Book performance / thesis view

Paul asked for one place to scan **how the book is doing** and **why each name is in it**. That is a second app mode, not a panel inside the trading desk.

Trading stays the six-panel desk. This view has its own layout and its own keys. Atelier owns color and type.

## 1. How it fits today

There is one operator screen today: `/` in `src/routes/index.tsx` renders `TerminalShell` (`src/components/terminal/shell.tsx`). Other file routes are `/login`, `/api/mcp`, `/api/auth/$` (`src/routeTree.gen.ts`). No pane registry, no dock, no split beyond the desk itself.

Desktop is two `react-resizable-panels` rows, ids hard-coded in `shell.tsx`:

- top: `watch` / `chart` / `ticket`
- bottom: `book` (Blotter) / `algos` / `console`

Layouts persist via `useDefaultLayout` (`nightdesk-desk`, `nightdesk-top`, `nightdesk-bot`). `F` replaces the desk with the chart; it is not a second mode.

Below 768px (`useIsDesktop` in `src/lib/hooks.ts`) those panels become five tabs: Tape, Chart, Trade, Book, Bot. Book is the blotter, not a review.

Do **not** add a sixth tab, a fourth bottom panel, or a thesis column on the blotter. `docs/nightdesk-architecture.html` already calls `/` the single trading terminal.

### Routing

Add a pathless layout that owns the session, then two child routes:

| File | URL | Body |
| --- | --- | --- |
| `src/routes/_desk.tsx` | (none) | Auth gate (today in `index.tsx`), hydrate, SNAP/LIVE loop, `HeaderBar`, `SettingsDialog` |
| `src/routes/_desk/index.tsx` | `/` | Current desktop/mobile trading layouts |
| `src/routes/_desk/review.tsx` | `/review` | Performance / thesis view |

`/login` stays outside. Login already `Navigate`s to `/` (`src/routes/login.tsx`).

The loop and hydrate live in `TerminalShell` today (`startLiveLoop` / `stopLiveLoop` in `src/lib/live-loop.ts`). If `/review` unmounted the shell, SNAP/LIVE would die. Hoist that work so a route change does not refetch or poll.

**Carries across** (already in `useDesk`, `src/lib/store.ts`): `selected`, venue, `liveFeed`, guest overlay, quotes, SIM/Alpaca book, settings.

**Shared:** `AuthProvider` (`src/routes/__root.tsx`), owner gate, `useDesk`, header EQ/CASH/DAY, settings, `refreshQuotes` / `refreshAlpaca` / `hydrateDesk`, SNAP/LIVE, guest SIM lock (`src/lib/tape-gate.ts`).

**Separate:** body layout, review keyboard, no tape / chart / ticket / algos / bot on `/review`. Jumping a name calls `selectSymbol` (`src/lib/desk-sync.ts`) and navigates to `/`.

## 2. Layout sketch

Desktop (~768+): summary strip, then one row per open position. Thesis is a column; a selected row can expand.

```
+------------------------------------------------------------------+
| NIGHTDESK   TRADE | REVIEW    EQ  CASH  DAY    [fs] [set] [op]   |
+------------------------------------------------------------------+
| BOOK  n names   unrl $ / %   day $ / %   realized today   cash   |
+------+-----+-----+--------+--------+--------+--------------------+
| SYM  | QTY | WGT | COST   | MKT    | DAY    | THESIS             |
| AAPL |  20 | 12% | 188.40 | 191.10 | +1.2%  | add on AI spend    |
| NVDA |  15 | 18% |  ...   |  ...   |  ...   |                    |
+------+-----+-----+--------+--------+--------+--------------------+
|  [expanded]  conviction  drivers  invalidation  target  reviewed |
+------------------------------------------------------------------+
```

Narrow: same route, not a trading tab. Summary stacks. Columns drop to SYM / P&L / a one-line thesis. Expand for the rest. No horizontal scroll.

No colors or type here.

## 3. Data inventory

### Performance

| Metric | Status | Where |
| --- | --- | --- |
| qty, avg / cost, last, market value | available | `Position` in `src/lib/types.ts`; SIM via `markPositions` (`src/lib/sim.ts`); Alpaca via `mapPosition` (`src/lib/server/alpaca.ts`) |
| unrealized $ / % | available | `Position.unrealizedPl`, `unrealizedPlPct` |
| day P&L $ | available | `Position.dayPl` |
| day P&L % | derivable | from `dayPl` and prior close / market value |
| weight | derivable | `marketValue / account.equity` (`useLiveBook` / `selectAccount`) |
| book EQ, cash, day $ / % | available | `Account`; header already shows them (`header-bar.tsx`) |
| realized today (book) | available on SIM; stub on Alpaca | `SimBook.realizedToday`; `mapAccount` sets `realizedToday: 0` |
| realized vs unrealized per name | missing | fills exist (`sim.orders`, `desk_events` writes in `desk-ledger.ts`) but nothing reads a closed-lot book |
| equity curve | partial | SIM: `sim.equityHistory` (last 240 quote ticks, starter is one point). Alpaca: `fetchEquityHistory` (`trade.ts` → `/v2/account/portfolio/history?period=1M&timeframe=1D`) is unused by the UI |
| drawdown, win rate | missing for the book | only strategy backtests (`BacktestStats` in `strategies.ts`) |

Blotter (`blotter.tsx`) shows SYM, qty, avg, unrealized. It does not show weight, day P&L, or thesis.

v1 of this view: open positions + book strip from `useLiveBook`. No invented curve, win rate, or closed-lot P&L.

### Thesis

There is no thesis table and no conviction field.

MCP `thesis` (`src/lib/server/mcp.ts`) and `THESIS NVDA` / the chart **Thesis** button run `localThesis` (`src/lib/indicators.ts`): one SMA/RSI sentence. Server path (`desk-engine.ts`) and client path (`runThesis` in `sync.ts`) both log that string as `bot_log` kind `ai`. That journal lives in `desk_state.bot_log` (`migrations/0002_desk.sql`). It is a tape read, not “why this is held.”

`desk_kv` (`migrations/0003_desk_kv.sql`, helpers in `src/lib/server/desk-kv.ts`) is the unused JSON store the architecture note reserved for notes. No caller. Owner-only (`requireOwner`).

Use that. `ns = thesis`, `key =` lowercase symbol. Do not stuff theses into `desk_state` or scrape `bot_log`.

Current generated fields: `symbol`, last, trend, SMA20 stretch, RSI, 20-bar range — all ephemeral text.

Add for the stored thesis: `reasoning`, `conviction`, `drivers`, `invalidation`, `target`, `asOf`, `lastReviewed`.

Guest has no `desk_kv`. Guest notes stay in the persisted zustand blob, local to that browser, never Paul’s Alpaca, never the owner row.

```ts
type Conviction = "high" | "medium" | "low";

interface BookThesis {
  symbol: string;
  reasoning: string;
  conviction: Conviction | null;
  drivers: string[];
  invalidation: string | null;
  target: number | null;
  asOf: string;
  lastReviewed: string;
}

interface BookPositionRow {
  symbol: string;
  qty: number;
  avgPrice: number;
  last: number;
  marketValue: number;
  costBasis: number;
  weightPct: number;
  dayPl: number;
  dayPlPct: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  thesis: BookThesis | null;
}

interface BookPerformanceView {
  venue: "sim" | "alpaca-paper" | "alpaca-live";
  guest: boolean;
  liveFeed: boolean;
  asOf: number;
  equity: number;
  cash: number;
  dayPl: number;
  dayPlPct: number;
  realizedToday: number;
  unrealizedPl: number;
  positions: BookPositionRow[];
}
```

Empty thesis is empty. Do not fill from `localThesis`.

## 4. Modes

**Guest SIM** (`guestDemo`, `sessionVenue` / `sessionLiveFeed` in `tape-gate.ts`): forced SIM, seeded book (`createStarterBook`), public Yahoo via `fetchPublicQuotes`. Tape is forced LIVE. Never call Alpaca, `pullDesk`, or owner `desk_kv`.

**Signed-in book:** stored venue (SIM / paper / live). Positions from `selectPositions`. SNAP default (`liveFeed: false` in `store.ts`).

**SNAP:** one forced fetch on session boot (`refreshQuotes({ force: true })`, hydrate, Alpaca book if not SIM). After that, `tapePollAllowed` blocks polls. `/review` reads the store. No new interval, no visibility refetch that bypasses SNAP.

**LIVE:** existing loop stays on the layout (quotes 8s, Alpaca 15s). Review just re-renders `useLiveBook`.

A SNAP → LIVE flip in settings applies on both routes because the loop is shared.

## 5. Build plan

1. **Session hoist + `/review` shell.** Pathless `_desk` layout; move auth gate and the loop out of `TerminalShell`. Empty review body. Verify: `/` still desks; `/review` is its own screen; SNAP does not start a loop after boot; guest still public Yahoo; login still lands on `/`.

2. **Mode toggle.** `P` (see open questions) swaps `/` ↔ `/review`. Header TRADE | REVIEW. Verify: one keypress each way; ignored in INPUT/TEXTAREA/SELECT/contenteditable (same `isTypingTarget` as `F`); no-op on `/login`; `F` / `Shift+F` / `/` unchanged on the desk; `Shift+F` still works on `/review`.

3. **Performance rows.** Join `useLiveBook` into `BookPerformanceView`. Summary + rows. Verify: guest starter lots; signed-in SNAP shows the last snapshot only (network quiet after boot); LIVE marks when quotes move; narrow width stacks without a trading tab.

4. **Thesis + review keys.** Owner: `listDeskKv` / `putDeskKv` `ns=thesis`. Guest: local persist. Inline edit on `/review`. Keys below. Verify: owner thesis survives reload; guest thesis does not hit Neon; `G` lands on `/` with that `selected`; empty names stay empty.

## 6. Open questions for Paul

1. **Mode shortcut.** Existing keys: `F` chart focus, `Shift+F` fullscreen, `Esc` exit those, `/` focus bot (`shell.tsx`, `bot-console.tsx`). `P` is free. Recommend **`P`** to toggle `/` ↔ `/review`. Ignore when focus is in an input (same rule as `F`).

2. **Visible mode switcher.** Recommend **yes**: TRADE | REVIEW in `HeaderBar` next to the word NIGHTDESK, so the mode is obvious without the key.

3. **Which metrics on the row.** Recommend **weight, day P&L, total (unrealized) P&L, thesis one-liner.** Qty and cost stay. Skip curve / win rate / benchmark until asked.

4. **Benchmark.** Recommend **none** in v1. No SPY series is loaded for the book.

5. **Time window.** Recommend **today / this snapshot only** — the numbers we already have. No 1W/1M book window without new storage or wiring `fetchEquityHistory`.

6. **Where thesis is edited.** Recommend **inline on `/review`**, owner-only persist. Bot `THESIS` and the chart button stay the indicator one-liner; they do not write `desk_kv`.

7. **Closed positions.** Recommend **omit in v1.** SIM drops flat names; Alpaca `/v2/positions` is open risk; `desk_events` is write-only fills.

8. **In-view keys on `/review`.** Recommend **`j`/`k` or arrows** move the row, **Enter** expand/collapse thesis, **`G`** (`selectSymbol` + `/`), **`P`** back to the desk. `Esc` collapses, then (second press) returns to `/`.

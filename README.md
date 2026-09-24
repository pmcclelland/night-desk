# NIGHTDESK

**Algorithmic trading terminal.**

Open [nightdesk.pmcclel.land](https://nightdesk.pmcclel.land).

A dark-room desk for watching tape, charting, sending orders, and arming simple algos. Starts in **SIM** with a seeded book and delayed quotes. Point it at **Alpaca paper** or **Alpaca live** from settings when you have keys.

![NIGHTDESK](public/og.jpg)

![Desk](screenshots/qa-desktop.png)

## Desk

- **SNAP | LIVE** — in Desk settings → Market data. SNAP (default) takes one tape snapshot on load and stays quiet; LIVE keeps the existing quote / book / algo poll
- **Tape** — scrolling last/change for the watchlist
- **Watch** — last, change, volume; click a symbol to load the chart
- **Chart** — candles with SMA overlays, or a close-price line; 1D / 5D / 1M / 6M / 1Y
- **Ticket** — market, limit, stop; DAY / GTC / IOC; flatten
- **Blotter** — positions and working orders
- **Algos** — SMA cross, mean reversion, breakout, momentum; arm or disarm per symbol
- **Bot** — floor-broker commands, or natural language to Grok

On a phone the same panels are tabs: Tape, Chart, Trade, Book, Bot.

## Venues

| Venue | What it does |
| --- | --- |
| Simulation | Local blotter, Yahoo delayed tape, seed quotes if the tape is down |
| Alpaca Paper | Paper orders + Alpaca IEX tape |
| Alpaca Live | Real capital, same IEX tape as paper |

API keys stay in this browser and go only to Alpaca through the app proxy. They are not stored on the server. Kill in the header (or `HALT`) stops algos and new orders.

## Bot

Type in the bot console. Commands:

```
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
```

Anything that is not a command is sent to Grok as a terse desk copilot. **Thesis** on the chart header asks for a short take on the selected symbol.

## Shortcuts

| Key | Action |
| --- | --- |
| `P` | Toggle trade / review |
| `F` | Focus / unfocus the chart |
| `Shift+F` | Fullscreen the desk |
| `Esc` | Exit focus or fullscreen |
| `/` | Focus the bot |
| Review: `j`/`k` or arrows | Move between names |
| Review: `Enter` | Expand / collapse thesis |
| Review: `r` | Cycle curve range (1W / 1M / 3M) |
| Review: `G` | Open that name on the trade desk |

On `/review`, type a thesis on a name and Save. Owner rows go to `desk_kv` (`ns=thesis`). Guest mode keeps them in this browser only and never writes the desk. The chart **Thesis** button is still the SMA/RSI one-liner, not the book thesis. Brain signals are read-only from the trader project; if that feed is unset, the panel says `signals not connected`. The book curve is 1W / 1M / 3M vs SPY (`r` cycles). Guest / SIM builds it from Yahoo closes and labels it SIM; the signed-in owner book uses Alpaca portfolio history.

## Stack

- [React 19](https://react.dev/) + [TanStack Start](https://tanstack.com/start) / Router
- [Vite](https://vite.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
- Zustand (desk state, persisted in the browser)
- Alpaca REST through server functions; Yahoo as tape fallback
- Grok (xAI) for thesis and unmatched bot text

No accounts. SIM is local. Alpaca keys never leave the client except on proxied order/quote calls.

## Development

Requires **Node 22** and npm.

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Local server with HMR |
| `npm run build` | Production bundle (Vercel) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Node tests |
| `npm run lint` | ESLint |

## License

Private. All rights reserved.

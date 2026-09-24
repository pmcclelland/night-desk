import { createServerFn } from "@tanstack/react-start";
import {
  connectedSignals,
  disconnectedSignals,
  latestSignalPerTicker,
  parseSignalRow,
  signalsDenied,
  type SignalsSnapshot,
} from "@/lib/signals";

const SELECT =
  "id,schema_version,as_of,mechanism_slug,ticker,direction,conviction_label,conviction_score,status,sector_theme,thesis_summary,data,synced_at";

function traderConfig() {
  const url = process.env.TRADER_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = process.env.TRADER_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function tickerFilter(tickers: string[]) {
  const clean = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  return clean;
}

export async function loadBrainSignals(tickers: string[]): Promise<SignalsSnapshot> {
  const cfg = traderConfig();
  if (!cfg) return disconnectedSignals();

  const wanted = tickerFilter(tickers);
  if (wanted.length === 0) return connectedSignals({});

  const params = new URLSearchParams({
    select: SELECT,
    ticker: `in.(${wanted.join(",")})`,
    order: "as_of.desc",
  });

  try {
    const res = await fetch(`${cfg.url}/rest/v1/signals?${params.toString()}`, {
      method: "GET",
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      if (signalsDenied(res.status) || res.status >= 400) return disconnectedSignals();
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return disconnectedSignals();
    const rows = body.map(parseSignalRow).filter((row): row is NonNullable<typeof row> => row !== null);
    return connectedSignals(latestSignalPerTicker(rows));
  } catch {
    return disconnectedSignals();
  }
}

export const fetchBrainSignals = createServerFn({ method: "POST" })
  .validator((input: { tickers: string[] }) => input)
  .handler(async ({ data }) => loadBrainSignals(data.tickers));

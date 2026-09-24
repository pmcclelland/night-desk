export const SIGNALS_NOT_CONNECTED = "signals not connected";

export type BrainSignal = {
  id: string;
  schemaVersion: string | null;
  asOf: string | null;
  mechanismSlug: string | null;
  ticker: string;
  direction: string | null;
  convictionLabel: string | null;
  convictionScore: number | null;
  status: string | null;
  sectorTheme: string | null;
  thesisSummary: string | null;
  syncedAt: string | null;
};

export type SignalsSnapshot =
  | { status: "disconnected"; message: typeof SIGNALS_NOT_CONNECTED; byTicker: Record<string, BrainSignal> }
  | { status: "connected"; message: null; byTicker: Record<string, BrainSignal> };

export function disconnectedSignals(): SignalsSnapshot {
  return { status: "disconnected", message: SIGNALS_NOT_CONNECTED, byTicker: {} };
}

export function connectedSignals(byTicker: Record<string, BrainSignal>): SignalsSnapshot {
  return { status: "connected", message: null, byTicker };
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseSignalRow(row: unknown): BrainSignal | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const ticker = asOptionalString(r.ticker)?.toUpperCase();
  const id = asOptionalString(r.id);
  if (!ticker || !id) return null;
  return {
    id,
    schemaVersion: asOptionalString(r.schema_version) ?? asOptionalString(r.schemaVersion),
    asOf: asOptionalString(r.as_of) ?? asOptionalString(r.asOf),
    mechanismSlug: asOptionalString(r.mechanism_slug) ?? asOptionalString(r.mechanismSlug),
    ticker,
    direction: asOptionalString(r.direction),
    convictionLabel: asOptionalString(r.conviction_label) ?? asOptionalString(r.convictionLabel),
    convictionScore: asOptionalNumber(r.conviction_score) ?? asOptionalNumber(r.convictionScore),
    status: asOptionalString(r.status),
    sectorTheme: asOptionalString(r.sector_theme) ?? asOptionalString(r.sectorTheme),
    thesisSummary: asOptionalString(r.thesis_summary) ?? asOptionalString(r.thesisSummary),
    syncedAt: asOptionalString(r.synced_at) ?? asOptionalString(r.syncedAt),
  };
}

export function latestSignalPerTicker(rows: BrainSignal[]): Record<string, BrainSignal> {
  const out: Record<string, BrainSignal> = {};
  for (const row of rows) {
    const prev = out[row.ticker];
    if (!prev) {
      out[row.ticker] = row;
      continue;
    }
    const prevTs = Date.parse(prev.asOf ?? prev.syncedAt ?? "");
    const nextTs = Date.parse(row.asOf ?? row.syncedAt ?? "");
    if (Number.isFinite(nextTs) && (!Number.isFinite(prevTs) || nextTs > prevTs)) {
      out[row.ticker] = row;
    }
  }
  return out;
}

export function signalsDenied(status: number) {
  return status === 401 || status === 403;
}

export const SIGNALS_NOT_CONNECTED = "signals not connected";

export const EVIDENCE_STATUSES = ["confirmed", "partial", "open"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const CHECKPOINT_KINDS = ["confirm", "break", "next", "other"] as const;
export type CheckpointKind = (typeof CHECKPOINT_KINDS)[number];

export type ChainStep = {
  step: number;
  claim: string;
  evidenceStatus: EvidenceStatus | null;
  keyQuote: string | null;
  sourceRef: string | null;
};

export type SignalCheckpoint = {
  kind: CheckpointKind;
  date: string | null;
  label: string | null;
  note: string | null;
};

export type BrainSignal = {
  id: string;
  schemaVersion: string | null;
  asOf: string | null;
  mechanismSlug: string | null;
  mechanismTitle: string | null;
  ticker: string;
  direction: string | null;
  convictionLabel: string | null;
  convictionScore: number | null;
  status: string | null;
  sectorTheme: string | null;
  thesisSummary: string | null;
  sourceRefs: string[];
  chain: ChainStep[];
  checkpoints: SignalCheckpoint[];
  contradictions: string[];
  syncedAt: string | null;
};

export type SignalsSnapshot =
  | {
      status: "disconnected";
      message: typeof SIGNALS_NOT_CONNECTED;
      byTicker: Record<string, BrainSignal>;
      allByTicker: Record<string, BrainSignal[]>;
    }
  | {
      status: "connected";
      message: null;
      byTicker: Record<string, BrainSignal>;
      allByTicker: Record<string, BrainSignal[]>;
    };

export function disconnectedSignals(): SignalsSnapshot {
  return {
    status: "disconnected",
    message: SIGNALS_NOT_CONNECTED,
    byTicker: {},
    allByTicker: {},
  };
}

export function connectedSignals(
  byTicker: Record<string, BrainSignal>,
  allByTicker: Record<string, BrainSignal[]> = groupSignalsByTicker(Object.values(byTicker)),
): SignalsSnapshot {
  return { status: "connected", message: null, byTicker, allByTicker };
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

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asOptionalString(item)).filter((item): item is string => Boolean(item));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parsePayload(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

function asEvidence(value: unknown): EvidenceStatus | null {
  const s = asOptionalString(value)?.toLowerCase();
  if (s === "confirmed" || s === "partial" || s === "open") return s;
  return null;
}

function asCheckpointKind(value: unknown): CheckpointKind | null {
  const s = asOptionalString(value)?.toLowerCase();
  if (s === "confirm" || s === "break" || s === "next" || s === "other") return s;
  return null;
}

export function parseChainSteps(raw: unknown): ChainStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: ChainStep[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const claim = asOptionalString(row.claim);
    if (!claim) continue;
    const step = asOptionalNumber(row.step) ?? steps.length + 1;
    steps.push({
      step,
      claim,
      evidenceStatus: asEvidence(row.evidence_status ?? row.evidenceStatus),
      keyQuote: asOptionalString(row.key_quote) ?? asOptionalString(row.keyQuote),
      sourceRef: asOptionalString(row.source_ref) ?? asOptionalString(row.sourceRef),
    });
  }
  return steps.sort((a, b) => a.step - b.step);
}

export function parseCheckpoints(raw: unknown): SignalCheckpoint[] {
  if (!Array.isArray(raw)) return [];
  const out: SignalCheckpoint[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const kind = asCheckpointKind(row.kind);
    if (!kind) continue;
    out.push({
      kind,
      date: asOptionalString(row.date),
      label: asOptionalString(row.label),
      note: asOptionalString(row.note),
    });
  }
  return out;
}

export function parseSignalRow(row: unknown): BrainSignal | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const ticker = asOptionalString(r.ticker)?.toUpperCase();
  const id = asOptionalString(r.id);
  if (!ticker || !id) return null;
  const data = parsePayload(r.data);
  const thesis = asRecord(data?.thesis);
  const provenance = asRecord(data?.provenance);
  const chain = parseChainSteps(thesis?.chain);
  const checkpoints = parseCheckpoints(data?.checkpoints);
  const thesisSummary =
    asOptionalString(r.thesis_summary) ??
    asOptionalString(r.thesisSummary) ??
    asOptionalString(thesis?.summary);
  return {
    id,
    schemaVersion: asOptionalString(r.schema_version) ?? asOptionalString(r.schemaVersion),
    asOf: asOptionalString(r.as_of) ?? asOptionalString(r.asOf) ?? asOptionalString(data?.as_of),
    mechanismSlug:
      asOptionalString(r.mechanism_slug) ??
      asOptionalString(r.mechanismSlug) ??
      asOptionalString(provenance?.mechanism_slug),
    mechanismTitle: asOptionalString(provenance?.mechanism_title) ?? asOptionalString(provenance?.mechanismTitle),
    ticker,
    direction: asOptionalString(r.direction) ?? asOptionalString(asRecord(data?.trade)?.direction),
    convictionLabel:
      asOptionalString(r.conviction_label) ??
      asOptionalString(r.convictionLabel) ??
      asOptionalString(asRecord(data?.conviction)?.label),
    convictionScore: asOptionalNumber(r.conviction_score) ?? asOptionalNumber(r.convictionScore),
    status: asOptionalString(r.status) ?? asOptionalString(asRecord(data?.lifecycle)?.status),
    sectorTheme: asOptionalString(r.sector_theme) ?? asOptionalString(r.sectorTheme),
    thesisSummary,
    sourceRefs: asStringList(provenance?.source_refs ?? provenance?.sourceRefs),
    chain,
    checkpoints,
    contradictions: asStringList(thesis?.contradictions),
    syncedAt: asOptionalString(r.synced_at) ?? asOptionalString(r.syncedAt),
  };
}

export function signalHasChain(row: BrainSignal) {
  return row.chain.length > 0;
}

export function firstTickerWithChain(
  tickers: string[],
  allByTicker: Record<string, BrainSignal[]>,
): string | null {
  for (const ticker of tickers) {
    if ((allByTicker[ticker] ?? []).some(signalHasChain)) return ticker;
  }
  return null;
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

export function groupSignalsByTicker(rows: BrainSignal[]): Record<string, BrainSignal[]> {
  const out: Record<string, BrainSignal[]> = {};
  for (const row of rows) {
    (out[row.ticker] ??= []).push(row);
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => {
      const bt = Date.parse(b.asOf ?? b.syncedAt ?? "");
      const at = Date.parse(a.asOf ?? a.syncedAt ?? "");
      const tb = Number.isFinite(bt) ? bt : 0;
      const ta = Number.isFinite(at) ? at : 0;
      if (tb !== ta) return tb - ta;
      return a.id.localeCompare(b.id);
    });
  }
  return out;
}

export function signalsDenied(status: number) {
  return status === 401 || status === 403;
}

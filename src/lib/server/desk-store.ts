import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { createStarterBook, type SimBook } from "@/lib/sim";
import { defaultStrategies } from "@/lib/strategies";
import { DEFAULT_WATCHLIST } from "@/lib/universe";
import type { BotLine, Creds, RiskSettings, StrategyInstance, Venue } from "@/lib/types";

export type DeskSnapshot = {
  venue: Venue;
  creds: Creds | null;
  watchlist: string[];
  selected: string;
  sim: SimBook;
  strategies: StrategyInstance[];
  botLog: BotLine[];
  risk: RiskSettings;
  halted: boolean;
  updatedAt: string;
};

function keyBuf() {
  const seed = process.env.BETTER_AUTH_SECRET || "nightdesk-preview-secret";
  return createHash("sha256").update(seed).digest();
}

function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

function decryptSecret(packed: string): string {
  if (!packed.startsWith("v1:")) return packed;
  const parts = packed.split(":");
  const ivB = parts[1];
  const tagB = parts[2];
  const encB = parts[3];
  if (!ivB || !tagB || !encB) return packed;
  const decipher = createDecipheriv("aes-256-gcm", keyBuf(), Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encB, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}

function packCreds(creds: Creds | null): string | null {
  if (!creds) return null;
  return encryptSecret(JSON.stringify(creds));
}

function unpackCreds(enc: string | null): Creds | null {
  if (!enc) return null;
  try {
    const raw = JSON.parse(decryptSecret(enc)) as Creds;
    if (!raw?.keyId || !raw?.secret) return null;
    return raw;
  } catch {
    return null;
  }
}

function emptyDesk(): Omit<DeskSnapshot, "updatedAt"> {
  return {
    venue: "sim",
    creds: null,
    watchlist: [...DEFAULT_WATCHLIST],
    selected: "AAPL",
    sim: createStarterBook(),
    strategies: defaultStrategies(),
    botLog: [],
    risk: { maxDailyLossPct: 2, maxPositionPct: 15, defaultQty: 10 },
    halted: false,
  };
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function getOwnerId(): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`select user_id from desk_owner where slot = 1 limit 1`;
  return rows[0]?.user_id ?? null;
}

export async function claimOwner(userId: string): Promise<{ owner: boolean; ownerId: string }> {
  const sql = await getSql();
  const existing = await getOwnerId();
  if (existing) return { owner: existing === userId, ownerId: existing };
  await sql`
    insert into desk_owner (slot, user_id)
    values (1, ${userId})
    on conflict (slot) do nothing
  `;
  const ownerId = (await getOwnerId()) ?? userId;
  return { owner: ownerId === userId, ownerId };
}

export async function requireOwner(userId: string): Promise<void> {
  const claim = await claimOwner(userId);
  if (!claim.owner) {
    throw new Error("NightDesk is a single-operator desk. This account is not the owner.");
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function loadDesk(userId: string): Promise<DeskSnapshot> {
  await requireOwner(userId);
  const sql = await getSql();
  const rows = await sql<{
    venue: string;
    creds_enc: string | null;
    watchlist: unknown;
    selected: string;
    sim: unknown;
    strategies: unknown;
    bot_log: unknown;
    risk: unknown;
    halted: boolean;
    updated_at: unknown;
  }>`
    select venue, creds_enc, watchlist, selected, sim, strategies, bot_log, risk, halted, updated_at
    from desk_state
    where user_id = ${userId}
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    const fresh = emptyDesk();
    return { ...fresh, updatedAt: new Date().toISOString() };
  }
  const base = emptyDesk();
  const venue: Venue =
    row.venue === "alpaca-live" || row.venue === "alpaca-paper" || row.venue === "sim"
      ? row.venue
      : "sim";
  return {
    venue,
    creds: unpackCreds(row.creds_enc),
    watchlist: parseJson(row.watchlist, base.watchlist),
    selected: row.selected || base.selected,
    sim: parseJson(row.sim, base.sim),
    strategies: parseJson(row.strategies, base.strategies),
    botLog: parseJson(row.bot_log, base.botLog),
    risk: parseJson(row.risk, base.risk),
    halted: Boolean(row.halted),
    updatedAt: asIso(row.updated_at),
  };
}

export async function saveDesk(
  userId: string,
  desk: Omit<DeskSnapshot, "updatedAt">,
): Promise<DeskSnapshot> {
  await requireOwner(userId);
  const sql = await getSql();
  const rows = await sql<{ updated_at: unknown }>`
    insert into desk_state (
      user_id, venue, creds_enc, watchlist, selected, sim, strategies, bot_log, risk, halted, updated_at
    )
    values (
      ${userId},
      ${desk.venue},
      ${packCreds(desk.creds)},
      ${JSON.stringify(desk.watchlist)}::jsonb,
      ${desk.selected},
      ${JSON.stringify(desk.sim)}::jsonb,
      ${JSON.stringify(desk.strategies)}::jsonb,
      ${JSON.stringify(desk.botLog.slice(-200))}::jsonb,
      ${JSON.stringify(desk.risk)}::jsonb,
      ${desk.halted},
      now()
    )
    on conflict (user_id) do update set
      venue = excluded.venue,
      creds_enc = excluded.creds_enc,
      watchlist = excluded.watchlist,
      selected = excluded.selected,
      sim = excluded.sim,
      strategies = excluded.strategies,
      bot_log = excluded.bot_log,
      risk = excluded.risk,
      halted = excluded.halted,
      updated_at = now()
    returning updated_at
  `;
  return { ...desk, botLog: desk.botLog.slice(-200), updatedAt: asIso(rows[0]?.updated_at ?? new Date()) };
}

export function publicDesk(desk: DeskSnapshot) {
  return {
    ...desk,
    creds: desk.creds ? { keyId: desk.creds.keyId, secret: "" } : null,
    hasSecret: Boolean(desk.creds?.secret),
  };
}

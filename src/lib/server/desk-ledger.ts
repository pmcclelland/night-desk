import { getSql } from "@/lib/db";
import { snapshotAlpaca } from "@/lib/server/alpaca";
import type { DeskSnapshot } from "@/lib/server/desk-store";
import type { Account, Order, Position, Venue } from "@/lib/types";

export type AlpacaBook = {
  account: Account;
  positions: Position[];
  orders: Order[];
  pulledAt: string;
};

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

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function recordDeskEvent(input: {
  userId: string;
  venue: Venue;
  kind: string;
  symbol?: string | null;
  payload: unknown;
  id?: string;
}): Promise<void> {
  const id =
    input.id ??
    `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const sql = await getSql();
  await sql`
    insert into desk_events (id, user_id, venue, kind, symbol, payload, created_at)
    values (
      ${id},
      ${input.userId},
      ${input.venue},
      ${input.kind},
      ${input.symbol ?? null},
      ${JSON.stringify(input.payload ?? {})}::jsonb,
      now()
    )
    on conflict (id) do nothing
  `;
}

export async function loadStoredBook(userId: string): Promise<AlpacaBook | null> {
  const sql = await getSql();
  const rows = await sql<{
    account: unknown;
    positions: unknown;
    orders: unknown;
    pulled_at: unknown;
  }>`
    select account, positions, orders, pulled_at
    from desk_book
    where user_id = ${userId}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const account = parseJson<Account | null>(row.account, null);
  if (!account) return null;
  return {
    account,
    positions: parseJson(row.positions, [] as Position[]),
    orders: parseJson(row.orders, [] as Order[]),
    pulledAt: asIso(row.pulled_at),
  };
}

async function rememberFills(userId: string, venue: Venue, orders: Order[]): Promise<void> {
  for (const order of orders) {
    if (order.status !== "filled" && order.status !== "partially_filled") continue;
    await recordDeskEvent({
      userId,
      venue,
      kind: order.status === "filled" ? "fill" : "partial",
      symbol: order.symbol,
      id: `${order.status}:${order.id}`,
      payload: {
        id: order.id,
        side: order.side,
        type: order.type,
        qty: order.qty,
        filledQty: order.filledQty,
        filledAvgPrice: order.filledAvgPrice,
        status: order.status,
        source: order.source,
      },
    });
  }
}

export async function captureAlpacaBook(
  userId: string,
  desk: Pick<DeskSnapshot, "venue" | "creds">,
): Promise<AlpacaBook | null> {
  if (desk.venue === "sim" || !desk.creds) return loadStoredBook(userId);
  try {
    const live = await snapshotAlpaca(desk.venue, desk.creds);
    const sql = await getSql();
    const rows = await sql<{ pulled_at: unknown }>`
      insert into desk_book (user_id, venue, account, positions, orders, pulled_at)
      values (
        ${userId},
        ${desk.venue},
        ${JSON.stringify(live.account)}::jsonb,
        ${JSON.stringify(live.positions)}::jsonb,
        ${JSON.stringify(live.orders)}::jsonb,
        now()
      )
      on conflict (user_id) do update set
        venue = excluded.venue,
        account = excluded.account,
        positions = excluded.positions,
        orders = excluded.orders,
        pulled_at = now()
      returning pulled_at
    `;
    await rememberFills(userId, desk.venue, live.orders);
    return {
      ...live,
      pulledAt: asIso(rows[0]?.pulled_at ?? new Date()),
    };
  } catch {
    return loadStoredBook(userId);
  }
}

import { getSql } from "@/lib/db";
import { requireOwner } from "@/lib/server/desk-store";

const TOKEN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export type DeskKvRow<T = unknown> = {
  ns: string;
  key: string;
  value: T;
  updatedAt: string;
};

function assertToken(label: string, value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!TOKEN.test(trimmed)) {
    throw new Error(`${label} must be a lowercase token (letters, digits, ., _, -)`);
  }
  return trimmed;
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseValue<T>(value: unknown): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
  return value as T;
}

export async function getDeskKv<T>(userId: string, ns: string, key: string): Promise<T | null> {
  await requireOwner(userId);
  const sql = await getSql();
  const rows = await sql<{ value: unknown }>`
    select value from desk_kv
    where user_id = ${userId} and ns = ${assertToken("ns", ns)} and key = ${assertToken("key", key)}
    limit 1
  `;
  if (!rows[0]) return null;
  return parseValue<T>(rows[0].value);
}

export async function putDeskKv<T>(
  userId: string,
  ns: string,
  key: string,
  value: T,
): Promise<DeskKvRow<T>> {
  await requireOwner(userId);
  const nsToken = assertToken("ns", ns);
  const keyToken = assertToken("key", key);
  const sql = await getSql();
  const rows = await sql<{ updated_at: unknown }>`
    insert into desk_kv (user_id, ns, key, value, updated_at)
    values (
      ${userId},
      ${nsToken},
      ${keyToken},
      ${JSON.stringify(value)}::jsonb,
      now()
    )
    on conflict (user_id, ns, key) do update set
      value = excluded.value,
      updated_at = now()
    returning updated_at
  `;
  return {
    ns: nsToken,
    key: keyToken,
    value,
    updatedAt: asIso(rows[0]?.updated_at ?? new Date()),
  };
}

export async function listDeskKv<T>(userId: string, ns: string): Promise<DeskKvRow<T>[]> {
  await requireOwner(userId);
  const nsToken = assertToken("ns", ns);
  const sql = await getSql();
  const rows = await sql<{ key: string; value: unknown; updated_at: unknown }>`
    select key, value, updated_at
    from desk_kv
    where user_id = ${userId} and ns = ${nsToken}
    order by key
  `;
  return rows.map((row) => ({
    ns: nsToken,
    key: row.key,
    value: parseValue<T>(row.value),
    updatedAt: asIso(row.updated_at),
  }));
}

export async function deleteDeskKv(userId: string, ns: string, key: string): Promise<boolean> {
  await requireOwner(userId);
  const sql = await getSql();
  const rows = await sql<{ key: string }>`
    delete from desk_kv
    where user_id = ${userId}
      and ns = ${assertToken("ns", ns)}
      and key = ${assertToken("key", key)}
    returning key
  `;
  return Boolean(rows[0]);
}

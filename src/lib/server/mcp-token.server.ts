import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export const MCP_TOKEN_PREFIX = "ndk_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mintSecret(): string {
  return `${MCP_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

function newTokenId(): string {
  return `tok_${randomBytes(12).toString("base64url")}`;
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export type McpTokenMeta = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  token?: string;
};

export async function userIdFromMcpToken(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed.startsWith(MCP_TOKEN_PREFIX)) return null;
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from mcp_tokens where token_hash = ${hashToken(trimmed)} limit 1
  `;
  return rows[0]?.user_id ?? null;
}

export async function listMcpTokens(userId: string): Promise<McpTokenMeta[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    name: string;
    token_prefix: string;
    created_at: unknown;
  }>`
    select id, name, token_prefix, created_at
    from mcp_tokens
    where user_id = ${userId}
    order by created_at desc
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    createdAt: asIso(row.created_at),
  }));
}

export async function createMcpToken(userId: string, name: string): Promise<McpTokenMeta> {
  const trimmed = name.trim() || "Grok Bot";
  const token = mintSecret();
  const prefix = `${token.slice(0, 10)}…`;
  const id = newTokenId();
  const sql = await getSql();
  const rows = await sql<{ created_at: unknown }>`
    insert into mcp_tokens (id, user_id, name, token_hash, token_prefix, created_at)
    values (${id}, ${userId}, ${trimmed}, ${hashToken(token)}, ${prefix}, now())
    returning created_at
  `;
  return {
    id,
    name: trimmed,
    tokenPrefix: prefix,
    createdAt: asIso(rows[0]?.created_at ?? new Date()),
    token,
  };
}

export async function revokeMcpToken(userId: string, id: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    delete from mcp_tokens
    where id = ${id} and user_id = ${userId}
    returning id
  `;
  if (!rows[0]) throw new Error("Token not found");
}

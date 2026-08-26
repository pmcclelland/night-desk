-- Single-operator NightDesk: one owner, one persisted desk, MCP tokens for the Grok bot.

create table if not exists desk_owner (
  slot integer primary key default 1 check (slot = 1),
  user_id text not null,
  claimed_at timestamptz not null default now()
);

create table if not exists desk_state (
  user_id text primary key,
  venue text not null,
  creds_enc text,
  watchlist jsonb not null,
  selected text not null,
  sim jsonb not null,
  strategies jsonb not null,
  bot_log jsonb not null,
  risk jsonb not null,
  halted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists mcp_tokens (
  id text primary key,
  user_id text not null,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  created_at timestamptz not null default now()
);

create index if not exists mcp_tokens_user_id_idx on mcp_tokens (user_id);

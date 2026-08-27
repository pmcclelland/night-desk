-- Alpaca remains the live book. These tables are our journal and last snapshot.

create table if not exists desk_book (
  user_id text primary key,
  venue text not null,
  account jsonb not null,
  positions jsonb not null,
  orders jsonb not null,
  pulled_at timestamptz not null default now()
);

create table if not exists desk_events (
  id text primary key,
  user_id text not null,
  venue text not null,
  kind text not null,
  symbol text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists desk_events_user_created_idx on desk_events (user_id, created_at desc);

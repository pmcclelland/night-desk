-- Namespaced JSON documents for future NightDesk features (journal, layouts,
-- notes, prefs, etc.). Query-heavy data still gets its own migration.

create table if not exists desk_kv (
  user_id text not null,
  ns text not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, ns, key)
);

create index if not exists desk_kv_ns_idx on desk_kv (user_id, ns);

create table if not exists pairs (
  id bigserial primary key,
  symbol text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists candles (
  id bigserial primary key,
  pair_id bigint not null references pairs(id) on delete cascade,
  open_time timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric not null,
  created_at timestamptz not null default now(),
  unique (pair_id, open_time)
);

create index if not exists idx_candles_pair_time on candles(pair_id, open_time desc);

create table if not exists alert_rules (
  id bigserial primary key,
  pair_id bigint not null references pairs(id) on delete cascade,
  name text not null,
  condition_type text not null check (condition_type in ('rsi_below', 'ema_cross_up', 'close_above')),
  params jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists alert_events (
  id bigserial primary key,
  rule_id bigint not null references alert_rules(id) on delete cascade,
  pair_id bigint not null references pairs(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists sync_runs (
  id bigserial primary key,
  pair_id bigint not null references pairs(id) on delete cascade,
  symbol text not null,
  inserted_new boolean not null,
  open_time timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists strategies (
  id bigserial primary key,
  strategy_key text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists strategy_pairs (
  strategy_id bigint not null references strategies(id) on delete cascade,
  pair_id bigint not null references pairs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (strategy_id, pair_id)
);

insert into pairs (symbol)
values
  ('EUR/USD'), ('GBP/USD'), ('USD/JPY'), ('USD/CHF'), ('AUD/USD'), ('USD/CAD'), ('NZD/USD'),
  ('EUR/GBP'), ('EUR/JPY'), ('EUR/CHF'), ('EUR/AUD'), ('EUR/CAD'), ('EUR/NZD'),
  ('GBP/JPY'), ('GBP/CHF'), ('GBP/AUD'), ('GBP/CAD'), ('GBP/NZD'),
  ('AUD/JPY'), ('AUD/CHF'), ('AUD/CAD'), ('AUD/NZD'),
  ('CAD/JPY'), ('CAD/CHF'), ('CHF/JPY'),
  ('NZD/JPY'), ('NZD/CAD'), ('NZD/CHF')
on conflict (symbol) do nothing;

insert into strategies (strategy_key, name)
values ('strategy_1', 'الاستراتيجية الأولى')
on conflict (strategy_key) do nothing;

-- Example rules
insert into alert_rules (pair_id, name, condition_type, params)
select id, symbol || ' RSI < 30', 'rsi_below', '{"threshold": 30}'::jsonb
from pairs
where symbol in ('EUR/USD', 'GBP/USD')
on conflict do nothing;

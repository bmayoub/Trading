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

insert into strategies (strategy_key, name)
values ('strategy_1', 'الاستراتيجية الأولى')
on conflict (strategy_key) do nothing;
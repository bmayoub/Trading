create table if not exists fotsi_values (
  currency text not null check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'NZD')),
  open_time timestamptz not null,
  value numeric not null,
  created_at timestamptz not null default now(),
  primary key (currency, open_time)
);

create index if not exists idx_fotsi_values_currency_time on fotsi_values(currency, open_time desc);
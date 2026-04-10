import { ensureDb } from "@/lib/db";
import { sortPairsByCurrencyPriority } from "@/lib/defaults";
import { fetchCandles, fetchLatestClosedCandle } from "@/lib/exchange";
import { evaluatePairAlerts } from "@/lib/alerts";
import type { Candle, PairRow } from "@/lib/types";

export async function getActivePairs() {
  const db = ensureDb();
  const pairs = await db<PairRow[]>`select id, symbol, is_active from pairs where is_active = true`;
  return sortPairsByCurrencyPriority(pairs);
}

export async function seedPairIfNeeded(pairId: number, symbol: string) {
  const db = ensureDb();
  const countRows = await db<{ count: number }[]>`select count(*)::int as count from candles where pair_id = ${pairId}`;
  const count = countRows[0]?.count ?? 0;

  if (count > 0) {
    return { seeded: false, count };
  }

  const candles = await fetchCandles(symbol, 100);
  for (const candle of candles) {
    await db`
      insert into candles (pair_id, open_time, open, high, low, close, volume)
      values (${pairId}, ${candle.openTime}, ${candle.open}, ${candle.high}, ${candle.low}, ${candle.close}, ${candle.volume})
      on conflict (pair_id, open_time) do nothing
    `;
  }

  return { seeded: true, count: candles.length };
}

export async function syncPair(pairId: number, symbol: string) {
  const db = ensureDb();
  const latest = await fetchLatestClosedCandle(symbol);
  if (!latest) return { inserted: false, pruned: false, alerts: [] as string[] };

  const insertedRows = await db<{ id: number }[]>`
    insert into candles (pair_id, open_time, open, high, low, close, volume)
    values (${pairId}, ${latest.openTime}, ${latest.open}, ${latest.high}, ${latest.low}, ${latest.close}, ${latest.volume})
    on conflict (pair_id, open_time) do nothing
    returning id
  `;

  await db`
    delete from candles
    where id in (
      select id
      from candles
      where pair_id = ${pairId}
      order by open_time desc
      offset 500
    )
  `;

  const candles = await getCandlesForPair(pairId, 500);
  const alerts = insertedRows.length > 0 ? await evaluatePairAlerts(pairId, symbol, candles) : [];

  await db`
    insert into sync_runs (pair_id, symbol, inserted_new, open_time)
    values (${pairId}, ${symbol}, ${insertedRows.length > 0}, ${latest.openTime})
  `;

  return {
    inserted: insertedRows.length > 0,
    pruned: candles.length >= 500,
    alerts
  };
}

export async function getCandlesForPair(pairId: number, limit = 500): Promise<Candle[]> {
  const db = ensureDb();
  const rows = await db<Candle[]>`
    select latest.open_time as "openTime", latest.open::float8 as open, latest.high::float8 as high, latest.low::float8 as low, latest.close::float8 as close, latest.volume::float8 as volume
    from (
      select open_time, open, high, low, close, volume
      from candles
      where pair_id = ${pairId}
      order by open_time desc
      limit ${limit}
    ) latest
    order by latest.open_time asc
  `;
  return rows;
}

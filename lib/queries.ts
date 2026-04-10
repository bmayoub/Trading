import { withDbFallback } from "@/lib/db";
import { getCandlesForPair } from "@/lib/candles";
import { sortPairsByCurrencyPriority } from "@/lib/defaults";
import type { Candle } from "@/lib/types";

export async function getDashboardSummary() {
  return withDbFallback(async (db) => {
    const [pairs, candles, alerts, lastSync] = await Promise.all([
      db<{ count: number }[]>`select count(*)::int as count from pairs where is_active = true`,
      db<{ count: number }[]>`select count(*)::int as count from candles`,
      db<{ count: number }[]>`select count(*)::int as count from alert_rules where is_active = true`,
      db<{ open_time: string }[]>`select open_time::text from sync_runs order by created_at desc limit 1`
    ]);

    return {
      activePairs: pairs[0]?.count ?? 0,
      totalCandles: candles[0]?.count ?? 0,
      activeAlerts: alerts[0]?.count ?? 0,
      lastSync: lastSync[0]?.open_time ?? null
    };
  }, {
    activePairs: 0,
    totalCandles: 0,
    activeAlerts: 0,
    lastSync: null as string | null
  });
}

export async function getAlertRules() {
  return withDbFallback((db) => db<{ id: number; name: string; symbol: string; condition_type: string; is_active: boolean }[]>`
    select ar.id, ar.name, p.symbol, ar.condition_type, ar.is_active
    from alert_rules ar
    join pairs p on p.id = ar.pair_id
    order by ar.id desc
  `, [] as { id: number; name: string; symbol: string; condition_type: string; is_active: boolean }[]);
}

export async function getRecentAlertEvents() {
  return withDbFallback((db) => db<{ id: number; symbol: string; message: string; created_at: string }[]>`
    select ae.id, p.symbol, ae.message, ae.created_at::text
    from alert_events ae
    join pairs p on p.id = ae.pair_id
    order by ae.created_at desc
    limit 20
  `, [] as { id: number; symbol: string; message: string; created_at: string }[]);
}

export async function getChartPairs() {
  return withDbFallback(async (db) => {
    const rows = await db<{ symbol: string }[]>`
      select symbol
      from pairs
      where is_active = true
    `;

    return sortPairsByCurrencyPriority(rows).map((row) => row.symbol);
  }, [] as string[]);
}

export async function getCandlesBySymbol(symbol: string, limit = 500): Promise<Candle[]> {
  return withDbFallback(async (db) => {
    const pairRows = await db<{ id: number }[]>`
      select id
      from pairs
      where symbol = ${symbol}
      and is_active = true
      limit 1
    `;

    const pairId = pairRows[0]?.id;
    if (!pairId) {
      return [];
    }

    return getCandlesForPair(pairId, limit);
  }, [] as Candle[]);
}

export async function getHomeChartData() {
  const pairs = await getChartPairs();
  const initialSymbol = pairs[0] ?? null;
  const initialCandles = initialSymbol ? await getCandlesBySymbol(initialSymbol) : [];

  return {
    pairs,
    initialSymbol,
    initialCandles
  };
}

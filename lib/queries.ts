import { ensureDb, sql } from "@/lib/db";
import { buildIndicatorSnapshot } from "@/lib/indicators";
import { getCandlesForPair } from "@/lib/candles";

export async function getDashboardSummary() {
  if (!sql) {
    return {
      activePairs: 0,
      totalCandles: 0,
      activeAlerts: 0,
      lastSync: null as string | null
    };
  }

  const db = ensureDb();
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
}

export async function getDashboardRows() {
  if (!sql) return [];

  const db = ensureDb();
  const pairs = await db<{ id: number; symbol: string }[]>`select id, symbol from pairs where is_active = true order by symbol asc`;
  const rows = [] as Array<Record<string, string | number | null>>;

  for (const pair of pairs) {
    const candles = await getCandlesForPair(pair.id, 500);
    const snapshot = buildIndicatorSnapshot(candles);
    rows.push({
      symbol: pair.symbol,
      candles: candles.length,
      close: snapshot.lastClose,
      rsi14: snapshot.rsi14,
      ema20: snapshot.ema20,
      ema50: snapshot.ema50,
      trend: snapshot.trend
    });
  }

  return rows;
}

export async function getAlertRules() {
  if (!sql) return [];
  const db = ensureDb();
  return db<{ id: number; name: string; symbol: string; condition_type: string; is_active: boolean }[]>`
    select ar.id, ar.name, p.symbol, ar.condition_type, ar.is_active
    from alert_rules ar
    join pairs p on p.id = ar.pair_id
    order by ar.id desc
  `;
}

export async function getRecentAlertEvents() {
  if (!sql) return [];
  const db = ensureDb();
  return db<{ id: number; symbol: string; message: string; created_at: string }[]>`
    select ae.id, p.symbol, ae.message, ae.created_at::text
    from alert_events ae
    join pairs p on p.id = ae.pair_id
    order by ae.created_at desc
    limit 20
  `;
}

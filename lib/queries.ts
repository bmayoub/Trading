import { unstable_cache } from "next/cache";
import { withDbFallback } from "@/lib/db";
import { DEFAULT_PAIRS, sortPairsByCurrencyPriority } from "@/lib/defaults";
import type { Candle } from "@/lib/types";

const CHART_REVALIDATE_SECONDS = 3600;

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
  }, {
    label: "dashboard-summary"
  });
}

export async function getAlertRules() {
  return withDbFallback((db) => db<{ id: number; name: string; symbol: string; condition_type: string; is_active: boolean }[]>`
    select ar.id, ar.name, p.symbol, ar.condition_type, ar.is_active
    from alert_rules ar
    join pairs p on p.id = ar.pair_id
    order by ar.id desc
  `, [] as { id: number; name: string; symbol: string; condition_type: string; is_active: boolean }[], {
    label: "alert-rules"
  });
}

export async function getRecentAlertEvents() {
  return withDbFallback((db) => db<{ id: number; symbol: string; message: string; created_at: string }[]>`
    select ae.id, p.symbol, ae.message, ae.created_at::text
    from alert_events ae
    join pairs p on p.id = ae.pair_id
    order by ae.created_at desc
    limit 20
  `, [] as { id: number; symbol: string; message: string; created_at: string }[], {
    label: "recent-alert-events"
  });
}

export async function getChartPairs() {
  return unstable_cache(
    () => withDbFallback(async (db) => {
      const rows = await db<{ symbol: string }[]>`
        select symbol
        from pairs
        where is_active = true
      `;

      return sortPairsByCurrencyPriority(rows).map((row) => row.symbol);
    }, DEFAULT_PAIRS, {
      label: "chart-pairs"
    }),
    ["chart-pairs"],
    {
      revalidate: CHART_REVALIDATE_SECONDS,
      tags: ["chart-pairs"]
    }
  )();
}

export async function getCandlesBySymbol(symbol: string, limit = 500): Promise<Candle[]> {
  return unstable_cache(
    () => withDbFallback(async (db) => {
      const rows = await db<Candle[]>`
        select latest.open_time::text as "openTime", latest.open::float8 as open, latest.high::float8 as high, latest.low::float8 as low, latest.close::float8 as close, latest.volume::float8 as volume
        from (
          select c.open_time, c.open, c.high, c.low, c.close, c.volume
          from candles c
          join pairs p on p.id = c.pair_id
          where p.symbol = ${symbol}
            and p.is_active = true
          order by c.open_time desc
          limit ${limit}
        ) latest
        order by latest.open_time asc
      `;

      return rows;
    }, [] as Candle[], {
      label: `candles-by-symbol:${symbol}`
    }),
    ["chart-candles", symbol, String(limit)],
    {
      revalidate: CHART_REVALIDATE_SECONDS,
      tags: ["home-chart-data", "chart-candles", `chart-candles:${symbol}`]
    }
  )();
}

export async function getHomeChartData() {
  return unstable_cache(
    async () => {
      const pairs = await getChartPairs();
      const initialSymbol = pairs[0] ?? null;
      const initialCandles = initialSymbol ? await getCandlesBySymbol(initialSymbol) : [];

      return {
        pairs,
        initialSymbol,
        initialCandles
      };
    },
    ["home-chart-data"],
    {
      revalidate: CHART_REVALIDATE_SECONDS,
      tags: ["home-chart-data", "chart-pairs"]
    }
  )();
}

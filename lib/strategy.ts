import { withDbFallback } from "@/lib/db";
import { DEFAULT_PAIRS, sortPairsByCurrencyPriority } from "@/lib/defaults";
import { getFotsiSeries, type FotsiCurrency } from "@/lib/fotsi";

export const STRATEGY_ONE_KEY = "strategy_1";
export const STRATEGY_ONE_NAME = "الاستراتيجية الأولى";
export const WATCHLIST_CURRENCY_ORDER: FotsiCurrency[] = ["EUR", "USD", "GBP", "CHF", "JPY", "AUD", "CAD", "NZD"];

export type StrategyCurrencyState = "SOB" | "OB" | "neutre" | "OS" | "SOS" | "unclassified";

export type CurrencySnapshot = {
  currency: FotsiCurrency;
  value: number | null;
  delta: number | null;
  state: StrategyCurrencyState;
};

export type RadarSignal = {
  symbol: string;
  action: "BUY" | "SELL";
  baseCurrency: string;
  quoteCurrency: string;
  baseState: StrategyCurrencyState;
  quoteState: StrategyCurrencyState;
  reason: string;
};

export type StrategyWatchlistData = {
  selectedPairs: string[];
  snapshots: CurrencySnapshot[];
  grouped: Record<StrategyCurrencyState, CurrencySnapshot[]>;
  radarSignals: RadarSignal[];
};

function normalizePairSelection(symbols: string[], allowedPairs: string[]) {
  const allowedSet = new Set(allowedPairs);
  return sortPairsByCurrencyPriority([...new Set(symbols)].filter((symbol) => allowedSet.has(symbol)));
}

function classifyCurrency(value: number | null): StrategyCurrencyState {
  if (value === null) {
    return "unclassified";
  }

  if (value >= 50) {
    return "SOB";
  }

  if (value >= 25) {
    return "OB";
  }

  if (value <= -50) {
    return "SOS";
  }

  if (value <= -25) {
    return "OS";
  }

  if (value > -25 && value < 25) {
    return "neutre";
  }

  return "unclassified";
}

export async function getSelectablePairs() {
  return withDbFallback(async (db) => {
    const rows = await db<{ symbol: string }[]>`
      select symbol
      from pairs
      where is_active = true
    `;

    return sortPairsByCurrencyPriority(rows.map((row) => row.symbol));
  }, DEFAULT_PAIRS);
}

export async function getStrategyPairSymbols(strategyKey = STRATEGY_ONE_KEY) {
  return withDbFallback(async (db) => {
    const rows = await db<{ symbol: string }[]>`
      select p.symbol
      from strategy_pairs sp
      join strategies s on s.id = sp.strategy_id
      join pairs p on p.id = sp.pair_id
      where s.strategy_key = ${strategyKey}
      order by p.symbol asc
    `;

    return sortPairsByCurrencyPriority(rows.map((row) => row.symbol));
  }, [] as string[]);
}

export async function saveStrategyPairSymbols(symbols: string[], strategyKey = STRATEGY_ONE_KEY, strategyName = STRATEGY_ONE_NAME) {
  const allowedPairs = await getSelectablePairs();
  const normalizedPairs = normalizePairSelection(symbols, allowedPairs);

  return withDbFallback(async (db) => {
    await db.begin(async (tx) => {
      const existing = await tx<{ id: number }[]>`
        select id
        from strategies
        where strategy_key = ${strategyKey}
        limit 1
      `;

      let strategyId = existing[0]?.id;
      if (!strategyId) {
        const inserted = await tx<{ id: number }[]>`
          insert into strategies (strategy_key, name)
          values (${strategyKey}, ${strategyName})
          returning id
        `;
        strategyId = inserted[0]?.id;
      }

      if (!strategyId) {
        throw new Error("تعذر إنشاء الاستراتيجية.");
      }

      await tx`delete from strategy_pairs where strategy_id = ${strategyId}`;

      if (normalizedPairs.length === 0) {
        return;
      }

      const pairRows = await tx<{ id: number; symbol: string }[]>`
        select id, symbol
        from pairs
        where symbol in ${tx(normalizedPairs)}
      `;

      for (const pair of pairRows) {
        await tx`
          insert into strategy_pairs (strategy_id, pair_id)
          values (${strategyId}, ${pair.id})
          on conflict do nothing
        `;
      }
    });

    return { ok: true, symbols: normalizedPairs };
  }, { ok: false, symbols: normalizedPairs, error: "تعذر حفظ أزواج الاستراتيجية." });
}

export async function getStrategyWatchlistData(strategyKey = STRATEGY_ONE_KEY): Promise<StrategyWatchlistData> {
  const [selectedPairs, fotsiSeries] = await Promise.all([
    getStrategyPairSymbols(strategyKey),
    getFotsiSeries(300)
  ]);

  const snapshots = WATCHLIST_CURRENCY_ORDER.map((currency) => {
    const points = fotsiSeries[currency];
    const value = points.at(-1)?.value ?? null;
    const previousValue = points.at(-2)?.value ?? null;
    const delta = value !== null && previousValue !== null ? value - previousValue : null;

    return {
      currency,
      value,
      delta,
      state: classifyCurrency(value)
    } satisfies CurrencySnapshot;
  });

  const grouped: Record<StrategyCurrencyState, CurrencySnapshot[]> = {
    SOB: [],
    OB: [],
    neutre: [],
    OS: [],
    SOS: [],
    unclassified: []
  };

  for (const snapshot of snapshots) {
    grouped[snapshot.state].push(snapshot);
  }

  return {
    selectedPairs,
    snapshots,
    grouped,
    radarSignals: []
  };
}
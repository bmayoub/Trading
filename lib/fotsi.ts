import { ensureDb, withDbFallback } from "@/lib/db";
import type { Candle } from "@/lib/types";

type SymbolCandles = Record<string, Candle[]>;

export type FotsiSeriesPoint = {
  time: string;
  value: number;
};

export type FotsiSeries = {
  EUR: FotsiSeriesPoint[];
  USD: FotsiSeriesPoint[];
  GBP: FotsiSeriesPoint[];
  CHF: FotsiSeriesPoint[];
  JPY: FotsiSeriesPoint[];
  AUD: FotsiSeriesPoint[];
  CAD: FotsiSeriesPoint[];
  NZD: FotsiSeriesPoint[];
};

export type FotsiCurrency = keyof FotsiSeries;

const FOTSI_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "AUD", "CAD", "NZD"] as const satisfies readonly FotsiCurrency[];

const FOTSI_REQUIRED_PAIRS = [
  "EUR/USD", "EUR/GBP", "EUR/CHF", "EUR/JPY", "EUR/AUD", "EUR/CAD", "EUR/NZD",
  "USD/CHF", "USD/JPY", "USD/CAD",
  "GBP/USD", "GBP/CHF", "GBP/JPY", "GBP/AUD", "GBP/CAD", "GBP/NZD",
  "CHF/JPY",
  "AUD/USD", "AUD/CHF", "AUD/JPY", "AUD/CAD", "AUD/NZD",
  "CAD/CHF", "CAD/JPY",
  "NZD/USD", "NZD/CHF", "NZD/JPY", "NZD/CAD"
] as const;

type FotsiPair = (typeof FOTSI_REQUIRED_PAIRS)[number];

const CURRENCY_CONTRIBUTIONS: Record<FotsiCurrency, ReadonlyArray<readonly [FotsiPair, 1 | -1]>> = {
  EUR: [["EUR/USD", 1], ["EUR/GBP", 1], ["EUR/CHF", 1], ["EUR/JPY", 1], ["EUR/AUD", 1], ["EUR/CAD", 1], ["EUR/NZD", 1]],
  USD: [["EUR/USD", -1], ["GBP/USD", -1], ["USD/CHF", 1], ["USD/JPY", 1], ["AUD/USD", -1], ["USD/CAD", 1], ["NZD/USD", -1]],
  GBP: [["EUR/GBP", -1], ["GBP/USD", 1], ["GBP/CHF", 1], ["GBP/JPY", 1], ["GBP/AUD", 1], ["GBP/CAD", 1], ["GBP/NZD", 1]],
  CHF: [["EUR/CHF", -1], ["USD/CHF", -1], ["GBP/CHF", -1], ["CHF/JPY", 1], ["AUD/CHF", -1], ["CAD/CHF", -1], ["NZD/CHF", -1]],
  JPY: [["EUR/JPY", -1], ["USD/JPY", -1], ["GBP/JPY", -1], ["CHF/JPY", -1], ["AUD/JPY", -1], ["CAD/JPY", -1], ["NZD/JPY", -1]],
  AUD: [["EUR/AUD", -1], ["AUD/USD", 1], ["GBP/AUD", -1], ["AUD/CHF", 1], ["AUD/JPY", 1], ["AUD/CAD", 1], ["AUD/NZD", 1]],
  CAD: [["EUR/CAD", -1], ["USD/CAD", -1], ["GBP/CAD", -1], ["CAD/CHF", 1], ["CAD/JPY", 1], ["AUD/CAD", -1], ["NZD/CAD", -1]],
  NZD: [["EUR/NZD", -1], ["NZD/USD", 1], ["GBP/NZD", -1], ["NZD/CHF", 1], ["NZD/JPY", 1], ["AUD/NZD", -1], ["NZD/CAD", 1]]
};

const JPY_PAIRS = new Set<FotsiPair>(["EUR/JPY", "USD/JPY", "GBP/JPY", "CHF/JPY", "AUD/JPY", "CAD/JPY", "NZD/JPY"]);

const EMPTY_SERIES: FotsiSeries = {
  EUR: [],
  USD: [],
  GBP: [],
  CHF: [],
  JPY: [],
  AUD: [],
  CAD: [],
  NZD: []
};

type FotsiValueRow = {
  currency: FotsiCurrency;
  openTime: string;
  value: number;
};

function toHourBucket(value: string) {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function emaSeries(values: number[], period: number) {
  if (values.length === 0) {
    return [] as number[];
  }

  const multiplier = 2 / (period + 1);
  const result: number[] = [values[0]];

  for (let index = 1; index < values.length; index += 1) {
    result.push((values[index] - result[index - 1]) * multiplier + result[index - 1]);
  }

  return result;
}

function tsiSeries(values: number[], length2: number, length3: number) {
  const smoothMomentum = emaSeries(emaSeries(values, length2), length3);
  const smoothAbsolute = emaSeries(emaSeries(values.map((value) => Math.abs(value)), length2), length3);

  return smoothMomentum.map((value, index) => {
    const denominator = smoothAbsolute[index];
    return denominator === 0 ? 0 : (100 * value) / denominator;
  });
}

function alignCandlesByTime(symbolCandles: SymbolCandles, requiredPairs: readonly FotsiPair[]) {
  const normalizedCandles = Object.fromEntries(
    Object.entries(symbolCandles).map(([symbol, candles]) => {
      const deduped = new Map<string, Candle>();

      for (const candle of candles) {
        deduped.set(toHourBucket(candle.openTime), {
          ...candle,
          openTime: toHourBucket(candle.openTime)
        });
      }

      return [symbol, [...deduped.values()].sort((left, right) => new Date(left.openTime).getTime() - new Date(right.openTime).getTime())];
    })
  ) as SymbolCandles;

  const required = requiredPairs.map((pair) => normalizedCandles[pair]).filter((candles): candles is Candle[] => Array.isArray(candles) && candles.length > 0);
  if (required.length !== requiredPairs.length) {
    return { times: [] as string[], aligned: {} as SymbolCandles };
  }

  const allTimes = new Set(required.flatMap((candles) => candles.map((candle) => candle.openTime)));
  const startTime = Math.max(...required.map((candles) => new Date(candles[0].openTime).getTime()));
  const times = [...allTimes]
    .filter((time) => new Date(time).getTime() >= startTime)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

  if (times.length === 0) {
    return { times: [] as string[], aligned: {} as SymbolCandles };
  }

  const aligned: SymbolCandles = {};

  for (const pair of requiredPairs) {
    const candles = normalizedCandles[pair];
    const byTime = new Map(candles.map((candle) => [candle.openTime, candle]));
    let cursor = 0;
    let previousCandle: Candle | null = null;

    aligned[pair] = times.flatMap((time) => {
      const targetTime = new Date(time).getTime();

      while (cursor < candles.length && new Date(candles[cursor].openTime).getTime() <= targetTime) {
        previousCandle = candles[cursor];
        cursor += 1;
      }

      const exactCandle = byTime.get(time);
      if (exactCandle) {
        previousCandle = exactCandle;
        return [exactCandle];
      }

      return previousCandle ? [{ ...previousCandle, openTime: time }] : [];
    });
  }

  return { times, aligned };
}

function pairMomentum(candles: Candle[], period: number, divideBy100: boolean) {
  return candles.map((candle, index) => {
    const sourceOpen = candles[Math.max(0, index - period)]?.open ?? candle.open;
    const value = candle.close - sourceOpen;
    return divideBy100 ? value / 100 : value;
  });
}

function buildCurrencySeriesFromAligned(currency: FotsiCurrency, times: string[], aligned: SymbolCandles, length1: number, length2: number, length3: number) {
  const contributions = CURRENCY_CONTRIBUTIONS[currency];
  const momentumByPair = Object.fromEntries(
    contributions.map(([pair]) => [pair, pairMomentum(aligned[pair], length1, JPY_PAIRS.has(pair))])
  ) as Record<FotsiPair, number[]>;

  const aggregate = times.map((_, index) => contributions.reduce((sum, [pair, sign]) => sum + sign * momentumByPair[pair][index], 0));
  const smoothed = tsiSeries(aggregate, length2, length3);

  return times.map((time, index) => ({ time, value: smoothed[index] }));
}

export function buildFotsiSeries(symbolCandles: SymbolCandles, length1 = 0, length2 = 25, length3 = 15): FotsiSeries {
  const { times, aligned } = alignCandlesByTime(symbolCandles, FOTSI_REQUIRED_PAIRS);
  if (times.length === 0) {
    return EMPTY_SERIES;
  }

  return {
    EUR: buildCurrencySeriesFromAligned("EUR", times, aligned, length1, length2, length3),
    USD: buildCurrencySeriesFromAligned("USD", times, aligned, length1, length2, length3),
    GBP: buildCurrencySeriesFromAligned("GBP", times, aligned, length1, length2, length3),
    CHF: buildCurrencySeriesFromAligned("CHF", times, aligned, length1, length2, length3),
    JPY: buildCurrencySeriesFromAligned("JPY", times, aligned, length1, length2, length3),
    AUD: buildCurrencySeriesFromAligned("AUD", times, aligned, length1, length2, length3),
    CAD: buildCurrencySeriesFromAligned("CAD", times, aligned, length1, length2, length3),
    NZD: buildCurrencySeriesFromAligned("NZD", times, aligned, length1, length2, length3)
  };
}

function buildSeriesFromStoredRows(rows: FotsiValueRow[]): FotsiSeries | null {
  const grouped = {
    EUR: [] as FotsiSeriesPoint[],
    USD: [] as FotsiSeriesPoint[],
    GBP: [] as FotsiSeriesPoint[],
    CHF: [] as FotsiSeriesPoint[],
    JPY: [] as FotsiSeriesPoint[],
    AUD: [] as FotsiSeriesPoint[],
    CAD: [] as FotsiSeriesPoint[],
    NZD: [] as FotsiSeriesPoint[]
  } satisfies FotsiSeries;

  for (const row of rows) {
    grouped[row.currency].push({ time: row.openTime, value: row.value });
  }

  return FOTSI_CURRENCIES.every((currency) => grouped[currency].length > 0) ? grouped : null;
}

async function loadCandlesForFotsi(db: NonNullable<ReturnType<typeof ensureDb>>, limit: number) {
  const rows = await db<Array<{ symbol: string; openTime: string; open: number; high: number; low: number; close: number; volume: number }>>`
    with ranked_candles as (
      select
        p.symbol,
        c.open_time,
        c.open,
        c.high,
        c.low,
        c.close,
        c.volume,
        row_number() over (partition by p.symbol order by c.open_time desc) as row_num
      from candles c
      join pairs p on p.id = c.pair_id
      where p.is_active = true
        and p.symbol in ${db(FOTSI_REQUIRED_PAIRS)}
    )
    select
      symbol,
      open_time as "openTime",
      open::float8 as open,
      high::float8 as high,
      low::float8 as low,
      close::float8 as close,
      volume::float8 as volume
    from ranked_candles
    where row_num <= ${limit}
    order by symbol asc, "openTime" asc
  `;

  const grouped: SymbolCandles = {};
  for (const row of rows) {
    grouped[row.symbol] ??= [];
    grouped[row.symbol].push({
      openTime: row.openTime,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume
    });
  }

  return grouped;
}

async function getStoredFotsiSeries(db: NonNullable<ReturnType<typeof ensureDb>>, limit: number) {
  const rows = await db<FotsiValueRow[]>`
    with ranked_values as (
      select
        currency,
        open_time,
        value,
        row_number() over (partition by currency order by open_time desc) as row_num
      from fotsi_values
    )
    select
      currency::text as currency,
      open_time::text as "openTime",
      value::float8 as value
    from ranked_values
    where row_num <= ${limit}
    order by currency asc, "openTime" asc
  `;

  return buildSeriesFromStoredRows(rows);
}

export async function refreshStoredFotsiSeries(limit = 500): Promise<FotsiSeries> {
  const db = ensureDb();
  const groupedCandles = await loadCandlesForFotsi(db, limit);
  const series = buildFotsiSeries(groupedCandles);
  const rows = FOTSI_CURRENCIES.flatMap((currency) =>
    series[currency].map((point) => ({
      currency,
      open_time: point.time,
      value: point.value
    }))
  );

  await db.begin(async (tx) => {
    if (rows.length > 0) {
      await tx`
        insert into fotsi_values ${tx(rows, "currency", "open_time", "value")}
        on conflict (currency, open_time) do update
        set value = excluded.value
      `;
    }

    await tx`
      delete from fotsi_values current_values
      using (
        select currency, open_time,
               row_number() over (partition by currency order by open_time desc) as row_num
        from fotsi_values
      ) ranked
      where current_values.currency = ranked.currency
        and current_values.open_time = ranked.open_time
        and ranked.row_num > ${limit}
    `;
  });

  return series;
}

export async function getFotsiSeries(limit = 500) {
  return withDbFallback(async (db) => {
    const stored = await getStoredFotsiSeries(db, limit);
    if (stored) {
      return stored;
    }

    return refreshStoredFotsiSeries(limit);
  }, EMPTY_SERIES, {
    label: "fotsi-series"
  });
}

export async function getFotsiCurrencySeries(currency: FotsiCurrency, limit = 300) {
  return withDbFallback(async (db) => {
    const storedRows = await db<FotsiValueRow[]>`
      with ranked_values as (
        select
          currency,
          open_time,
          value,
          row_number() over (partition by currency order by open_time desc) as row_num
        from fotsi_values
        where currency = ${currency}
      )
      select
        currency::text as currency,
        open_time::text as "openTime",
        value::float8 as value
      from ranked_values
      where row_num <= ${limit}
      order by "openTime" asc
    `;

    if (storedRows.length > 0) {
      return storedRows.map((row) => ({ time: row.openTime, value: row.value }));
    }

    const refreshed = await refreshStoredFotsiSeries(Math.max(limit, 500));
    if (refreshed[currency].length > 0) {
      return refreshed[currency].slice(-limit);
    }

    const pairs = CURRENCY_CONTRIBUTIONS[currency].map(([pair]) => pair);
    const rows = await db<Array<{ symbol: string; openTime: string; open: number; high: number; low: number; close: number; volume: number }>>`
      with ranked_candles as (
        select
          p.symbol,
          c.open_time,
          c.open,
          c.high,
          c.low,
          c.close,
          c.volume,
          row_number() over (partition by p.symbol order by c.open_time desc) as row_num
        from candles c
        join pairs p on p.id = c.pair_id
        where p.is_active = true
          and p.symbol in ${db(pairs)}
      )
      select
        symbol,
        open_time as "openTime",
        open::float8 as open,
        high::float8 as high,
        low::float8 as low,
        close::float8 as close,
        volume::float8 as volume
      from ranked_candles
      where row_num <= ${limit}
      order by symbol asc, "openTime" asc
    `;

    const grouped: SymbolCandles = {};
    for (const row of rows) {
      grouped[row.symbol] ??= [];
      grouped[row.symbol].push({
        openTime: row.openTime,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume
      });
    }

    const { times, aligned } = alignCandlesByTime(grouped, pairs);
    if (times.length === 0) {
      return [] as FotsiSeriesPoint[];
    }

    return buildCurrencySeriesFromAligned(currency, times, aligned, 0, 25, 15);
  }, [] as FotsiSeriesPoint[], {
    label: `fotsi-currency:${currency}`
  });
}
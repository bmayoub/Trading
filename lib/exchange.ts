import type { Candle } from "@/lib/types";

const apiKey = process.env.TWELVE_DATA_API_KEY;
const baseUrl = process.env.TWELVE_DATA_BASE_URL ?? "https://api.twelvedata.com";

type TwelveDataCandle = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
};

type TwelveDataResponse = {
  code?: number;
  status?: string;
  message?: string;
  values?: TwelveDataCandle[];
};

function ensureApiKey() {
  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is missing. Add it to your environment variables.");
  }

  return apiKey;
}

function mapCandle(candle: TwelveDataCandle): Candle {
  return {
    openTime: new Date(candle.datetime).toISOString(),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume ?? 0)
  };
}

async function requestTimeSeries(symbol: string, outputsize: number): Promise<TwelveDataCandle[]> {
  const url = new URL("/time_series", baseUrl);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1h");
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", ensureApiKey());

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = (await response.json()) as TwelveDataResponse;

  if (!response.ok || !data.values?.length) {
    throw new Error(data.message || `Failed to fetch candles for ${symbol}`);
  }

  return data.values;
}

export async function fetchCandles(symbol: string, limit: number): Promise<Candle[]> {
  const values = await requestTimeSeries(symbol, limit);

  return values
    .slice()
    .reverse()
    .map(mapCandle);
}

export async function fetchLatestClosedCandle(symbol: string): Promise<Candle | null> {
  const candles = await fetchCandles(symbol, 1);
  return candles.at(-1) ?? null;
}

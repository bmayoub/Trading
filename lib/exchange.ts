import type { Candle } from "@/lib/types";

const baseUrl = process.env.BINANCE_BASE_URL ?? "https://api.binance.com";

type BinanceKline = [
  number, string, string, string, string, string, number, string, number, string, string, string
];

function mapKline(kline: BinanceKline): Candle {
  return {
    openTime: new Date(kline[0]).toISOString(),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5])
  };
}

export async function fetchCandles(symbol: string, limit: number): Promise<Candle[]> {
  const url = `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch candles for ${symbol}: ${response.status}`);
  }

  const data = (await response.json()) as BinanceKline[];
  return data.map(mapKline);
}

export async function fetchLatestClosedCandle(symbol: string): Promise<Candle | null> {
  const candles = await fetchCandles(symbol, 2);
  if (candles.length < 2) return null;
  return candles.at(-2) ?? null;
}

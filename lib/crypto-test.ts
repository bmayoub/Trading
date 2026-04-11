import { fetchCandles } from "@/lib/exchange";
import type { Candle } from "@/lib/types";

export const CRYPTO_TEST_SYMBOLS = ["BTC/USD", "ETH/USD"] as const;

export type CryptoTestSymbol = (typeof CRYPTO_TEST_SYMBOLS)[number];

export type CryptoSnapshot = {
  symbol: CryptoTestSymbol;
  candle: Candle | null;
  previousClose: number | null;
  error: string | null;
};

export type CryptoTestPayload = {
  generatedAt: string;
  scheduledMinute: 15;
  snapshots: CryptoSnapshot[];
};

function isClosedHourlyCandle(candle: Candle, now = Date.now()) {
  return new Date(candle.openTime).getTime() + 60 * 60 * 1000 <= now;
}

function getClosedCandles(candles: Candle[], now = Date.now()) {
  return candles.filter((candle) => isClosedHourlyCandle(candle, now));
}

async function getSnapshot(symbol: CryptoTestSymbol): Promise<CryptoSnapshot> {
  try {
    const candles = await fetchCandles(symbol, 4);
    const closedCandles = getClosedCandles(candles);
    const candle = closedCandles.at(-1) ?? null;
    const previousClose = closedCandles.at(-2)?.close ?? null;

    return {
      symbol,
      candle,
      previousClose,
      error: candle ? null : "لا توجد شمعة ساعة مغلقة متاحة حاليًا."
    };
  } catch (error) {
    return {
      symbol,
      candle: null,
      previousClose: null,
      error: error instanceof Error ? error.message : "تعذر جلب بيانات السوق."
    };
  }
}

export async function getCryptoTestPayload(): Promise<CryptoTestPayload> {
  const snapshots = await Promise.all(CRYPTO_TEST_SYMBOLS.map((symbol) => getSnapshot(symbol)));

  return {
    generatedAt: new Date().toISOString(),
    scheduledMinute: 15,
    snapshots
  };
}
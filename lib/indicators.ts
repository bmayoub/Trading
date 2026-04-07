import type { Candle } from "@/lib/types";

function round(value: number, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return round(slice.reduce((sum, value) => sum + value, 0) / period);
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < values.length; i += 1) {
    current = (values[i] - current) * multiplier + current;
  }

  return round(current);
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;
  const rs = gains / period / (losses / period);
  return round(100 - 100 / (1 + rs), 2);
}

export function candleCloses(candles: Candle[]) {
  return candles.map((candle) => candle.close);
}

export function buildIndicatorSnapshot(candles: Candle[]) {
  const closes = candleCloses(candles);
  const lastClose = closes.at(-1) ?? null;
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const rsi14 = rsi(closes, 14);

  return {
    lastClose,
    ema20,
    ema50,
    rsi14,
    trend: ema20 && ema50 ? (ema20 > ema50 ? "bullish" : "bearish") : "unknown"
  };
}

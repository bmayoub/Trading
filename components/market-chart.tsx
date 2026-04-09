"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CandlestickSeries, createChart, type CandlestickData, type IChartApi, type ISeriesApi, type Time, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/lib/types";

type ChartResponse = {
  ok: boolean;
  error?: string;
  symbol?: string;
  candles?: Candle[];
};

function toSeriesData(candles: Candle[]): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: Math.floor(new Date(candle.openTime).getTime() / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  }));
}

function formatValue(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return value.toFixed(5);
}

export function MarketChart({ pairs, initialSymbol, initialCandles }: { pairs: string[]; initialSymbol: string | null; initialCandles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const [candles, setCandles] = useState(initialCandles);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#09111f" },
        textColor: "#d9e2ff",
        fontFamily: "Segoe UI, Tahoma, sans-serif"
      },
      grid: {
        vertLines: { color: "rgba(120, 140, 180, 0.12)" },
        horzLines: { color: "rgba(120, 140, 180, 0.12)" }
      },
      rightPriceScale: {
        borderColor: "rgba(120, 140, 180, 0.25)"
      },
      timeScale: {
        borderColor: "rgba(120, 140, 180, 0.25)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.28)" },
        horzLine: { color: "rgba(255,255,255,0.18)" }
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#1fcf90",
      downColor: "#f35f74",
      borderUpColor: "#1fcf90",
      borderDownColor: "#f35f74",
      wickUpColor: "#1fcf90",
      wickDownColor: "#f35f74"
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    seriesRef.current.setData(toSeriesData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const lastCandle = candles[candles.length - 1];

  return (
    <section className="market-page">
      <div className="market-stage">
        <div className="market-stage-header">
          <div>
            <div className="market-kicker">28 زوج فوركس</div>
            <h1>{selectedSymbol ?? "شارت السوق"}</h1>
            <p>
              شارت شموع يابانية بملء الصفحة مع تبديل مباشر بين الأزواج النشطة.
              {isPending && loadingSymbol ? ` جارٍ تحميل ${loadingSymbol}...` : ""}
            </p>
          </div>

          <div className="market-stats">
            <div>
              <span>الإغلاق</span>
              <strong>{formatValue(lastCandle?.close)}</strong>
            </div>
            <div>
              <span>الأعلى</span>
              <strong>{formatValue(lastCandle?.high)}</strong>
            </div>
            <div>
              <span>الأدنى</span>
              <strong>{formatValue(lastCandle?.low)}</strong>
            </div>
            <div>
              <span>عدد الشموع</span>
              <strong>{candles.length}</strong>
            </div>
          </div>
        </div>

        <div className="market-chart-frame">
          {pairs.length === 0 ? (
            <div className="chart-empty">لا توجد أزواج مفعلة أو لا يمكن الوصول إلى قاعدة البيانات.</div>
          ) : (
            <div ref={containerRef} className="chart-surface" />
          )}
        </div>

        <div className="pair-switcher">
          {pairs.map((pair) => (
            <button
              key={pair}
              type="button"
              className={pair === selectedSymbol ? "active" : ""}
              onClick={() => {
                if (pair === selectedSymbol || isPending) {
                  return;
                }

                setLoadingSymbol(pair);
                setError(null);

                startTransition(async () => {
                  const response = await fetch(`/api/chart/candles?symbol=${encodeURIComponent(pair)}`, {
                    cache: "no-store"
                  });
                  const data = (await response.json()) as ChartResponse;

                  if (!response.ok || !data.ok) {
                    setError(data.error ?? "تعذر تحميل الشارت.");
                    setLoadingSymbol(null);
                    return;
                  }

                  setSelectedSymbol(pair);
                  setCandles(data.candles ?? []);
                  setLoadingSymbol(null);
                });
              }}
            >
              {pair}
            </button>
          ))}
        </div>

        {error ? <div className="notice danger">{error}</div> : null}
      </div>
    </section>
  );
}
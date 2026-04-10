"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CandlestickSeries, LineSeries, createChart, type CandlestickData, type IChartApi, type ISeriesApi, type LineData, type Time, type UTCTimestamp } from "lightweight-charts";
import type { FotsiCurrency, FotsiSeries } from "@/lib/fotsi";
import type { Candle } from "@/lib/types";

const FotsiChart = dynamic(() => import("@/components/fotsi-chart").then((module) => module.FotsiChart), {
  ssr: false,
  loading: () => <div className="indicator-panel-empty">جارٍ تجهيز شارت FOTSI...</div>
});

type ChartResponse = {
  ok: boolean;
  error?: string;
  symbol?: string;
  candles?: Candle[];
};

type HoveredCandle = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

type FotsiSeriesResponse = {
  ok: boolean;
  error?: string;
  series?: FotsiSeries;
};

const DEFAULT_PRICE_PRECISION = 5;
const JPY_PRICE_PRECISION = 3;
const MRC_LENGTH = 200;
const MRC_OUTER_MULTIPLIER = 2.415;
const R2_COLOR = "#ff6b6b";
const S2_COLOR = "#2dd39a";
const FOTSI_COLORS: Record<FotsiCurrency, string> = {
  EUR: "#4da3ff",
  USD: "#f7b955",
  GBP: "#7ce0a9",
  CHF: "#ff8b8b",
  JPY: "#b693ff",
  AUD: "#6fe3ff",
  CAD: "#ffb36b",
  NZD: "#9ce06f"
};
const FOTSI_ORDER: FotsiCurrency[] = ["EUR", "USD", "GBP", "CHF", "JPY", "AUD", "CAD", "NZD"];

function getPricePrecision(symbol: string | null) {
  if (symbol?.includes("JPY")) {
    return JPY_PRICE_PRECISION;
  }

  return DEFAULT_PRICE_PRECISION;
}

function toSeriesData(candles: Candle[]): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: Math.floor(new Date(candle.openTime).getTime() / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  }));
}

function toEmaSeriesData(candles: Candle[], period: number): LineData<Time>[] {
  if (candles.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const points: LineData<Time>[] = [];
  let current = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;

  points.push({
    time: Math.floor(new Date(candles[period - 1].openTime).getTime() / 1000) as UTCTimestamp,
    value: current
  });

  for (let index = period; index < candles.length; index += 1) {
    current = (candles[index].close - current) * multiplier + current;
    points.push({
      time: Math.floor(new Date(candles[index].openTime).getTime() / 1000) as UTCTimestamp,
      value: current
    });
  }

  return points;
}

function candleTime(candle: Candle) {
  return Math.floor(new Date(candle.openTime).getTime() / 1000) as UTCTimestamp;
}

function supersmoother(values: number[], length: number) {
  if (values.length === 0) {
    return [] as number[];
  }

  const a1 = Math.exp((-Math.sqrt(2) * Math.PI) / length);
  const b1 = 2 * a1 * Math.cos((Math.sqrt(2) * Math.PI) / length);
  const c3 = -(a1 ** 2);
  const c2 = b1;
  const c1 = 1 - c2 - c3;
  const result: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    const prevInput = values[index - 1] ?? current;
    const prev1 = result[index - 1] ?? prevInput;
    const prev2 = result[index - 2] ?? prevInput;
    result.push(c1 * current + c2 * prev1 + c3 * prev2);
  }

  return result;
}

function trueRangeValues(candles: Candle[]) {
  return candles.map((candle, index) => {
    const previousClose = candles[index - 1]?.close;
    if (previousClose === undefined) {
      return candle.high - candle.low;
    }

    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });
}

function toMrcOuterBandSeries(candles: Candle[]) {
  if (candles.length < MRC_LENGTH) {
    return { r2: [] as LineData<Time>[], s2: [] as LineData<Time>[] };
  }

  const source = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
  const meanline = supersmoother(source, MRC_LENGTH);
  const meanrange = supersmoother(trueRangeValues(candles), MRC_LENGTH);
  const multiplier = Math.PI * MRC_OUTER_MULTIPLIER;

  const r2: LineData<Time>[] = [];
  const s2: LineData<Time>[] = [];

  for (let index = 0; index < candles.length; index += 1) {
    r2.push({
      time: candleTime(candles[index]),
      value: meanline[index] + meanrange[index] * multiplier
    });
    s2.push({
      time: candleTime(candles[index]),
      value: meanline[index] - meanrange[index] * multiplier
    });
  }

  return { r2, s2 };
}

function formatValue(value: number | undefined, precision: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return value.toFixed(precision);
}

function findDisplayedCandleIndex(candles: Candle[], hovered: HoveredCandle | null) {
  if (!hovered) {
    return candles.length - 1;
  }

  const hoveredTime = typeof hovered.time === "number" ? hovered.time : null;
  const exactIndex = candles.findIndex((candle) => {
    const timeMatches = hoveredTime === null || candleTime(candle) === hoveredTime;

    return timeMatches
      && candle.open === hovered.open
      && candle.high === hovered.high
      && candle.low === hovered.low
      && candle.close === hovered.close;
  });

  return exactIndex === -1 ? candles.length - 1 : exactIndex;
}

function groupPairs(pairs: string[]) {
  const rows: string[][] = [];
  let currentBase = "";

  for (const pair of pairs) {
    const [base = ""] = pair.split("/");

    if (base !== currentBase) {
      rows.push([pair]);
      currentBase = base;
      continue;
    }

    rows.at(-1)?.push(pair);
  }

  return rows;
}

function formatPairLabel(pair: string) {
  return pair.replaceAll("/", "").toUpperCase();
}

function isSameHoveredCandle(left: HoveredCandle | null, right: HoveredCandle | null) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.time === right.time
    && left.open === right.open
    && left.high === right.high
    && left.low === right.low
    && left.close === right.close;
}

export function MarketChart({ pairs, initialSymbol, initialCandles }: { pairs: string[]; initialSymbol: string | null; initialCandles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema100SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const r2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const s2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const hoveredCandleRef = useRef<HoveredCandle | null>(null);
  const loadedCandlesRef = useRef(new Map<string, Candle[]>());
  const initialPricePrecisionRef = useRef(getPricePrecision(initialSymbol));
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const [candles, setCandles] = useState(initialCandles);
  const [hoveredCandle, setHoveredCandle] = useState<HoveredCandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEma50And100, setShowEma50And100] = useState(true);
  const [showMrcOuterBands, setShowMrcOuterBands] = useState(true);
  const [showFotsi, setShowFotsi] = useState(false);
  const [fotsiSeries, setFotsiSeries] = useState<FotsiSeries | null>(null);
  const [fotsiLoading, setFotsiLoading] = useState(false);
  const [fotsiError, setFotsiError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pricePrecision = getPricePrecision(selectedSymbol);
  const pairRows = useMemo(() => groupPairs(pairs), [pairs]);

  useEffect(() => {
    if (initialSymbol && initialCandles.length > 0) {
      loadedCandlesRef.current.set(initialSymbol, initialCandles);
    }
  }, [initialCandles, initialSymbol]);

  useEffect(() => {
    if (selectedSymbol) {
      loadedCandlesRef.current.set(selectedSymbol, candles);
    }
  }, [candles, selectedSymbol]);

  const loadFotsiIfNeeded = useCallback(async (force = false) => {
    if ((fotsiSeries || fotsiLoading) && !force) {
      return;
    }

    setFotsiLoading(true);
    setFotsiError(null);

    try {
      const response = await fetch("/api/chart/fotsi");
      const data = (await response.json()) as FotsiSeriesResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "تعذر تحميل مؤشر FOTSI.");
      }

      setFotsiSeries(data.series ?? null);
    } catch (fetchError) {
      setFotsiError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل مؤشر FOTSI.");
    } finally {
      setFotsiLoading(false);
    }
  }, [fotsiLoading, fotsiSeries]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#131313" },
        textColor: "#ffffff",
        fontFamily: "IBM Plex Sans Arabic, Segoe UI, Tahoma, sans-serif"
      },
      grid: {
        vertLines: { color: "rgba(72, 72, 71, 0.18)" },
        horzLines: { color: "rgba(72, 72, 71, 0.18)" }
      },
      rightPriceScale: {
        borderColor: "rgba(72, 72, 71, 0.24)"
      },
      timeScale: {
        borderColor: "rgba(72, 72, 71, 0.24)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.22)" },
        horzLine: { color: "rgba(255,255,255,0.14)" }
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#24f07e",
      downColor: "#ff716c",
      borderUpColor: "#24f07e",
      borderDownColor: "#ff716c",
      wickUpColor: "#24f07e",
      wickDownColor: "#ff716c",
      priceFormat: {
        type: "price",
        precision: initialPricePrecisionRef.current,
        minMove: 10 ** -initialPricePrecisionRef.current
      }
    });

    const ema50Series = chart.addSeries(LineSeries, {
      color: "#f08a24",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });

    const ema100Series = chart.addSeries(LineSeries, {
      color: "#4da3ff",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });

    const r2Series = chart.addSeries(LineSeries, {
      color: R2_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });

    const s2Series = chart.addSeries(LineSeries, {
      color: S2_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });

    chartRef.current = chart;
    seriesRef.current = series;
    ema50SeriesRef.current = ema50Series;
    ema100SeriesRef.current = ema100Series;
    r2SeriesRef.current = r2Series;
    s2SeriesRef.current = s2Series;

    const handleCrosshairMove = (param: Parameters<typeof chart.subscribeCrosshairMove>[0] extends (arg: infer T) => void ? T : never) => {
      const data = param.seriesData.get(series);

      if (!param.point || !param.time || !data || !("open" in data)) {
        if (hoveredCandleRef.current !== null) {
          hoveredCandleRef.current = null;
          setHoveredCandle(null);
        }
        return;
      }

      const nextHoveredCandle = {
        time: param.time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close
      };

      if (!isSameHoveredCandle(hoveredCandleRef.current, nextHoveredCandle)) {
        hoveredCandleRef.current = nextHoveredCandle;
        setHoveredCandle(nextHoveredCandle);
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

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
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      ema50SeriesRef.current = null;
      ema100SeriesRef.current = null;
      r2SeriesRef.current = null;
      s2SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    seriesRef.current.setData(toSeriesData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!ema50SeriesRef.current) {
      return;
    }

    ema50SeriesRef.current.setData(showEma50And100 ? toEmaSeriesData(candles, 50) : []);
  }, [candles, showEma50And100]);

  useEffect(() => {
    if (!ema100SeriesRef.current) {
      return;
    }

    ema100SeriesRef.current.setData(showEma50And100 ? toEmaSeriesData(candles, 100) : []);
  }, [candles, showEma50And100]);

  useEffect(() => {
    if (!r2SeriesRef.current || !s2SeriesRef.current) {
      return;
    }

    if (!showMrcOuterBands) {
      r2SeriesRef.current.setData([]);
      s2SeriesRef.current.setData([]);
      return;
    }

    const { r2, s2 } = toMrcOuterBandSeries(candles);
    r2SeriesRef.current.setData(r2);
    s2SeriesRef.current.setData(s2);
  }, [candles, showMrcOuterBands]);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    seriesRef.current.applyOptions({
      priceFormat: {
        type: "price",
        precision: pricePrecision,
        minMove: 10 ** -pricePrecision
      }
    });
  }, [pricePrecision]);

  useEffect(() => {
    r2SeriesRef.current?.applyOptions({ color: R2_COLOR });
    s2SeriesRef.current?.applyOptions({ color: S2_COLOR });
  }, []);

  useEffect(() => {
    if (!showFotsi) {
      return;
    }

    void loadFotsiIfNeeded();
  }, [loadFotsiIfNeeded, showFotsi]);

  useEffect(() => {
    if (!showFotsi) {
      return;
    }

    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);

    const delayUntilNextHour = nextHour.getTime() - now.getTime();
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const timeoutId = setTimeout(() => {
      void loadFotsiIfNeeded(true);
      intervalId = setInterval(() => {
        void loadFotsiIfNeeded(true);
      }, 60 * 60 * 1000);
    }, delayUntilNextHour);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadFotsiIfNeeded, showFotsi]);

  const lastCandle = candles[candles.length - 1];
  const displayedCandle = hoveredCandle ?? lastCandle;
  const displayedCandleIndex = findDisplayedCandleIndex(candles, hoveredCandle);
  const previousClose = displayedCandleIndex > 0 ? candles[displayedCandleIndex - 1]?.close : undefined;
  const closeDelta = typeof displayedCandle?.close === "number" && typeof previousClose === "number"
    ? displayedCandle.close - previousClose
    : undefined;
  const closeDeltaTone = (closeDelta ?? 0) >= 0 ? "positive" : "negative";

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
        </div>

        <div className="tv-readout" aria-live="polite" dir="ltr">
          <span><strong>O</strong> {formatValue(displayedCandle?.open, pricePrecision)}</span>
          <span><strong>H</strong> {formatValue(displayedCandle?.high, pricePrecision)}</span>
          <span><strong>L</strong> {formatValue(displayedCandle?.low, pricePrecision)}</span>
          <span><strong>C</strong> {formatValue(displayedCandle?.close, pricePrecision)}</span>
          <span className={closeDeltaTone}>
            {typeof closeDelta === "number" ? `${closeDelta >= 0 ? "+" : ""}${closeDelta.toFixed(pricePrecision)}` : "-"}
          </span>
        </div>

        <div className="indicator-bar">
          <button
            type="button"
            className={showEma50And100 ? "active ema100" : "ema100"}
            onClick={() => {
              setShowEma50And100((current) => !current);
            }}
          >
            EMA50/100
          </button>
          <button
            type="button"
            className={showMrcOuterBands ? "active mrc" : "mrc"}
            onClick={() => {
              setShowMrcOuterBands((current) => !current);
            }}
          >
            R2/S2
          </button>
          <button
            type="button"
            className={showFotsi ? "active fotsi" : "fotsi"}
            onClick={() => {
              const nextValue = !showFotsi;
              setShowFotsi(nextValue);

              if (nextValue) {
                void loadFotsiIfNeeded();
              }
            }}
          >
            FOTSI
          </button>
        </div>

        <div className="market-chart-frame">
          {pairs.length === 0 ? (
            <div className="chart-empty">لا توجد أزواج مفعلة أو لا يمكن الوصول إلى قاعدة البيانات.</div>
          ) : (
            <div ref={containerRef} className="chart-surface" />
          )}
        </div>

        {showFotsi ? (
          <div className="indicator-panel">
            <div className="indicator-panel-header">
              <div>
                <strong>FOTSI</strong>
                <span>الشارت الموحّد نفسه الموجود في صفحة FOTSI المستقلة</span>
              </div>
            </div>
            {fotsiError ? <div className="notice danger">{fotsiError}</div> : null}
            {fotsiLoading && !fotsiSeries ? <div className="indicator-panel-empty">جارٍ تحميل بيانات FOTSI...</div> : null}
            {!fotsiLoading && !fotsiError ? (
              fotsiSeries ? <FotsiChart series={fotsiSeries} colors={FOTSI_COLORS} order={FOTSI_ORDER} /> : <div className="indicator-panel-empty">لا توجد بيانات كافية لحساب المؤشر حاليًا.</div>
            ) : null}
          </div>
        ) : null}

        <div className="pair-switcher">
          {pairRows.map((row) => (
            <div key={row[0]} className="pair-switcher-row" style={{ ["--columns" as string]: row.length }}>
              {row.map((pair) => (
                <button
                  key={pair}
                  type="button"
                  className={pair === selectedSymbol ? "active" : ""}
                  onClick={() => {
                    if (pair === selectedSymbol || isPending) {
                      return;
                    }

                    setLoadingSymbol(pair);
                    setHoveredCandle(null);
                    hoveredCandleRef.current = null;
                    setError(null);

                    const cachedCandles = loadedCandlesRef.current.get(pair);
                    if (cachedCandles) {
                      setSelectedSymbol(pair);
                      setCandles(cachedCandles);
                      setLoadingSymbol(null);
                      return;
                    }

                    startTransition(async () => {
                      const response = await fetch(`/api/chart/candles?symbol=${encodeURIComponent(pair)}`);
                      const data = (await response.json()) as ChartResponse;

                      if (!response.ok || !data.ok) {
                        setError(data.error ?? "تعذر تحميل الشارت.");
                        setLoadingSymbol(null);
                        return;
                      }

                      setHoveredCandle(null);
                      hoveredCandleRef.current = null;
                      setSelectedSymbol(pair);
                      const nextCandles = data.candles ?? [];
                      loadedCandlesRef.current.set(pair, nextCandles);
                      setCandles(nextCandles);
                      setLoadingSymbol(null);
                    });
                  }}
                >
                  {formatPairLabel(pair)}
                </button>
              ))}
            </div>
          ))}
        </div>

        {error ? <div className="notice danger">{error}</div> : null}
      </div>
    </section>
  );
}
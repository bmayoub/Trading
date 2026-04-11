"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type LineData, type Time, type UTCTimestamp } from "lightweight-charts";
import type { FotsiCurrency, FotsiSeries, FotsiSeriesPoint } from "@/lib/fotsi";

type FotsiChartProps = {
  series: FotsiSeries;
  colors: Record<FotsiCurrency, string>;
  order: FotsiCurrency[];
};

const LEVELS = [50, 25, -25, -50] as const;

type FotsiLabel = {
  currency: FotsiCurrency;
  color: string;
  top: number;
};

function getSeriesPoints(series: FotsiSeries, currency: FotsiCurrency) {
  const points = series?.[currency];
  return Array.isArray(points) ? points : [];
}

function toChartPoints(series: FotsiSeriesPoint[]): LineData<Time>[] {
  return series.map((point) => ({
    time: Math.floor(new Date(point.time).getTime() / 1000) as UTCTimestamp,
    value: point.value
  }));
}

export function FotsiChart({ series, colors, order }: FotsiChartProps) {
  const safeOrder = useMemo(() => (Array.isArray(order) ? order : []), [order]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const currencySeriesRefs = useRef<Partial<Record<FotsiCurrency, ISeriesApi<"Line">>>>({});
  const levelSeriesRefs = useRef<Record<string, ISeriesApi<"Line">>>({});
  const resizeFrameRef = useRef(0);
  const [labels, setLabels] = useState<FotsiLabel[]>([]);
  const chartData = useMemo(
    () => safeOrder.map((currency) => ({
      currency,
      color: colors[currency],
      points: toChartPoints(getSeriesPoints(series, currency)),
      latestValue: getSeriesPoints(series, currency).at(-1)?.value ?? null,
      previousValue: getSeriesPoints(series, currency).at(-2)?.value ?? null
    })),
    [colors, safeOrder, series]
  );
  const summaryItems = useMemo(
    () => chartData.map((item) => ({
      currency: item.currency,
      color: item.color,
      latestValue: item.latestValue,
      delta: item.latestValue !== null && item.previousValue !== null ? item.latestValue - item.previousValue : null
    })),
    [chartData]
  );
  const primaryTimeline = useMemo(() => chartData.find((item) => item.points.length > 0)?.points ?? [], [chartData]);

  const chartDataRef = useRef(chartData);

  useEffect(() => {
    chartDataRef.current = chartData;
  }, [chartData]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const updateLabels = () => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const nextLabels = chartDataRef.current.flatMap((item, index) => {
        const latestValue = item.latestValue;
        const seriesApi = currencySeriesRefs.current[item.currency];
        if (latestValue === null || !seriesApi) {
          return [];
        }

        const coordinate = seriesApi.priceToCoordinate(latestValue);
        const fallbackTop = 24 + index * 28;
        const top = coordinate === null ? fallbackTop : Math.max(16, Math.min(container.clientHeight - 16, coordinate));

        return [{ currency: item.currency, color: item.color, top }];
      });

      setLabels(nextLabels);
    };

    const scheduleLabels = () => {
      cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(updateLabels);
    };

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
      }
    });

    chartRef.current = chart;
    currencySeriesRefs.current = Object.fromEntries(
      safeOrder.map((currency) => [
        currency,
        chart.addSeries(LineSeries, {
          color: colors[currency],
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false
        })
      ])
    );
    levelSeriesRefs.current = Object.fromEntries(
      LEVELS.map((level) => [
        String(level),
        chart.addSeries(LineSeries, {
          color: level > 0 ? (level === 50 ? "#ff6b6b" : "rgba(255,255,255,0.68)") : (level === -50 ? "#2dd39a" : "rgba(255,255,255,0.68)"),
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false
        })
      ])
    );

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
      chart.timeScale().fitContent();
      scheduleLabels();
    });

    resizeObserver.observe(containerRef.current);
    scheduleLabels();

    return () => {
      cancelAnimationFrame(resizeFrameRef.current);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      currencySeriesRefs.current = {};
      levelSeriesRefs.current = {};
      setLabels([]);
    };
  }, [colors, safeOrder]);

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    for (const item of chartData) {
      currencySeriesRefs.current[item.currency]?.setData(item.points);
    }
    for (const level of LEVELS) {
      levelSeriesRefs.current[String(level)]?.setData(primaryTimeline.map((point) => ({ time: point.time, value: level })));
    }
    chartRef.current.timeScale().fitContent();

    cancelAnimationFrame(resizeFrameRef.current);
    resizeFrameRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const nextLabels = chartData.flatMap((item, index) => {
        const latestValue = item.latestValue;
        const seriesApi = currencySeriesRefs.current[item.currency];
        if (latestValue === null || !seriesApi) {
          return [];
        }

        const coordinate = seriesApi.priceToCoordinate(latestValue);
        const fallbackTop = 24 + index * 28;
        const top = coordinate === null ? fallbackTop : Math.max(16, Math.min(container.clientHeight - 16, coordinate));

        return [{ currency: item.currency, color: item.color, top }];
      });

      setLabels(nextLabels);
    });

    return () => {
      cancelAnimationFrame(resizeFrameRef.current);
    };
  }, [chartData, primaryTimeline]);

  return (
    <div className="fotsi-page-grid">
      <div className="fotsi-page-summary">
        {summaryItems.map((item) => (
          <div key={item.currency} className="card fotsi-page-stat">
            <span className="muted">{item.currency}</span>
            <strong style={{ color: item.color }}>{item.latestValue === null ? "-" : item.latestValue.toFixed(2)}</strong>
            <span className={`fotsi-page-delta ${item.delta === null ? "neutral" : item.delta >= 0 ? "positive" : "negative"}`}>
              {item.delta === null ? "-" : `${item.delta >= 0 ? "+" : ""}${item.delta.toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>
      <div className="card fotsi-page-chart-card">
        <div className="fotsi-page-chart-header">
          <div>
            <h2>FOTSI - جميع العملات</h2>
            <p>شارت موحّد يجمع العملات الثمانية مع مستويات +50 و +25 و -25 و -50.</p>
          </div>
        </div>
        {primaryTimeline.length === 0 ? (
          <div className="fotsi-page-empty">لا توجد بيانات كافية لحساب المؤشر حاليًا.</div>
        ) : (
          <div className="indicator-panel-chart-shell">
            <div ref={containerRef} className="fotsi-page-chart" />
            <div className="indicator-panel-labels" aria-hidden="true">
              {labels.map((label) => (
                <div key={label.currency} className="indicator-panel-label" style={{ top: `${label.top}px`, color: label.color }}>
                  <span className="indicator-panel-label-dot" style={{ backgroundColor: label.color }} />
                  <strong>{label.currency}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
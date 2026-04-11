"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CryptoSnapshot, CryptoTestPayload } from "@/lib/crypto-test";

type CryptoTestResponse = ({ ok: true } & CryptoTestPayload) | { ok: false; error: string };

type CryptoTestPanelProps = {
  initialPayload: CryptoTestPayload;
};

const DEFAULT_SCHEDULED_MINUTE = 15;
const REQUEST_TIMEOUT_MS = 10000;
const SCHEDULED_MINUTE_STORAGE_KEY = "crypto-test-scheduled-minute";

function normalizeScheduledMinute(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCHEDULED_MINUTE;
  }

  return Math.min(59, Math.max(0, Math.trunc(value)));
}

function getNextScheduledFetch(scheduledMinute: number, from = new Date()) {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCMinutes(scheduledMinute);

  if (from.getUTCMinutes() >= scheduledMinute) {
    next.setUTCHours(next.getUTCHours() + 1);
  }

  return next;
}

function formatMinuteLabel(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function getDelta(snapshot: CryptoSnapshot) {
  if (!snapshot.candle || snapshot.previousClose === null) {
    return null;
  }

  return snapshot.candle.close - snapshot.previousClose;
}

async function fetchPayload(): Promise<CryptoTestPayload> {
  const response = await fetch("/api/chart/crypto-test", {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  const data = await response.json() as CryptoTestResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? "تعذر جلب بيانات الصفحة التجريبية." : data.error);
  }

  return {
    generatedAt: data.generatedAt,
    scheduledMinute: data.scheduledMinute,
    snapshots: data.snapshots
  };
}

function createClearedPayload(payload: CryptoTestPayload): CryptoTestPayload {
  return {
    ...payload,
    generatedAt: "",
    snapshots: payload.snapshots.map((snapshot) => ({
      ...snapshot,
      candle: {
        openTime: "",
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0
      },
      previousClose: 0,
      error: null
    }))
  };
}

export function CryptoTestPanel({ initialPayload }: CryptoTestPanelProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledMinute, setScheduledMinute] = useState(DEFAULT_SCHEDULED_MINUTE);
  const [nextFetchAt, setNextFetchAt] = useState(() => getNextScheduledFetch(DEFAULT_SCHEDULED_MINUTE));

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, index) => index),
    []
  );

  const marketErrors = useMemo(
    () => payload.snapshots.filter((snapshot) => snapshot.error),
    [payload.snapshots]
  );

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const nextPayload = await fetchPayload();
      setPayload(nextPayload);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "تعذر جلب بيانات الصفحة التجريبية.");
    } finally {
      setIsRefreshing(false);
      setNextFetchAt(getNextScheduledFetch(scheduledMinute));
    }
  }, [scheduledMinute]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SCHEDULED_MINUTE_STORAGE_KEY);
    if (!storedValue) {
      return;
    }

    const parsed = Number.parseInt(storedValue, 10);
    setScheduledMinute(normalizeScheduledMinute(parsed));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SCHEDULED_MINUTE_STORAGE_KEY, String(scheduledMinute));
    setNextFetchAt(getNextScheduledFetch(scheduledMinute));
  }, [scheduledMinute]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const nextTarget = getNextScheduledFetch(scheduledMinute);
    setNextFetchAt(nextTarget);
    const delay = Math.max(0, nextTarget.getTime() - Date.now());

    const timeoutId = setTimeout(() => {
      void refreshData();
      intervalId = setInterval(() => {
        void refreshData();
      }, 60 * 60 * 1000);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshData, scheduledMinute]);

  return (
    <div className="crypto-test-shell">
      <div className="card">
        <div className="crypto-test-meta">
          <div className="crypto-test-status">
            <span className="muted">آخر جلب</span>
            <strong>{formatDateTime(payload.generatedAt)} UTC</strong>
          </div>
          <div className="crypto-test-status">
            <span className="muted">الجلب التالي</span>
            <strong>{formatDateTime(nextFetchAt.toISOString())} UTC</strong>
          </div>
          <div className="crypto-test-status">
            <span className="muted">الدورة</span>
            <strong>كل ساعة عند الدقيقة {formatMinuteLabel(scheduledMinute)}</strong>
          </div>
          <label className="crypto-test-minute-control">
            <span className="muted">دقيقة الجلب</span>
            <select
              value={scheduledMinute}
              onChange={(event) => {
                setScheduledMinute(normalizeScheduledMinute(Number.parseInt(event.target.value, 10)));
              }}
              disabled={isRefreshing}
            >
              {minuteOptions.map((minute) => (
                <option key={minute} value={minute}>
                  {formatMinuteLabel(minute)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button" onClick={() => {
            void refreshData();
          }} disabled={isRefreshing}>
            {isRefreshing ? "جارٍ الجلب..." : "تحديث الآن"}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setError(null);
              setPayload((current) => createClearedPayload(current));
            }}
            disabled={isRefreshing}
          >
            تفريغ البيانات
          </button>
        </div>
      </div>

      {error ? <div className="notice danger">{error}</div> : null}

      {marketErrors.length > 0 ? (
        <div className="notice danger">
          {marketErrors.map((snapshot) => `${snapshot.symbol}: ${snapshot.error}`).join(" | ")}
        </div>
      ) : null}

      <div className="crypto-test-grid">
        {payload.snapshots.map((snapshot) => {
          const delta = getDelta(snapshot);
          const deltaTone = delta === null ? "" : delta >= 0 ? "positive" : "negative";

          return (
            <article key={snapshot.symbol} className="crypto-test-card">
              <div className="crypto-test-card-header">
                <div>
                  <h2>{snapshot.symbol === "BTC/USD" ? "Bitcoin" : "Ethereum"}</h2>
                  <p className="muted">آخر شمعة ساعة مغلقة من المزود مباشرة.</p>
                </div>
                <span className="crypto-test-symbol-badge">{snapshot.symbol}</span>
              </div>

              <div className="crypto-test-price">
                <strong>{formatNumber(snapshot.candle?.close ?? null)}</strong>
                <span className={`crypto-test-delta ${deltaTone}`}>
                  {delta === null ? "-" : `${delta >= 0 ? "+" : ""}${formatNumber(delta)}`}
                </span>
              </div>

              <div className="crypto-test-ohlc">
                <div className="crypto-test-ohlc-item">
                  <span>Open</span>
                  <strong>{formatNumber(snapshot.candle?.open ?? null)}</strong>
                </div>
                <div className="crypto-test-ohlc-item">
                  <span>High</span>
                  <strong>{formatNumber(snapshot.candle?.high ?? null)}</strong>
                </div>
                <div className="crypto-test-ohlc-item">
                  <span>Low</span>
                  <strong>{formatNumber(snapshot.candle?.low ?? null)}</strong>
                </div>
                <div className="crypto-test-ohlc-item">
                  <span>Volume</span>
                  <strong>{formatNumber(snapshot.candle?.volume ?? null, 0)}</strong>
                </div>
              </div>

              <div className="crypto-test-footer">
                <span>وقت الشمعة: {formatDateTime(snapshot.candle?.openTime ?? null)} UTC</span>
                <span>الإغلاق السابق: {formatNumber(snapshot.previousClose)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
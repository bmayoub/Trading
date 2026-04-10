"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StrategyCurrencyState = "SOB" | "OB" | "neutre" | "OS" | "SOS" | "unclassified";

type CurrencySnapshot = {
  currency: string;
  value: number | null;
  delta: number | null;
  state: StrategyCurrencyState;
};

type RadarSignal = {
  symbol: string;
  action: "BUY" | "SELL";
  baseCurrency: string;
  quoteCurrency: string;
  baseState: StrategyCurrencyState;
  quoteState: StrategyCurrencyState;
  reason: string;
};

type WatchlistData = {
  selectedPairs: string[];
  snapshots: CurrencySnapshot[];
  grouped: Record<StrategyCurrencyState, CurrencySnapshot[]>;
  radarSignals: RadarSignal[];
};

type WatchlistPanelProps = {
  strategyKey: string;
};

const STATE_META = {
  SOB: { label: "SOB", accentClass: "sob", signalLabel: "بيع قوي", glyph: "⇊" },
  OB: { label: "OB", accentClass: "ob", signalLabel: "إشارة بيع", glyph: "↓" },
  neutre: { label: "NEU", accentClass: "neutre", signalLabel: "متعادل", glyph: "↔" },
  OS: { label: "OS", accentClass: "os", signalLabel: "إشارة شراء", glyph: "↑" },
  SOS: { label: "SOS", accentClass: "sos", signalLabel: "شراء قوي", glyph: "⇈" }
} as const;

const STATE_STRENGTH: Record<StrategyCurrencyState, number> = {
  neutre: 0,
  OB: 1,
  OS: 1,
  SOB: 2,
  SOS: 2,
  unclassified: 0
};

function getPairCurrencies(symbol: string) {
  const [baseCurrency = "", quoteCurrency = ""] = symbol.split("/");
  return { baseCurrency, quoteCurrency };
}

function isBullishState(state: StrategyCurrencyState) {
  return state === "OS" || state === "SOS";
}

function isBearishState(state: StrategyCurrencyState) {
  return state === "OB" || state === "SOB";
}

function getDominantState(baseState: StrategyCurrencyState, quoteState: StrategyCurrencyState) {
  const baseStrength = STATE_STRENGTH[baseState] ?? 0;
  const quoteStrength = STATE_STRENGTH[quoteState] ?? 0;

  if (baseStrength > quoteStrength) {
    return baseState;
  }

  if (quoteStrength > baseStrength) {
    return quoteState;
  }

  if (baseStrength === 0) {
    return "neutre";
  }

  if (isBullishState(baseState) && isBullishState(quoteState)) {
    return baseState === "SOS" || quoteState === "SOS" ? "SOS" : "OS";
  }

  if (isBearishState(baseState) && isBearishState(quoteState)) {
    return baseState === "SOB" || quoteState === "SOB" ? "SOB" : "OB";
  }

  return "neutre";
}

export function WatchlistPanel({ strategyKey }: WatchlistPanelProps) {
  const [data, setData] = useState<WatchlistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWatchlist() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/watchlist?strategyKey=${encodeURIComponent(strategyKey)}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as { ok: boolean; error?: string; data?: WatchlistData };

        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error ?? "تعذر تحميل قائمة المراقبة.");
        }

        if (!isMounted) {
          return;
        }

        setData(payload.data);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "تعذر تحميل قائمة المراقبة.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadWatchlist();

    return () => {
      isMounted = false;
    };
  }, [strategyKey]);

  if (isLoading) {
    return <div className="card"><div className="notice">جارٍ تحميل قائمة المراقبة...</div></div>;
  }

  if (error) {
    return <div className="card"><div className="notice danger">{error}</div></div>;
  }

  if (!data) {
    return <div className="card"><div className="notice danger">تعذر تحميل قائمة المراقبة.</div></div>;
  }

  if (data.selectedPairs.length === 0) {
    return (
      <div className="card">
        <div className="notice danger">لم يتم تحديد أزواج للاستراتيجية الأولى بعد.</div>
        <div style={{ marginTop: 12 }}>
          <Link className="button" href="/settings">فتح الإعدادات وتحديد الأزواج</Link>
        </div>
      </div>
    );
  }

  const snapshotByCurrency = new Map(data.snapshots.map((snapshot) => [snapshot.currency, snapshot]));
  const getPairStrength = (symbol: string) => {
    const { baseCurrency, quoteCurrency } = getPairCurrencies(symbol);

    return (
      (snapshotByCurrency.get(baseCurrency)?.state ? STATE_STRENGTH[snapshotByCurrency.get(baseCurrency)!.state] : 0) +
      (snapshotByCurrency.get(quoteCurrency)?.state ? STATE_STRENGTH[snapshotByCurrency.get(quoteCurrency)!.state] : 0)
    );
  };

  const sortedPairs = [...data.selectedPairs]
    .filter((symbol) => getPairStrength(symbol) > 1)
    .sort((leftSymbol, rightSymbol) => {
      const leftStrength = getPairStrength(leftSymbol);
      const rightStrength = getPairStrength(rightSymbol);

      if (rightStrength !== leftStrength) {
        return rightStrength - leftStrength;
      }

      return leftSymbol.localeCompare(rightSymbol);
    });

  const marketClock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC"
  }).format(new Date());

  const strongestSnapshots = [...data.snapshots].sort((left, right) => {
    const leftMagnitude = Math.abs(left.value ?? 0);
    const rightMagnitude = Math.abs(right.value ?? 0);

    return rightMagnitude - leftMagnitude;
  });

  return (
    <div className="watchlist-shell">
      <div className="watchlist-summary-grid">
        <div className="watchlist-summary-card market-open">
          <div className="eyebrow">سوق مفتوح</div>
          <div className="summary-value">GMT {marketClock}</div>
        </div>
        <div className="watchlist-summary-card active-pairs">
          <div className="eyebrow">أزواج تحت المراقبة</div>
          <div className="summary-value">{sortedPairs.length.toString().padStart(2, "0")}</div>
        </div>
      </div>

      <section className="watchlist-strip-list">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <div>
            <h1>الاستراتيجية 1</h1>
            <p>تحليل الفوتسي اللحظي للأزواج ذات القوة الأعلى فقط.</p>
          </div>
        </div>

        <div>
          {sortedPairs.length === 0 ? (
            <div className="watchlist-pair-empty">لا توجد أزواج بقوة أعلى من 1 الآن.</div>
          ) : sortedPairs.map((symbol) => {
            const { baseCurrency, quoteCurrency } = getPairCurrencies(symbol);
            const baseSnapshot = snapshotByCurrency.get(baseCurrency);
            const quoteSnapshot = snapshotByCurrency.get(quoteCurrency);
            const baseState = baseSnapshot?.state ?? "neutre";
            const quoteState = quoteSnapshot?.state ?? "neutre";
            const pairStrength = getPairStrength(symbol);
            const dominantState = getDominantState(baseState, quoteState);
            const dominantMeta = STATE_META[dominantState];

            return (
              <article key={symbol} className="watchlist-strip">
                <div className="watchlist-strip-icon">{dominantMeta.glyph}</div>
                <div className="watchlist-strip-main">
                  <div className={`watchlist-strip-badge ${dominantMeta.accentClass}`}>
                    <span>{dominantMeta.signalLabel}</span>
                    <strong className={dominantMeta.accentClass}>{dominantMeta.label}</strong>
                  </div>

                  <div className="watchlist-strip-stat">
                    <span className="label">القوة</span>
                    <span className="value">{pairStrength}/4</span>
                  </div>

                  <div className="watchlist-strip-strength">
                    <div className="watchlist-strip-meter">
                      <span className={`watchlist-strip-fill ${baseState === "neutre" ? "neutre" : STATE_META[baseState as keyof typeof STATE_META].accentClass} ${STATE_STRENGTH[baseState] > 0 ? "active" : ""}`} />
                      <span className={`watchlist-strip-fill ${quoteState === "neutre" ? "neutre" : STATE_META[quoteState as keyof typeof STATE_META].accentClass} ${STATE_STRENGTH[quoteState] > 0 ? "active" : ""}`} />
                    </div>
                    <div className="watchlist-strip-caption">
                      <span>{baseCurrency} {STATE_META[baseState as keyof typeof STATE_META]?.label ?? "NEU"}</span>
                      <span>{quoteCurrency} {STATE_META[quoteState as keyof typeof STATE_META]?.label ?? "NEU"}</span>
                    </div>
                  </div>
                </div>
                <div className="watchlist-strip-symbol">{symbol}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="watchlist-currency-board">
        <div className="watchlist-currency-board-header">
          <h2>قوة العملات الرئيسية</h2>
          <span className="watchlist-currency-board-badge">FOTSI Board</span>
        </div>

        <div className="watchlist-currency-grid">
          {strongestSnapshots.map((snapshot) => {
            const meta = STATE_META[snapshot.state as keyof typeof STATE_META] ?? STATE_META.neutre;
            const roundedValue = snapshot.value === null ? "--" : `${Math.round(snapshot.value) >= 0 ? "+" : ""}${Math.round(snapshot.value)}`;
            const deltaText = snapshot.delta === null ? "0.00%" : `${snapshot.delta >= 0 ? "+" : ""}${snapshot.delta.toFixed(2)}%`;
            const barWidth = `${Math.min(100, Math.max(8, Math.abs(snapshot.value ?? 0)))}%`;

            return (
              <article key={snapshot.currency} className="watchlist-currency-card">
                <div className="watchlist-currency-card-top">
                  <span className={`watchlist-currency-chip ${meta.accentClass}`}>{deltaText}</span>
                  <span className="watchlist-currency-code">{snapshot.currency}</span>
                </div>

                <div className="watchlist-currency-card-center">
                  <div className={`watchlist-currency-score ${meta.accentClass}`}>{roundedValue}</div>
                  <div className="watchlist-currency-subtitle">اليوم</div>
                </div>

                <div className="watchlist-currency-bar">
                  <div className={`watchlist-currency-bar-fill ${meta.accentClass}`} style={{ width: barWidth }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
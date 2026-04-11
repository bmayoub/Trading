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

type PairBias = "neutre" | "buy" | "strong_buy" | "sell" | "strong_sell";

const STATE_META = {
  SOB: { label: "SOB", accentClass: "sob", signalLabel: "بيع قوي", glyph: "⇊" },
  OB: { label: "OB", accentClass: "ob", signalLabel: "إشارة بيع", glyph: "↓" },
  neutre: { label: "NEU", accentClass: "neutre", signalLabel: "متعادل", glyph: "↔" },
  OS: { label: "OS", accentClass: "os", signalLabel: "إشارة شراء", glyph: "↑" },
  SOS: { label: "SOS", accentClass: "sos", signalLabel: "شراء قوي", glyph: "⇈" }
} as const;

const PAIR_BIAS_META: Record<PairBias, { label: string; accentClass: "sos" | "os" | "neutre" | "ob" | "sob"; glyph: string }> = {
  neutre: { label: "NEUTRAL", accentClass: "neutre", glyph: "↔" },
  buy: { label: "BUY", accentClass: "os", glyph: "↑" },
  strong_buy: { label: "STRONG BUY", accentClass: "sos", glyph: "⇈" },
  sell: { label: "SELL", accentClass: "ob", glyph: "↓" },
  strong_sell: { label: "STRONG SELL", accentClass: "sob", glyph: "⇊" }
};

type VisibleStrategyCurrencyState = keyof typeof STATE_META;

const FILTER_STATE_ORDER: VisibleStrategyCurrencyState[] = ["SOS", "SOB", "OB", "OS", "neutre"];

const STATE_SCORE: Record<StrategyCurrencyState, number> = {
  SOS: -2,
  OS: -1,
  neutre: 0,
  OB: 1,
  SOB: 2,
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

function getVisibleState(state: StrategyCurrencyState): VisibleStrategyCurrencyState {
  return state in STATE_META ? (state as VisibleStrategyCurrencyState) : "neutre";
}

function isStrongState(state: StrategyCurrencyState) {
  return state === "SOS" || state === "SOB";
}

function getPairBias(baseState: StrategyCurrencyState, quoteState: StrategyCurrencyState): PairBias {
  if (baseState === "neutre" || quoteState === "neutre") {
    return "neutre";
  }

  if (baseState === "unclassified" || quoteState === "unclassified") {
    return "neutre";
  }

  if ((isBullishState(baseState) && isBullishState(quoteState)) || (isBearishState(baseState) && isBearishState(quoteState))) {
    return "neutre";
  }

  if (isBullishState(baseState) && isBearishState(quoteState)) {
    return isStrongState(baseState) || isStrongState(quoteState) ? "strong_buy" : "buy";
  }

  if (isBearishState(baseState) && isBullishState(quoteState)) {
    return isStrongState(baseState) || isStrongState(quoteState) ? "strong_sell" : "sell";
  }

  return "neutre";
}

function getPairStrengthWidth(strength: number) {
  return `${Math.min(100, strength * 33.3333)}%`;
}

export function WatchlistPanel({ strategyKey }: WatchlistPanelProps) {
  const [data, setData] = useState<WatchlistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCurrencyStates, setVisibleCurrencyStates] = useState<Record<VisibleStrategyCurrencyState, boolean>>({
    SOS: true,
    SOB: true,
    OB: true,
    OS: true,
    neutre: true
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWatchlist() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/watchlist?strategyKey=${encodeURIComponent(strategyKey)}`);
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
    const baseState = snapshotByCurrency.get(baseCurrency)?.state ?? "neutre";
    const quoteState = snapshotByCurrency.get(quoteCurrency)?.state ?? "neutre";

    return -1 * (STATE_SCORE[baseState] ?? 0) * (STATE_SCORE[quoteState] ?? 0);
  };

  const sortedPairs = [...data.selectedPairs]
    .filter((symbol) => getPairStrength(symbol) > 0)
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
  const filteredSnapshots = strongestSnapshots.filter((snapshot) => visibleCurrencyStates[getVisibleState(snapshot.state)]);

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
        <div>
          {sortedPairs.length === 0 ? (
            <div className="watchlist-pair-empty">لا توجد أزواج بقوة أكبر من 0 الآن.</div>
          ) : sortedPairs.map((symbol) => {
            const { baseCurrency, quoteCurrency } = getPairCurrencies(symbol);
            const baseSnapshot = snapshotByCurrency.get(baseCurrency);
            const quoteSnapshot = snapshotByCurrency.get(quoteCurrency);
            const baseState = getVisibleState(baseSnapshot?.state ?? "neutre");
            const quoteState = getVisibleState(quoteSnapshot?.state ?? "neutre");
            const pairStrength = getPairStrength(symbol);
            const pairBias = getPairBias(baseState, quoteState);
            const biasMeta = PAIR_BIAS_META[pairBias];

            return (
              <article key={symbol} className="watchlist-strip">
                <div className="watchlist-strip-icon">{biasMeta.glyph}</div>
                <div className="watchlist-strip-main">
                  <div className={`watchlist-strip-badge ${biasMeta.accentClass}`}>
                    <strong className={biasMeta.accentClass}>{biasMeta.label}</strong>
                  </div>

                  <div className="watchlist-strip-stat">
                    <span className="value">{pairStrength}</span>
                  </div>

                  <div className="watchlist-strip-strength">
                    <div className="watchlist-strip-meter">
                      <span className={`watchlist-strip-fill ${biasMeta.accentClass} active`} style={{ width: getPairStrengthWidth(pairStrength) }} />
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
          <div className="watchlist-currency-board-actions">
            {FILTER_STATE_ORDER.map((stateKey) => {
              const meta = STATE_META[stateKey];

              return (
                <button
                  key={stateKey}
                  type="button"
                  className={`watchlist-state-toggle ${meta.accentClass} ${visibleCurrencyStates[stateKey] ? "active" : "inactive"}`}
                  aria-pressed={visibleCurrencyStates[stateKey]}
                  onClick={() => {
                    setVisibleCurrencyStates((current) => ({
                      ...current,
                      [stateKey]: !current[stateKey]
                    }));
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
            <span className="watchlist-currency-board-badge">FOTSI Board</span>
          </div>
        </div>

        <div className="watchlist-currency-grid">
          {filteredSnapshots.length === 0 ? <div className="watchlist-pair-empty">لا توجد عملات ظاهرة ضمن الفلاتر الحالية.</div> : filteredSnapshots.map((snapshot) => {
            const meta = STATE_META[getVisibleState(snapshot.state)];
            const deltaTone = snapshot.delta === null ? "neutral" : snapshot.delta >= 0 ? "positive" : "negative";
            const roundedValue = snapshot.value === null ? "--" : `${Math.round(snapshot.value) >= 0 ? "+" : ""}${Math.round(snapshot.value)}`;
            const deltaText = snapshot.delta === null ? "0.00%" : `${snapshot.delta >= 0 ? "+" : ""}${snapshot.delta.toFixed(2)}%`;
            const barWidth = `${Math.min(100, Math.max(8, Math.abs(snapshot.value ?? 0)))}%`;

            return (
              <article key={snapshot.currency} className="watchlist-currency-card">
                <div className="watchlist-currency-card-top">
                  <span className={`watchlist-currency-chip ${deltaTone}`}>{deltaText}</span>
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
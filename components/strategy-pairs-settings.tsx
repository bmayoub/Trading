"use client";

import { useEffect, useMemo, useState } from "react";

type StrategyPairsSettingsProps = {
  strategyLabel: string;
  strategyKey: string;
  allPairs: string[];
  initialPairs: string[];
};

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

export function StrategyPairsSettings({ strategyLabel, strategyKey, allPairs, initialPairs }: StrategyPairsSettingsProps) {
  const [selectedPairs, setSelectedPairs] = useState<string[]>(initialPairs);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupedPairs = useMemo(() => groupPairs(allPairs), [allPairs]);
  const selectedSet = useMemo(() => new Set(selectedPairs), [selectedPairs]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelection() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/settings/strategy-pairs?strategyKey=${encodeURIComponent(strategyKey)}`);
        const data = (await response.json()) as { ok: boolean; error?: string; symbols?: string[] };

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "تعذر تحميل أزواج الاستراتيجية من قاعدة البيانات.");
        }

        if (!isMounted) {
          return;
        }

        setSelectedPairs(Array.isArray(data.symbols) ? data.symbols : []);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل أزواج الاستراتيجية من قاعدة البيانات. قد تكون الأزواج المحفوظة موجودة، لكن القراءة فشلت مؤقتًا.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSelection();

    return () => {
      isMounted = false;
    };
  }, [strategyKey]);

  function togglePair(symbol: string) {
    setMessage(null);
    setError(null);
    setSelectedPairs((current) => (current.includes(symbol) ? current.filter((pair) => pair !== symbol) : [...current, symbol]));
  }

  async function saveSelection() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/settings/strategy-pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyKey, symbols: selectedPairs })
      });
      const data = (await response.json()) as { ok: boolean; error?: string; symbols?: string[] };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "تعذر حفظ أزواج الاستراتيجية في قاعدة البيانات.");
      }

      setSelectedPairs(data.symbols ?? selectedPairs);
      setMessage("تم حفظ أزواج الاستراتيجية الأولى.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ أزواج الاستراتيجية في قاعدة البيانات.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="strategy-settings-header">
        <div>
          <h2>{strategyLabel}</h2>
          <p className="muted">اختر الأزواج التي تدخل ضمن هذه الاستراتيجية فقط من قائمة الأزواج الـ 28.</p>
        </div>
        <button type="button" className="button" onClick={() => void saveSelection()} disabled={isSaving}>
          {isSaving ? "جارٍ الحفظ..." : "حفظ الأزواج"}
        </button>
      </div>

      <div className="strategy-settings-meta muted">
        <span>الأزواج المحددة: {selectedPairs.length}</span>
        <button type="button" className="button secondary" onClick={() => setSelectedPairs(allPairs)} disabled={isLoading || isSaving}>تحديد الكل</button>
        <button type="button" className="button secondary" onClick={() => setSelectedPairs([])} disabled={isLoading || isSaving}>إلغاء الكل</button>
      </div>

      {isLoading ? <div className="notice" style={{ marginTop: 12 }}>جارٍ تحميل أزواج الاستراتيجية الحالية...</div> : null}
      {message ? <div className="notice success" style={{ marginTop: 12 }}>{message}</div> : null}
      {error ? (
        <div className="notice danger" style={{ marginTop: 12 }}>
          <strong>تعذر تحميل أو حفظ أزواج الاستراتيجية.</strong>
          <div style={{ marginTop: 6 }}>{error}</div>
          <div style={{ marginTop: 6 }}>إذا ظهرت لك القائمة فارغة بعد انقطاع مؤقت، فهذا لا يعني أن الأزواج انحذفت بالضرورة.</div>
        </div>
      ) : null}

      <div className="strategy-pair-grid">
        {groupedPairs.map((row) => (
          <div key={row[0]} className="strategy-pair-row">
            {row.map((pair) => {
              const checked = selectedSet.has(pair);

              return (
                <label key={pair} className={`strategy-pair-chip ${checked ? "active" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => togglePair(pair)} disabled={isLoading || isSaving} />
                  <span>{pair}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
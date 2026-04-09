"use client";

import { useState, useTransition } from "react";

type ImportResponse = {
  ok: boolean;
  error?: string;
  result?: {
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    unmatchedSymbols: string[];
  };
};

export function ImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ImportResponse["result"]>();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);
        setStats(undefined);

        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const response = await fetch("/api/import/mt5-csv", {
            method: "POST",
            body: formData
          });

          const data = (await response.json()) as ImportResponse;

          if (!response.ok || !data.ok) {
            setError(data.error ?? "فشل استيراد الملف.");
            return;
          }

          setStats(data.result);
          setMessage("تم استيراد الملف إلى قاعدة البيانات بنجاح.");
          form.reset();
        });
      }}
    >
      <div className="upload-box">
        <label htmlFor="mt5-file"><strong>ملف CSV من MT5</strong></label>
        <p className="muted">ارفع الملف الذي صدرته من MT5 بصيغة mt5_h1_export.csv.</p>
        <input id="mt5-file" name="file" type="file" accept=".csv,text/csv" required />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "جارٍ الاستيراد..." : "استيراد ملف MT5"}
        </button>
      </div>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice danger">{error}</div> : null}

      {stats ? (
        <div className="card">
          <h2>نتيجة الاستيراد</h2>
          <div className="grid cards">
            <div>
              <div className="muted">إجمالي الصفوف</div>
              <div className="kpi">{stats.totalRows}</div>
            </div>
            <div>
              <div className="muted">الصفوف المستوردة</div>
              <div className="kpi">{stats.importedRows}</div>
            </div>
            <div>
              <div className="muted">الصفوف المتجاوزة</div>
              <div className="kpi">{stats.skippedRows}</div>
            </div>
          </div>

          {stats.unmatchedSymbols.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <h3>رموز غير مطابقة لجدول الأزواج</h3>
              <div className="code">
                <pre>{stats.unmatchedSymbols.join("\n")}</pre>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
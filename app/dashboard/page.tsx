export const dynamic = "force-dynamic";

import { PageTitle } from "@/components/header";
import { getDashboardRows } from "@/lib/queries";

export default async function DashboardPage() {
  const rows = await getDashboardRows();

  return (
    <div className="page-shell container">
      <PageTitle title="لوحة أزواج الفوركس" subtitle="مؤشرات محسوبة على آخر 500 شمعة ساعة لكل زوج." />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>الزوج</th>
              <th>عدد الشموع</th>
              <th>الإغلاق</th>
              <th>RSI 14</th>
              <th>EMA 20</th>
              <th>EMA 50</th>
              <th>الاتجاه</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">لا توجد بيانات بعد. شغّل SQL أولًا ثم نفّذ المزامنة الأولى.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row.symbol)}>
                  <td>{String(row.symbol)}</td>
                  <td>{Number(row.candles)}</td>
                  <td>{String(row.close ?? "-")}</td>
                  <td>{String(row.rsi14 ?? "-")}</td>
                  <td>{String(row.ema20 ?? "-")}</td>
                  <td>{String(row.ema50 ?? "-")}</td>
                  <td>
                    <span className={`badge ${row.trend === "bullish" ? "success" : row.trend === "bearish" ? "danger" : "warning"}`}>
                      {String(row.trend)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

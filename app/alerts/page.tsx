export const dynamic = "force-dynamic";

import { PageTitle } from "@/components/header";
import { getAlertRules, getRecentAlertEvents } from "@/lib/queries";

export default async function AlertsPage() {
  const [rules, events] = await Promise.all([getAlertRules(), getRecentAlertEvents()]);

  return (
    <div className="page-shell container">
      <PageTitle title="التنبيهات" subtitle="قواعد التنبيه المسجلة وسجل آخر الأحداث المرسلة." />

      <div className="page-split-grid">
        <div className="card table-wrap">
          <h2>القواعد</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>الزوج</th>
                <th>النوع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={5} className="muted">لا توجد قواعد بعد.</td></tr>
              ) : rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>{rule.name}</td>
                  <td>{rule.symbol}</td>
                  <td>{rule.condition_type}</td>
                  <td><span className={`badge ${rule.is_active ? "success" : "warning"}`}>{rule.is_active ? "نشط" : "متوقف"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card table-wrap">
          <h2>آخر الأحداث</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الزوج</th>
                <th>الرسالة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={4} className="muted">لا يوجد سجل بعد.</td></tr>
              ) : events.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.symbol}</td>
                  <td>{event.message}</td>
                  <td>{event.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

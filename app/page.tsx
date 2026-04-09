export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageTitle } from "@/components/header";
import { getDashboardSummary } from "@/lib/queries";

export default async function HomePage() {
  const summary = await getDashboardSummary();

  return (
    <>
      <PageTitle
        title="لوحة التداول"
        subtitle="نظام جاهز لـ Vercel لحفظ آخر 500 شمعة ساعة لـ 28 زوج فوركس، حساب المؤشرات، وتشغيل التنبيهات."
        action={<Link className="button" href="/dashboard">فتح اللوحة</Link>}
      />

      <div className="grid cards">
        <div className="card">
          <h3>الأزواج النشطة</h3>
          <div className="kpi">{summary.activePairs}</div>
          <div className="muted">الأزواج المفعلة في جدول pairs</div>
        </div>
        <div className="card">
          <h3>الشموع المخزنة</h3>
          <div className="kpi">{summary.totalCandles}</div>
          <div className="muted">كل الشموع المخزنة حاليًا في قاعدة البيانات</div>
        </div>
        <div className="card">
          <h3>التنبيهات النشطة</h3>
          <div className="kpi">{summary.activeAlerts}</div>
          <div className="muted">القواعد المفعلة في alert_rules</div>
        </div>
        <div className="card">
          <h3>آخر مزامنة</h3>
          <div className="kpi" style={{ fontSize: 20 }}>{summary.lastSync ?? "لا توجد بعد"}</div>
          <div className="muted">يتم التحديث كل ساعة بواسطة Vercel Cron</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>كيف يعمل المشروع</h2>
        <div className="grid">
          <div>1. عند أول تشغيل، نملأ لكل زوج آخر 100 شمعة ساعة.</div>
          <div>2. كل ساعة، نجلب شمعة مغلقة واحدة فقط لكل زوج.</div>
          <div>3. إذا تجاوز العدد 500، نحذف الأقدم ونبقي أحدث 500 فقط.</div>
          <div>4. بعد التحديث، نحسب المؤشرات ونفحص قواعد التنبيه ثم نرسل Telegram.</div>
        </div>
      </div>
    </>
  );
}

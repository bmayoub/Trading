export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageTitle } from "@/components/header";

export default function SettingsPage() {
  return (
    <>
      <PageTitle title="الإعدادات" subtitle="المتغيرات والخطوات المطلوبة قبل النشر على Vercel." />
      <div className="card">
        <h2>Environment Variables</h2>
        <div className="code">
          <pre>{`DATABASE_URL=postgres://...
CRON_SECRET=...
TWELVE_DATA_API_KEY=...
TWELVE_DATA_BASE_URL=https://api.twelvedata.com
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...`}</pre>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>استيراد بيانات MT5</h2>
        <p className="muted">إذا كان لديك ملف CSV من MT5، يمكنك رفعه مباشرة من داخل الموقع بدل استخدام أدوات خارجية.</p>
        <Link className="button" href="/import">فتح صفحة الاستيراد</Link>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>منطق التحديث</h2>
        <div className="grid">
          <div>التشغيل الأول: Seed آخر 100 شمعة.</div>
          <div>كل ساعة: Fetch لشمعة مغلقة واحدة فقط.</div>
          <div>الاحتفاظ دائمًا بأحدث 500 شمعة لكل زوج.</div>
          <div>بعد كل تحديث: حساب المؤشرات ثم فحص التنبيهات وإرسال Telegram.</div>
        </div>
      </div>
    </>
  );
}

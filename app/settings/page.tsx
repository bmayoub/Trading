export const dynamic = "force-dynamic";

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
BINANCE_BASE_URL=https://api.binance.com
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...`}</pre>
        </div>
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

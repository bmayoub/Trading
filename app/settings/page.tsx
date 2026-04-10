export const dynamic = "force-dynamic";

import { PageTitle } from "@/components/header";
import { ImportForm } from "@/app/import/import-form";
import { StrategyPairsSettings } from "@/components/strategy-pairs-settings";
import { DEFAULT_PAIRS } from "@/lib/defaults";
import { STRATEGY_ONE_KEY, STRATEGY_ONE_NAME } from "@/lib/strategy";

export default function SettingsPage() {
  return (
    <div className="page-shell container">
      <PageTitle title="الإعدادات" subtitle="المتغيرات والخطوات المطلوبة قبل النشر على Vercel وربط المزامنة عبر GitHub Actions." />
      <StrategyPairsSettings
        strategyLabel={STRATEGY_ONE_NAME}
        strategyKey={STRATEGY_ONE_KEY}
        allPairs={DEFAULT_PAIRS}
        initialPairs={[]}
      />
      <div className="card" style={{ marginTop: 16 }}>
        <h2>استيراد بيانات MT5</h2>
        <p className="muted">إذا كان لديك ملف CSV من MT5، يمكنك رفعه مباشرة من هنا بدون الانتقال إلى صفحة مستقلة.</p>
        <div className="grid" style={{ marginTop: 16 }}>
          <div>1. صدّر الملف من MT5 باستخدام سكربت التصدير.</div>
          <div>2. ارفع ملف CSV من هذا المربع.</div>
          <div>3. سيجري ربط symbol تلقائيًا مع جدول pairs ثم تنفيذ insert أو update داخل candles.</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <ImportForm />
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { PageTitle } from "@/components/header";
import { ImportForm } from "@/app/import/import-form";

export default function ImportPage() {
  return (
    <>
      <PageTitle title="استيراد CSV من MT5" subtitle="ارفع ملف الشموع من MT5 وسيتم إدخاله مباشرة إلى جدول candles." />

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>طريقة الاستخدام</h2>
        <div className="grid">
          <div>1. صدّر الملف من MT5 باستخدام سكربت التصدير.</div>
          <div>2. ارفع ملف CSV من هذه الصفحة.</div>
          <div>3. سيجري ربط symbol تلقائيًا مع جدول pairs ثم تنفيذ insert أو update داخل candles.</div>
        </div>
      </div>

      <ImportForm />
    </>
  );
}
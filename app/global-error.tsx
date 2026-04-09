"use client";

export default function GlobalError() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
          <div className="card">
            <h2>حدث خطأ غير متوقع</h2>
            <p className="muted">التطبيق واجه مشكلة أثناء التشغيل. إذا كانت قاعدة البيانات أو الشبكة غير متاحة، ستعود الصفحات للعمل بعد تصحيح الاتصال.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ reset }: ErrorProps) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>تعذر تحميل الصفحة</h2>
      <p className="muted">حدث خطأ أثناء تحميل البيانات. يمكنك المحاولة مرة أخرى، أو فتح الصفحة لاحقًا إذا كانت قاعدة البيانات غير متاحة.</p>
      <button className="button" onClick={() => reset()}>إعادة المحاولة</button>
    </div>
  );
}
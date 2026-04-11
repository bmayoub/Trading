import { generateFotsiSignalsForStrategy1 } from "@/lib/fotsi-signals";

export default async function Strategy1SignalsPage() {
  // جلب كل الإشارات (يفضل لاحقًا تخزينها في قاعدة البيانات)
  const signals = await generateFotsiSignalsForStrategy1();

  return (
    <div className="page-shell container">
      <h1>إشارات الاستراتيجية 1</h1>
      <div style={{marginTop: 24}}>
        {signals.length === 0 && <div className="muted">لا توجد إشارات حالياً.</div>}
        {signals.map((signal, idx) => (
          <div key={idx} className="card" style={{marginBottom: 12}}>
            <b>{signal.action === "BUY" ? "شراء" : "بيع"} {signal.symbol}</b>
            <div>الساعة: {signal.hour}</div>
            <div>Base: {signal.base} ({signal.baseState}, {signal.baseDelta})</div>
            <div>Quote: {signal.quote} ({signal.quoteState}, {signal.quoteDelta})</div>
          </div>
        ))}
      </div>
    </div>
  );
}

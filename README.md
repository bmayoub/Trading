# لوحة التداول - MVP

مشروع Next.js جاهز للنشر على Vercel من أجل:
- حفظ آخر 500 شمعة ساعة لـ 28 زوجًا
- التهيئة الأولى بآخر 100 شمعة فقط
- جلب شمعة مغلقة واحدة في كل تحديث
- حذف أقدم شمعة عند تجاوز 500
- حساب مؤشرات أساسية: RSI 14 / EMA 20 / EMA 50
- تشغيل تنبيهات وإرسالها إلى Telegram

## 1) التثبيت

```bash
npm install
cp .env.example .env
```

املأ المتغيرات داخل `.env`.

## 2) إنشاء قاعدة البيانات

نفّذ الملف:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## 3) تشغيل محلي

```bash
npm run dev
```

## 4) تشغيل المزامنة الأولى

بعد تشغيل الموقع، استدعِ المسار:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync-candles
```

أول مرة سيقوم بـ:
- seed آخر 100 شمعة لكل زوج
- ثم يحاول إضافة آخر شمعة مغلقة

في كل مرة لاحقة:
- سيجلب شمعة واحدة مغلقة فقط
- ثم سيحذف الأقدم إذا صار العدد أكبر من 500

## 5) اختبار Telegram

```bash
curl http://localhost:3000/api/alerts/test-telegram
```

## 6) أنواع التنبيه المدعومة حاليًا

- `rsi_below`
  - مثال params: `{ "threshold": 30 }`
- `ema_cross_up`
  - لا يحتاج params
- `close_above`
  - مثال params: `{ "level": 65000 }`

## 7) النشر على Vercel

1. ارفع المشروع إلى GitHub.
2. اربطه مع Vercel.
3. أضف Environment Variables نفسها.
4. تأكد أن `vercel.json` موجود لتفعيل cron.
5. بعد النشر، نفّذ SQL مرة واحدة.

## ملاحظات مهمة

- المسار يعتمد على Binance spot klines. يمكنك تغيير المزود من `lib/exchange.ts`.
- المشروع يقرأ فقط الشمعة المغلقة لتفادي الحسابات الخاطئة.
- إذا أردت لاحقًا إضافة واجهة إنشاء تنبيهات من المتصفح، نضيف صفحات CRUD بسهولة.

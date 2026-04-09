# لوحة التداول - فوركس MVP

## AI Context

إذا كنت تستخدم وكيل ذكاء صناعي أو تريد نقطة دخول سريعة لفهم المشروع، ابدأ من الملف `AI_CONTEXT.md` لأنه يحتوي على وصف مختصر للبنية، تدفق المزامنة، الجداول، الصفحات، ومسارات الـ API.

مشروع Next.js جاهز للنشر على Vercel من أجل:
- حفظ آخر 500 شمعة ساعة لـ 28 زوج فوركس كبير
- التهيئة الأولى بآخر 100 شمعة فقط
- جلب شمعة ساعة جديدة في كل تحديث
- حذف أقدم شمعة عند تجاوز 500
- حساب مؤشرات أساسية: RSI 14 / EMA 20 / EMA 50
- تشغيل تنبيهات وإرسالها إلى Telegram

## 1) التثبيت

```bash
npm install
cp .env.example .env.local
```

املأ المتغيرات داخل `.env.local`.

## 2) متغيرات البيئة

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
CRON_SECRET=change-this-secret
TWELVE_DATA_API_KEY=YOUR_TWELVE_DATA_KEY
TWELVE_DATA_BASE_URL=https://api.twelvedata.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
NEXT_PUBLIC_APP_NAME=Forex Trading Dashboard
```

## 3) إنشاء قاعدة البيانات

نفّذ الملف:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## 4) تشغيل محلي

```bash
npm run dev
```

## 4.1) استيراد ملف CSV من MT5

بعد تشغيل الموقع، افتح:

```text
http://localhost:3000/import
```

ثم ارفع ملف `mt5_h1_export.csv` وسيتم إدخاله مباشرة إلى جدول `candles`.

## 5) تشغيل المزامنة الأولى

بعد تشغيل الموقع، استدعِ المسار:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync-candles
```

أول مرة سيقوم بـ:
- seed آخر 100 شمعة لكل زوج فوركس
- ثم محاولة مزامنة آخر شمعة ساعة متاحة

في كل مرة لاحقة:
- سيجلب شمعة جديدة فقط لكل زوج
- ثم سيحذف الأقدم إذا صار العدد أكبر من 500

مهم: لأن مزود البيانات لديه حد credits بالدقيقة، فإن Vercel Cron يشغّل المزامنة على 4 دفعات صغيرة بين الدقيقة 1 و4 من كل ساعة بدل محاولة مزامنة كل الأزواج دفعة واحدة.

## 6) اختبار Telegram

```bash
curl http://localhost:3000/api/alerts/test-telegram
```

## 7) أنواع التنبيه المدعومة حاليًا

- `rsi_below`
  - مثال params: `{ "threshold": 30 }`
- `ema_cross_up`
  - لا يحتاج params
- `close_above`
  - مثال params: `{ "level": 1.1200 }`

## 8) الأزواج المضافة افتراضيًا

- EUR/USD
- GBP/USD
- USD/JPY
- USD/CHF
- AUD/USD
- USD/CAD
- NZD/USD
- EUR/GBP
- EUR/JPY
- EUR/CHF
- EUR/AUD
- EUR/CAD
- EUR/NZD
- GBP/JPY
- GBP/CHF
- GBP/AUD
- GBP/CAD
- GBP/NZD
- AUD/JPY
- AUD/CHF
- AUD/CAD
- AUD/NZD
- CAD/JPY
- CAD/CHF
- CHF/JPY
- NZD/JPY
- NZD/CAD
- NZD/CHF

## 9) النشر على Vercel

1. ارفع المشروع إلى GitHub.
2. اربطه مع Vercel.
3. أضف Environment Variables نفسها.
4. تأكد أن `vercel.json` موجود لتفعيل cron.
5. بعد النشر، نفّذ SQL مرة واحدة.

## ملاحظات مهمة

- مصدر الشموع الحالي هو Twelve Data من خلال `lib/exchange.ts`.
- المشروع يقرأ فقط آخر شموع ساعة المغلقة من المزود كما يعيدها endpoint.
- إذا أردت لاحقًا إضافة واجهة إنشاء تنبيهات من المتصفح، نضيف صفحات CRUD بسهولة.

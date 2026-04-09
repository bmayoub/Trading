# AI Context

## Project Identity

- Name: Trading Dashboard MVP
- Type: Next.js 14 App Router application
- UI language: Arabic
- Layout direction: RTL
- Deployment target: Vercel for the app, GitHub Actions for scheduled sync calls
- Domain: Forex monitoring, technical indicators, alerts, and Telegram notifications

## What This App Does

This project is a forex trading dashboard that:

- tracks 28 default forex pairs
- stores up to 500 hourly candles per pair in PostgreSQL
- seeds 100 candles for a pair on first sync
- fetches only the latest closed 1h candle on later sync runs
- calculates RSI 14, EMA 20, and EMA 50
- classifies trend from EMA 20 vs EMA 50
- evaluates alert rules after each successful candle insert
- records alert events and sends notifications to Telegram

## Core User-Facing Pages

- `/`: summary page with KPIs for active pairs, total candles, active alerts, and last sync
- `/dashboard`: table of active forex pairs with candle count, close price, RSI 14, EMA 20, EMA 50, and trend
- `/alerts`: alert rules table and recent alert events table
- `/settings`: environment/setup notes for deployment

## Main Backend Flow

1. The scheduled sync endpoint loads active pairs from the database.
2. For each pair, the app seeds 100 candles if the pair has no stored history.
3. The app fetches the latest closed hourly candle from Twelve Data.
4. If the candle is new, it is inserted into `candles`.
5. Old candles are pruned so each pair keeps only the newest 500 rows.
6. Indicators are recalculated from stored candles.
7. Active alert rules for that pair are evaluated.
8. Matching alerts are saved in `alert_events` and sent to Telegram.
9. Each sync attempt is logged in `sync_runs`.

## Data Source And Integrations

- Market data provider: Twelve Data
- Main integration file: `lib/exchange.ts`
- Telegram integration file: `lib/telegram.ts`
- Database client: `postgres`
- Database connection source: `DATABASE_URL`

## Important API Routes

- `/api/cron/sync-candles`: main sync endpoint, optionally protected by `CRON_SECRET`
- `/api/alerts/test-telegram`: sends a Telegram test message

## Database Model

Important tables in `db/schema.sql`:

- `pairs`: tracked forex symbols and activation state
- `candles`: OHLCV candle history keyed by pair and open time
- `alert_rules`: configured alert conditions per pair
- `alert_events`: triggered alert history
- `sync_runs`: log of sync activity per pair

## Supported Alert Types

- `rsi_below`
- `ema_cross_up`
- `close_above`

## Key Files For Fast Orientation

- `README.md`: human-oriented setup and usage
- `db/schema.sql`: database structure and default seed data
- `lib/candles.ts`: sync, seeding, pruning, and alert trigger entry point
- `lib/alerts.ts`: alert rule evaluation logic
- `lib/queries.ts`: dashboard and alerts page data access
- `lib/indicators.ts`: RSI and EMA calculations
- `app/api/cron/sync-candles/route.ts`: protected sync endpoint

## Environment Variables

- `DATABASE_URL`
- `CRON_SECRET`
- `TWELVE_DATA_API_KEY`
- `TWELVE_DATA_BASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `NEXT_PUBLIC_APP_NAME`

## Operational Notes

- Most pages are marked `force-dynamic` and read live data from the database.
- If Telegram credentials are missing, Telegram sends are skipped instead of failing the whole run.
- The current active market integration is Twelve Data.
- Production scheduling is intended to be handled by GitHub Actions hitting the sync endpoint in 4 hourly batches.
- There is a known documentation mismatch in `app/settings/page.tsx`, which still mentions `BINANCE_BASE_URL`; the active code does not use Binance.

## Safe Assumptions For Future Agents

- This project is not a brokerage or trading execution app; it is a monitoring and alerting dashboard.
- Candle interval is hourly only unless the code is explicitly changed.
- The intended retention policy is exactly the latest 500 candles per pair.
- The intended first-run bootstrap is 100 candles per pair.
import { ensureDb } from "@/lib/db";
import { buildIndicatorSnapshot, candleCloses, ema } from "@/lib/indicators";
import { sendTelegramMessage } from "@/lib/telegram";
import type { AlertRuleRow, Candle } from "@/lib/types";

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function crossedUp(prevFast: number | null, prevSlow: number | null, currentFast: number | null, currentSlow: number | null) {
  return prevFast !== null && prevSlow !== null && currentFast !== null && currentSlow !== null && prevFast <= prevSlow && currentFast > currentSlow;
}

export async function evaluatePairAlerts(pairId: number, symbol: string, candles: Candle[]) {
  const db = ensureDb();
  const rules = await db<AlertRuleRow[]>`
    select ar.id, ar.name, ar.pair_id, p.symbol as pair_symbol, ar.condition_type, ar.params, ar.is_active
    from alert_rules ar
    join pairs p on p.id = ar.pair_id
    where ar.pair_id = ${pairId} and ar.is_active = true
    order by ar.id desc
  `;

  if (rules.length === 0 || candles.length === 0) {
    return [];
  }

  const closes = candleCloses(candles);
  const current = buildIndicatorSnapshot(candles);
  const prevCloses = closes.slice(0, -1);
  const prevEma20 = ema(prevCloses, 20);
  const prevEma50 = ema(prevCloses, 50);

  const triggered: string[] = [];

  for (const rule of rules) {
    let matched = false;

    if (rule.condition_type === "rsi_below") {
      const threshold = asNumber(rule.params?.threshold, 30);
      matched = current.rsi14 !== null && current.rsi14 < threshold;
    }

    if (rule.condition_type === "ema_cross_up") {
      matched = crossedUp(prevEma20, prevEma50, current.ema20, current.ema50);
    }

    if (rule.condition_type === "close_above") {
      const level = asNumber(rule.params?.level, 0);
      matched = current.lastClose !== null && current.lastClose > level;
    }

    if (!matched) continue;

    const message = `🚨 ${symbol}\n${rule.name}\nالسعر: ${current.lastClose ?? "-"}\nRSI14: ${current.rsi14 ?? "-"}\nEMA20: ${current.ema20 ?? "-"}\nEMA50: ${current.ema50 ?? "-"}`;

    await db`
      insert into alert_events (rule_id, pair_id, message)
      values (${rule.id}, ${pairId}, ${message})
    `;

    await sendTelegramMessage(message);
    triggered.push(rule.name);
  }

  return triggered;
}

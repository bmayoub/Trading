// إشارات الاستراتيجية 1 حسب جدول FOTSI
import { getStrategyPairSymbolsStrict, classifyCurrency, WATCHLIST_CURRENCY_ORDER, type StrategyCurrencyState } from "./strategy";
import { getFotsiSeries, type FotsiSeries } from "./fotsi";
import { sendTelegramMessage } from "./telegram";

export type FotsiSignal = {
  symbol: string;
  action: "BUY" | "SELL";
  base: string;
  quote: string;
  baseState: StrategyCurrencyState;
  quoteState: StrategyCurrencyState;
  baseDelta: "Pos" | "Neg" | "Neutre";
  quoteDelta: "Pos" | "Neg" | "Neutre";
  hour: string;
};

const SIGNAL_RULES = [
  { base: "SOB", baseDelta: "Neg", quote: "SOS", quoteDelta: "Pos", action: "Sell" },
  { base: "SOB", baseDelta: "Neg", quote: "OS", quoteDelta: "Pos", action: "Sell" },
  { base: "SOS", baseDelta: "Pos", quote: "SOB", quoteDelta: "Neg", action: "Buy" },
  { base: "SOS", baseDelta: "Pos", quote: "OB", quoteDelta: "Neg", action: "Buy" },
  { base: "OS", baseDelta: "Pos", quote: "SOB", quoteDelta: "Neg", action: "Buy" },
  { base: "OB", baseDelta: "Neg", quote: "SOS", quoteDelta: "Pos", action: "Sell" },
];

function deltaType(delta: number|null): "Pos"|"Neg"|"Neutre" {
  if (delta === null) return "Neutre";
  if (delta > 0) return "Pos";
  if (delta < 0) return "Neg";
  return "Neutre";
}

export async function generateFotsiSignalsForStrategy1() {
  const selectedPairs = await getStrategyPairSymbolsStrict();
  const fotsiSeries: FotsiSeries = await getFotsiSeries(300);
  const now = new Date();
  const hour = now.toISOString().slice(0, 13) + ":00";

  // حساب آخر حالتين وتغير لكل عملة
  const currencyState: Record<string, { state: StrategyCurrencyState; delta: number|null; deltaType: "Pos"|"Neg"|"Neutre" }> = {};
  for (const currency of WATCHLIST_CURRENCY_ORDER) {
    const points = fotsiSeries[currency];
    const value = points.at(-2)?.value ?? null; // الشمعة قبل الأخيرة
    const last = points.at(-1)?.value ?? null; // الشمعة الأخيرة
    const delta = last !== null && value !== null ? last - value : null;
    currencyState[currency] = {
      state: classifyCurrency(value),
      delta,
      deltaType: deltaType(delta)
    };
  }

  const signals: FotsiSignal[] = [];
  for (const symbol of selectedPairs) {
    const [base, quote] = symbol.split("/");
    const baseInfo = currencyState[base];
    const quoteInfo = currencyState[quote];
    if (!baseInfo || !quoteInfo) continue;
    for (const rule of SIGNAL_RULES) {
      if (
        baseInfo.state === rule.base &&
        baseInfo.deltaType === rule.baseDelta &&
        quoteInfo.state === rule.quote &&
        quoteInfo.deltaType === rule.quoteDelta
      ) {
        signals.push({
          symbol,
          action: rule.action === "Buy" ? "BUY" : "SELL",
          base,
          quote,
          baseState: baseInfo.state,
          quoteState: quoteInfo.state,
          baseDelta: baseInfo.deltaType,
          quoteDelta: quoteInfo.deltaType,
          hour
        });
        break;
      }
    }
  }

  // إرسال الإشارات على التلغرام
  for (const signal of signals) {
    // استخراج قيم فوتسي لكل عملة
    const baseFotsi = fotsiSeries[signal.base]?.at(-1)?.value ?? "-";
    const quoteFotsi = fotsiSeries[signal.quote]?.at(-1)?.value ?? "-";
    // حساب قوة الزوج
    const pairStrength = baseFotsi !== "-" && quoteFotsi !== "-" ? Math.abs(baseFotsi) + Math.abs(quoteFotsi) : "-";
    const msg = `إشارة ${signal.action === "BUY" ? "شراء" : "بيع"} ${signal.symbol}\nالساعة: ${signal.hour}\nBase: ${signal.base} (${signal.baseState}, ${signal.baseDelta})\nQuote: ${signal.quote} (${signal.quoteState}, ${signal.quoteDelta})\nFOTSI ${signal.base}: ${baseFotsi}\nFOTSI ${signal.quote}: ${quoteFotsi}\nقوة الزوج: ${pairStrength}`;
    await sendTelegramMessage(msg);
  }

  return signals;
}

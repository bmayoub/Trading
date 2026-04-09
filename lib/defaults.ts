export const CURRENCY_PRIORITY = ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"] as const;

function getCurrencyRank(currency: string) {
  const index = CURRENCY_PRIORITY.indexOf(currency as (typeof CURRENCY_PRIORITY)[number]);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export function sortPairsByCurrencyPriority<T extends string | { symbol: string }>(pairs: T[]): T[] {
  return [...pairs].sort((left, right) => {
    const leftSymbol = typeof left === "string" ? left : left.symbol;
    const rightSymbol = typeof right === "string" ? right : right.symbol;

    const [leftBase = "", leftQuote = ""] = leftSymbol.split("/");
    const [rightBase = "", rightQuote = ""] = rightSymbol.split("/");

    const baseRank = getCurrencyRank(leftBase) - getCurrencyRank(rightBase);
    if (baseRank !== 0) {
      return baseRank;
    }

    const quoteRank = getCurrencyRank(leftQuote) - getCurrencyRank(rightQuote);
    if (quoteRank !== 0) {
      return quoteRank;
    }

    return leftSymbol.localeCompare(rightSymbol);
  });
}

export const DEFAULT_PAIRS = sortPairsByCurrencyPriority([
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "EUR/CAD", "EUR/NZD",
  "GBP/JPY", "GBP/CHF", "GBP/AUD", "GBP/CAD", "GBP/NZD",
  "AUD/JPY", "AUD/CHF", "AUD/CAD", "AUD/NZD",
  "CAD/JPY", "CAD/CHF", "CHF/JPY",
  "NZD/JPY", "NZD/CAD", "NZD/CHF"
]);

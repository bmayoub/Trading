import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getStrategyWatchlistData, STRATEGY_ONE_KEY } from "@/lib/strategy";
import { generateFotsiSignalsForStrategy1 } from "@/lib/fotsi-signals";

async function getCachedWatchlistData(strategyKey: string) {
  return unstable_cache(
    () => getStrategyWatchlistData(strategyKey),
    ["watchlist-data", strategyKey],
    {
      revalidate: 300,
      tags: [`watchlist:${strategyKey}`, `strategy-pairs:${strategyKey}`]
    }
  )();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyKey = searchParams.get("strategyKey") ?? STRATEGY_ONE_KEY;
    const data = await getCachedWatchlistData(strategyKey);
    let signals = [];
    if (strategyKey === STRATEGY_ONE_KEY) {
      signals = await generateFotsiSignalsForStrategy1();
    }
    return NextResponse.json({ ok: true, data: { ...data, fotsiSignals: signals } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل قائمة المراقبة.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
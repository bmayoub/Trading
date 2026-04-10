import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getStrategyWatchlistData, STRATEGY_ONE_KEY } from "@/lib/strategy";

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

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل قائمة المراقبة.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
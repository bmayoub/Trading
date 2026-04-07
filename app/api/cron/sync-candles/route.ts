import { NextRequest, NextResponse } from "next/server";
import { getActivePairs, seedPairIfNeeded, syncPair } from "@/lib/candles";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pairs = await getActivePairs();
    const results = [] as Array<Record<string, unknown>>;

    for (const pair of pairs) {
      const seeded = await seedPairIfNeeded(pair.id, pair.symbol);
      const synced = await syncPair(pair.id, pair.symbol);
      results.push({ symbol: pair.symbol, seeded, synced });
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

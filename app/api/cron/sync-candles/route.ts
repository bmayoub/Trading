import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getActivePairs, seedPairIfNeeded, syncPair } from "@/lib/candles";
import { refreshStoredFotsiSeries } from "@/lib/fotsi";

export const dynamic = "force-dynamic";

const DEFAULT_BATCH_SIZE = 7;
const DEFAULT_BATCH_MINUTES = [1, 2, 3, 4];

function shouldRefreshFotsi(request: NextRequest, batchIndex: number, batchCount: number) {
  const requested = request.nextUrl.searchParams.get("refreshFotsi");

  if (requested === "1" || requested === "true") {
    return true;
  }

  if (requested === "0" || requested === "false") {
    return false;
  }

  return batchIndex === batchCount - 1;
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBatchInfo(request: NextRequest, totalPairs: number) {
  const batchSize = parsePositiveInt(request.nextUrl.searchParams.get("batchSize"), DEFAULT_BATCH_SIZE);
  const batchCount = Math.max(1, Math.ceil(totalPairs / batchSize));
  const requestedBatchIndex = request.nextUrl.searchParams.get("batchIndex");

  let batchIndex = 0;
  if (requestedBatchIndex !== null) {
    batchIndex = Number.parseInt(requestedBatchIndex, 10);
  } else {
    const currentMinute = new Date().getUTCMinutes();
    const scheduledIndex = DEFAULT_BATCH_MINUTES.indexOf(currentMinute);
    batchIndex = scheduledIndex >= 0 ? scheduledIndex : currentMinute % batchCount;
  }

  const normalizedBatchIndex = ((batchIndex % batchCount) + batchCount) % batchCount;
  const offset = normalizedBatchIndex * batchSize;

  return {
    batchSize,
    batchCount,
    batchIndex: normalizedBatchIndex,
    offset
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pairs = await getActivePairs();
    const batch = getBatchInfo(request, pairs.length);
    const selectedPairs = pairs.slice(batch.offset, batch.offset + batch.batchSize);
    const results = [] as Array<Record<string, unknown>>;
    let fotsiRefreshed = false;
    let fotsiRefreshError: string | null = null;

    for (const pair of selectedPairs) {
      const seeded = await seedPairIfNeeded(pair.id, pair.symbol);
      const synced = await syncPair(pair.id, pair.symbol);
      results.push({ symbol: pair.symbol, seeded, synced });
    }

    if (shouldRefreshFotsi(request, batch.batchIndex, batch.batchCount)) {
      try {
        await refreshStoredFotsiSeries();
        fotsiRefreshed = true;
      } catch (error) {
        fotsiRefreshError = error instanceof Error ? error.message : "Unknown error";
        console.error("FOTSI refresh failed", error);
      }
    }

    revalidateTag("home-chart-data", "max");
    revalidateTag("chart-pairs", "max");
    revalidateTag("chart-candles", "max");
    for (const pair of selectedPairs) {
      revalidateTag(`chart-candles:${pair.symbol}`, "max");
    }
    revalidateTag(`watchlist:strategy_1`, "max");
    revalidatePath("/");
    revalidatePath("/watchlist");

    return NextResponse.json({
      ok: true,
      count: results.length,
      batch,
      fotsiRefreshed,
      fotsiRefreshError,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

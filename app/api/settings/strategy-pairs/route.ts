import { NextResponse } from "next/server";
import { getStrategyPairSymbols, saveStrategyPairSymbols, STRATEGY_ONE_KEY } from "@/lib/strategy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyKey = searchParams.get("strategyKey") ?? STRATEGY_ONE_KEY;
    const symbols = await getStrategyPairSymbols(strategyKey);

    return NextResponse.json({ ok: true, symbols });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل أزواج الاستراتيجية.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { strategyKey?: string; symbols?: string[] };
    const strategyKey = body.strategyKey ?? STRATEGY_ONE_KEY;
    const symbols = Array.isArray(body.symbols) ? body.symbols.filter((value): value is string => typeof value === "string") : [];
    const result = await saveStrategyPairSymbols(symbols, strategyKey);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "تعذر حفظ أزواج الاستراتيجية." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, symbols: result.symbols });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر حفظ أزواج الاستراتيجية.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
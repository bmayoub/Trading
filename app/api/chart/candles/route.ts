import { NextRequest, NextResponse } from "next/server";
import { getCandlesBySymbol } from "@/lib/queries";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ ok: false, error: "Missing symbol" }, { status: 400 });
  }

  try {
    const candles = await getCandlesBySymbol(symbol);
    return NextResponse.json({ ok: true, symbol, candles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { getFotsiSeries } from "@/lib/fotsi";

export const revalidate = 3600;

export async function GET() {
  try {
    const series = await getFotsiSeries();
    return NextResponse.json({ ok: true, series });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
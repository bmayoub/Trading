import { NextResponse } from "next/server";
import { getCryptoTestPayload } from "@/lib/crypto-test";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getCryptoTestPayload();
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
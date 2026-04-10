import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { refreshStoredFotsiSeries } from "@/lib/fotsi";
import { importMt5CsvText } from "@/lib/mt5-import";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "CSV file is required." }, { status: 400 });
    }

    const text = await file.text();
    const result = await importMt5CsvText(text);

    if (result.importedRows > 0) {
      await refreshStoredFotsiSeries();
      revalidateTag("home-chart-data", "max");
      revalidateTag("chart-pairs", "max");
      revalidateTag("chart-candles", "max");
      revalidatePath("/");
      revalidatePath("/watchlist");
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
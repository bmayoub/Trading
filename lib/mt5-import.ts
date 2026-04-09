import { ensureDb } from "@/lib/db";

type ParsedMt5Row = {
  brokerSymbol: string;
  symbol: string;
  timeframe: string;
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
};

type ImportResult = {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  unmatchedSymbols: string[];
};

const EXPECTED_HEADER = [
  "broker_symbol",
  "symbol",
  "timeframe",
  "open_time",
  "open",
  "high",
  "low",
  "close",
  "tick_volume",
  "real_volume",
  "spread"
];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDateTime(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Unsupported open_time format: ${value}`);
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

function parseMt5Csv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    throw new Error("CSV file has no data rows.");
  }

  const header = parseCsvLine(lines[0]);
  if (header.join(",") !== EXPECTED_HEADER.join(",")) {
    throw new Error("Unexpected CSV header. Export the file using the MT5 script format used by this project.");
  }

  const rows: ParsedMt5Row[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    if (values.length !== EXPECTED_HEADER.length) {
      throw new Error(`Invalid CSV row at line ${index + 1}`);
    }

    const [brokerSymbol, symbol, timeframe, openTime, open, high, low, close, tickVolume] = values;
    rows.push({
      brokerSymbol,
      symbol,
      timeframe,
      openTime: normalizeDateTime(openTime),
      open: toNumber(open),
      high: toNumber(high),
      low: toNumber(low),
      close: toNumber(close),
      tickVolume: toNumber(tickVolume)
    });
  }

  return rows;
}

export async function importMt5CsvText(text: string): Promise<ImportResult> {
  const db = ensureDb();
  const parsedRows = parseMt5Csv(text);
  const totalRows = parsedRows.length;
  const rows = parsedRows.filter((row) => row.timeframe === "H1");

  const pairRows = await db<{ id: number; symbol: string }[]>`select id, symbol from pairs`;
  const pairIdBySymbol = new Map(pairRows.map((row) => [row.symbol, row.id]));

  const unmatchedSymbols = new Set<string>();
  const candlesToImport = rows.flatMap((row) => {
    const pairId = pairIdBySymbol.get(row.symbol);
    if (!pairId) {
      unmatchedSymbols.add(row.symbol || row.brokerSymbol);
      return [];
    }

    return [{
      pair_id: pairId,
      open_time: row.openTime,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.tickVolume
    }];
  });

  const batchSize = 200;
  await db.begin(async (transaction) => {
    await transaction`set local statement_timeout = 0`;

    for (let offset = 0; offset < candlesToImport.length; offset += batchSize) {
      const batch = candlesToImport.slice(offset, offset + batchSize);
      if (batch.length === 0) {
        continue;
      }

      await transaction`
        insert into candles ${transaction(batch, "pair_id", "open_time", "open", "high", "low", "close", "volume")}
        on conflict (pair_id, open_time) do update
        set
          open = excluded.open,
          high = excluded.high,
          low = excluded.low,
          close = excluded.close,
          volume = excluded.volume
      `;
    }
  });

  return {
    totalRows,
    importedRows: candlesToImport.length,
    skippedRows: totalRows - candlesToImport.length,
    unmatchedSymbols: [...unmatchedSymbols].sort()
  };
}
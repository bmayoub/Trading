#property script_show_inputs

input string InpSymbols = "EURUSD,GBPUSD,USDJPY,USDCHF,AUDUSD,USDCAD,NZDUSD,EURGBP,EURJPY,EURCHF,EURAUD,EURCAD,EURNZD,GBPJPY,GBPCHF,GBPAUD,GBPCAD,GBPNZD,AUDJPY,AUDCHF,AUDCAD,AUDNZD,CADJPY,CADCHF,CHFJPY,NZDJPY,NZDCAD,NZDCHF";
input int InpBarsCount = 500;
input bool InpSkipCurrentOpenBar = true;
input string InpOutputFileName = "mt5_h1_export.csv";

string TrimSpaces(const string value)
{
   string result = value;
   StringTrimLeft(result);
   StringTrimRight(result);
   return result;
}

string NormalizeSymbol(const string brokerSymbol)
{
   string upper = TrimSpaces(brokerSymbol);
   StringToUpper(upper);

   if(StringLen(upper) < 6)
      return upper;

   string base = StringSubstr(upper, 0, 3);
   string quote = StringSubstr(upper, 3, 3);
   return base + "/" + quote;
}

string FormatDateTime(const datetime value)
{
   return TimeToString(value, TIME_DATE | TIME_MINUTES | TIME_SECONDS);
}

int ExportSymbol(const int fileHandle, const string brokerSymbol, const int barsToExport)
{
   MqlRates rates[];
   ArraySetAsSeries(rates, true);

   int copied = CopyRates(brokerSymbol, PERIOD_H1, 0, barsToExport + 1, rates);
   if(copied <= 0)
   {
      Print("CopyRates failed for ", brokerSymbol, ", error: ", GetLastError());
      return 0;
   }

   int startIndex = InpSkipCurrentOpenBar ? 1 : 0;
   if(startIndex >= copied)
      return 0;

   string appSymbol = NormalizeSymbol(brokerSymbol);
   int rowsWritten = 0;

   for(int index = copied - 1; index >= startIndex; index--)
   {
      MqlRates rate = rates[index];
      FileWrite(
         fileHandle,
         brokerSymbol,
         appSymbol,
         "H1",
         FormatDateTime(rate.time),
         DoubleToString(rate.open, _Digits),
         DoubleToString(rate.high, _Digits),
         DoubleToString(rate.low, _Digits),
         DoubleToString(rate.close, _Digits),
         IntegerToString((int)rate.tick_volume),
         IntegerToString((int)rate.real_volume),
         IntegerToString((int)rate.spread)
      );
      rowsWritten++;
   }

   return rowsWritten;
}

void OnStart()
{
   string symbols[];
   int symbolCount = StringSplit(InpSymbols, ',', symbols);
   if(symbolCount <= 0)
   {
      Print("No symbols configured in InpSymbols.");
      return;
   }

   int fileHandle = FileOpen(InpOutputFileName, FILE_WRITE | FILE_CSV | FILE_ANSI | FILE_COMMON, ',');
   if(fileHandle == INVALID_HANDLE)
   {
      Print("FileOpen failed for ", InpOutputFileName, ", error: ", GetLastError());
      return;
   }

   FileWrite(fileHandle, "broker_symbol", "symbol", "timeframe", "open_time", "open", "high", "low", "close", "tick_volume", "real_volume", "spread");

   int totalRows = 0;

   for(int i = 0; i < symbolCount; i++)
   {
      string brokerSymbol = TrimSpaces(symbols[i]);
      if(brokerSymbol == "")
         continue;

      if(!SymbolSelect(brokerSymbol, true))
      {
         Print("SymbolSelect failed for ", brokerSymbol, ", error: ", GetLastError());
         continue;
      }

      int written = ExportSymbol(fileHandle, brokerSymbol, InpBarsCount);
      totalRows += written;
      Print("Exported ", written, " H1 candles for ", brokerSymbol);
   }

   FileClose(fileHandle);

   string outputPath = TerminalInfoString(TERMINAL_COMMONDATA_PATH) + "\\Files\\" + InpOutputFileName;
   Print("Export complete. Total rows: ", totalRows);
   Print("CSV saved to: ", outputPath);
}
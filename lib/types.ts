export type Candle = {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PairRow = {
  id: number;
  symbol: string;
  is_active: boolean;
};

export type AlertRuleRow = {
  id: number;
  name: string;
  pair_id: number;
  pair_symbol: string;
  condition_type: "rsi_below" | "ema_cross_up" | "close_above";
  params: Record<string, unknown>;
  is_active: boolean;
};

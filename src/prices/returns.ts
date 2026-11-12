/** GeckoTerminal OHLCV row: [unixSeconds, open, high, low, close, volume]. */
export type Candle = readonly [number, number, number, number, number, number];

export const HORIZONS_MIN = [5, 15, 60] as const;

export type Returns = {
  /** Open of the candle containing t0, in the candle currency. */
  entry: number | null;
  /** Return in percent per horizon (minutes), null when t0+h is not past `asOfSec`. */
  atMin: Record<string, number | null>;
  /** Highest high and lowest low in the first 60 min, in percent of entry. */
  peak60Pct: number | null;
  trough60Pct: number | null;
  candles: number;
  complete: boolean;
};

/**
 * Pure. Candles are minute bars, any order. Minutes with no trade have no bar: the price is carried
 * forward from the last bar (assumption, stated here so it is not mistaken for a measurement).
 * Entry is the open of the bar that contains t0; no bar at or before t0 means no entry.
 */
export function computeReturns(candles: readonly Candle[], t0Sec: number, asOfSec: number): Returns {
  const bars = [...candles].sort((a, b) => a[0] - b[0]);
  const entryBar = [...bars].reverse().find((b) => b[0] <= t0Sec && t0Sec < b[0] + 60);
  const empty: Returns = {
    entry: null,
    atMin: Object.fromEntries(HORIZONS_MIN.map((h) => [String(h), null])),
    peak60Pct: null,
    trough60Pct: null,
    candles: bars.length,
    complete: false,
  };
  if (!entryBar || entryBar[1] <= 0) return empty;
  const entry = entryBar[1];
  const pct = (p: number) => ((p - entry) / entry) * 100;

  const atMin: Record<string, number | null> = {};
  for (const h of HORIZONS_MIN) {
    const target = t0Sec + h * 60;
    if (target > asOfSec) {
      atMin[String(h)] = null;
      continue;
    }
    // Last bar that has fully ended by the horizon: no price from after it.
    const last = [...bars].reverse().find((b) => b[0] + 60 <= target);
    atMin[String(h)] = last ? pct(last[4]) : null;
  }

  const window = bars.filter((b) => b[0] >= entryBar[0] && b[0] < t0Sec + 3600);
  const peak = window.length ? Math.max(...window.map((b) => b[2])) : null;
  const trough = window.length ? Math.min(...window.map((b) => b[3])) : null;
  const complete = t0Sec + 3600 <= asOfSec;
  return {
    entry,
    atMin,
    peak60Pct: peak === null ? null : pct(peak),
    trough60Pct: trough === null ? null : pct(trough),
    candles: bars.length,
    complete,
  };
}

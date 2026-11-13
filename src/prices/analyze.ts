export type PriceRow = {
  mint: string;
  quote: string | null;
  fetchedAt: string;
  returns: { complete: boolean; atMin: Record<string, number | null>; peak60Pct: number | null; trough60Pct: number | null };
};

export const MAX_MINT_ATTEMPTS = 3;

/** Mints with a complete row, or that have already been attempted at least `maxAttempts` times. */
export function settledMints(
  rows: readonly { mint: string; returns: { complete: boolean } }[],
  maxAttempts = MAX_MINT_ATTEMPTS,
): Set<string> {
  const out = new Set<string>();
  const attempts = new Map<string, number>();
  for (const r of rows) {
    if (r.returns.complete) {
      out.add(r.mint);
      continue;
    }
    const n = (attempts.get(r.mint) ?? 0) + 1;
    attempts.set(r.mint, n);
    if (n >= maxAttempts) out.add(r.mint);
  }
  return out;
}

export type Dist = { n: number; median: number; mean: number; shareUp: number };

/** Latest row per mint, complete rows only. A later incomplete row never replaces a complete one. */
export function latestComplete(rows: readonly PriceRow[]): PriceRow[] {
  const best = new Map<string, PriceRow>();
  for (const r of rows) {
    if (!r.returns.complete) continue;
    const cur = best.get(r.mint);
    if (!cur || r.fetchedAt > cur.fetchedAt) best.set(r.mint, r);
  }
  return [...best.values()];
}

export function dist(values: readonly (number | null)[]): Dist | null {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return {
    n: v.length,
    median: v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2,
    mean: v.reduce((a, b) => a + b, 0) / v.length,
    shareUp: v.filter((x) => x > 0).length / v.length,
  };
}

export type Bucket = "1 model" | "2-3 models" | "4+ models";
export const bucketOf = (nModels: number): Bucket => (nModels >= 4 ? "4+ models" : nModels >= 2 ? "2-3 models" : "1 model");

/**
 * Descriptive only: return distributions overall, by quote (SOL vs other), and by how many models
 * called the mint. No significance claim, no trading result. Fees, slippage and liquidity not included.
 */
export function analyze(rows: readonly PriceRow[], modelsByMint: ReadonlyMap<string, number>) {
  const done = latestComplete(rows);
  const group = (pick: (r: PriceRow) => string) => {
    const out: Record<string, Record<string, Dist | null>> = {};
    const keys = [...new Set(done.map(pick))].sort();
    for (const k of keys) {
      const sub = done.filter((r) => pick(r) === k);
      out[k] = {
        "5m": dist(sub.map((r) => r.returns.atMin["5"] ?? null)),
        "15m": dist(sub.map((r) => r.returns.atMin["15"] ?? null)),
        "60m": dist(sub.map((r) => r.returns.atMin["60"] ?? null)),
        peak60: dist(sub.map((r) => r.returns.peak60Pct)),
        trough60: dist(sub.map((r) => r.returns.trough60Pct)),
      };
    }
    return out;
  };
  return {
    mints: done.length,
    overall: group(() => "all"),
    byQuote: group((r) => (r.quote === "SOL" ? "SOL" : "other quote")),
    byModels: group((r) => bucketOf(modelsByMint.get(r.mint) ?? 1)),
  };
}

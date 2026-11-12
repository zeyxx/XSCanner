import type { AlertRecord } from "./record.js";

export type TokenSummary = {
  mint: string;
  symbol: string | null;
  firstAlertedAt: string;
  calls: number;
  models: string[];
};

export type Summary = {
  records: number;
  parseErrors: number;
  tokens: TokenSummary[];
  callsByModel: Record<string, number>;
  deliveryMs: { n: number; median: number; p95: number; max: number } | null;
};

function quantile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

/** Pure. One notification is one model's call; calls are grouped by mint. */
export function summarize(records: readonly AlertRecord[]): Summary {
  const byMint = new Map<string, TokenSummary & { seen: Set<string> }>();
  const callsByModel: Record<string, number> = {};
  const delays: number[] = [];
  let parseErrors = 0;

  for (const r of records) {
    if ("parseError" in r) {
      parseErrors += 1;
      continue;
    }
    if (r.deliveryMs !== null) delays.push(r.deliveryMs);
    const m = (r.message ?? {}) as Record<string, unknown>;
    const mint = typeof m.mint === "string" ? m.mint : null;
    const model = typeof m.model === "string" ? m.model : "unknown";
    callsByModel[model] = (callsByModel[model] ?? 0) + 1;
    if (!mint) continue;
    const alertedAt = typeof m.alertedAt === "string" ? m.alertedAt : r.receivedAt;
    const cur = byMint.get(mint) ?? {
      mint,
      symbol: typeof m.symbol === "string" ? m.symbol : null,
      firstAlertedAt: alertedAt,
      calls: 0,
      models: [],
      seen: new Set<string>(),
    };
    cur.calls += 1;
    if (alertedAt < cur.firstAlertedAt) cur.firstAlertedAt = alertedAt;
    if (!cur.seen.has(model)) {
      cur.seen.add(model);
      cur.models.push(model);
    }
    byMint.set(mint, cur);
  }

  delays.sort((a, b) => a - b);
  const tokens = [...byMint.values()]
    .map(({ seen: _seen, ...t }) => t)
    .sort((a, b) => a.firstAlertedAt.localeCompare(b.firstAlertedAt));
  return {
    records: records.length,
    parseErrors,
    tokens,
    callsByModel,
    deliveryMs: delays.length
      ? { n: delays.length, median: quantile(delays, 0.5), p95: quantile(delays, 0.95), max: delays.at(-1)! }
      : null,
  };
}

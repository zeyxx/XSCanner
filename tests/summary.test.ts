import { describe, expect, it } from "vitest";
import { summarize } from "../src/collect/summary.js";
import type { AlertRecord } from "../src/collect/record.js";

const rec = (mint: string, model: string, alertedAt: string, deliveryMs: number | null): AlertRecord => ({
  receivedAt: alertedAt,
  deliveryMs,
  message: { mint, model, symbol: mint.toUpperCase(), alertedAt },
});

describe("summarize", () => {
  it("groups model calls by mint and counts distinct models", () => {
    const s = summarize([
      rec("a", "m1", "2026-11-12T22:00:00.000Z", 100),
      rec("a", "m2", "2026-11-12T22:00:00.000Z", 200),
      rec("a", "m1", "2026-11-12T22:05:00.000Z", 300),
      rec("b", "m1", "2026-11-12T22:10:00.000Z", 400),
    ]);
    expect(s.tokens.map((t) => [t.mint, t.calls, t.models.length])).toEqual([
      ["a", 3, 2],
      ["b", 1, 1],
    ]);
    expect(s.callsByModel).toEqual({ m1: 3, m2: 1 });
    expect(s.deliveryMs).toEqual({ n: 4, median: 300, p95: 400, max: 400 });
  });
  it("counts parse errors and tolerates empty input", () => {
    const bad: AlertRecord = { receivedAt: "x", parseError: true, rawLength: 3 };
    expect(summarize([bad]).parseErrors).toBe(1);
    expect(summarize([]).deliveryMs).toBeNull();
  });
});

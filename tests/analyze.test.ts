import { describe, expect, it } from "vitest";
import { analyze, bucketOf, dist, latestComplete, settledMints, type PriceRow } from "../src/prices/analyze.js";

const row = (mint: string, fetchedAt: string, complete: boolean, r60: number | null, quote = "SOL"): PriceRow => ({
  mint, quote, fetchedAt,
  returns: { complete, atMin: { "5": r60, "15": r60, "60": r60 }, peak60Pct: r60, trough60Pct: r60 },
});

describe("analyze", () => {
  it("keeps the latest complete row and never lets an incomplete one replace it", () => {
    const out = latestComplete([row("a", "1", true, 10), row("a", "2", false, null), row("a", "3", true, 20), row("b", "1", false, 5)]);
    expect(out.map((r) => [r.mint, r.returns.atMin["60"]])).toEqual([["a", 20]]);
  });
  it("computes median, mean and share up, ignoring nulls", () => {
    expect(dist([-10, 30, null, 10])).toEqual({ n: 3, median: 10, mean: 10, shareUp: 2 / 3 });
    expect(dist([null])).toBeNull();
  });
  it("buckets by model count and groups by quote", () => {
    expect(bucketOf(1)).toBe("1 model");
    expect(bucketOf(3)).toBe("2-3 models");
    expect(bucketOf(11)).toBe("4+ models");
    const res = analyze([row("a", "1", true, 10, "SOL"), row("b", "1", true, -10, "NVDAx")], new Map([["a", 5], ["b", 1]]));
    expect(Object.keys(res.byQuote)).toEqual(["SOL", "other quote"]);
    expect(Object.keys(res.byModels)).toEqual(["1 model", "4+ models"]);
    expect(res.mints).toBe(2);
  });
  it("settles a mint once complete or after 3 incomplete attempts", () => {
    const s = settledMints([
      row("done", "1", true, 10),
      row("try2", "1", false, null),
      row("try2", "2", false, null),
      row("try3", "1", false, null),
      row("try3", "2", false, null),
      row("try3", "3", false, null),
    ]);
    expect([...s].sort()).toEqual(["done", "try3"]);
  });
});

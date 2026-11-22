import { describe, expect, it } from "vitest";
import { planComparison } from "../src/experiment/paid-run.js";

const NOW = Date.parse("2026-11-22T15:00:00Z");
const LIVE = [
  "--execute", "--limit", "2",
  "--max-usd", "0.020000",
  "--official-usd-per-request", "0.005000",
  "--getx-usd-per-request", "0.001000",
  "--pricing-reviewed-at", "2026-11-22",
  "--spending-cap-confirmed",
];

describe("paid comparison admission (no network or real credentials)", () => {
  it("is a dry-run by default with zero provider requests", () => {
    expect(planComparison([], NOW)).toEqual({
      execute: false, limit: 20, estimatedMaxUsd: null, maxProviderRequests: 0,
    });
    expect(planComparison(["--limit", "1", "--dry-run"], NOW)).toMatchObject({
      execute: false, maxProviderRequests: 0,
    });
  });

  it("requires explicit execution, reviewed pricing and provider-side caps", () => {
    expect(() => planComparison(["--execute", "--limit", "2"], NOW)).toThrow(/spending caps/);
    expect(() => planComparison(LIVE.filter(v => v !== "--spending-cap-confirmed"), NOW)).toThrow(/spending caps/);
    expect(() => planComparison([...LIVE, "--dry-run"], NOW)).toThrow(/Cannot combine/);
    expect(() => planComparison(["--limit", "2", "--max-usd", "1"], NOW)).toThrow(/without --execute/);
  });

  it("computes a conservative max of exactly two paid calls per mint", () => {
    expect(planComparison(LIVE, NOW)).toEqual({
      execute: true, limit: 2, maxProviderRequests: 4, estimatedMaxUsd: 0.012,
    });
    const shortBudget = LIVE.map((v, i) => LIVE[i - 1] === "--max-usd" ? "0.010000" : v);
    expect(() => planComparison(shortBudget, NOW)).toThrow(/exceeds/);
  });

  it("rejects ambiguous limits, unknown args and unbounded numbers", () => {
    for (const argv of [
      ["--limit", "0"], ["--limit", "51"], ["--limit", "-5"],
      ["--limit", "NaN"], ["--limit", "2.5"], ["--limit", "Infinity"],
      ["--foo"], ["--limit"], ["--limit", "2", "--limit", "3"],
    ]) {
      expect(() => planComparison(argv, NOW)).toThrow();
    }
  });

  it("rejects stale/invalid price attestations and zero-cost assumptions", () => {
    const stale = LIVE.map((v, i) => LIVE[i - 1] === "--pricing-reviewed-at" ? "2026-11-01" : v);
    const future = LIVE.map((v, i) => LIVE[i - 1] === "--pricing-reviewed-at" ? "2026-12-01" : v);
    const invalid = LIVE.map((v, i) => LIVE[i - 1] === "--pricing-reviewed-at" ? "2026-02-30" : v);
    const free = LIVE.map((v, i) => LIVE[i - 1] === "--official-usd-per-request" ? "0" : v);
    for (const argv of [stale, future, invalid, free]) {
      expect(() => planComparison(argv, NOW)).toThrow();
    }
  });
});

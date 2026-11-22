import { describe, expect, it } from "vitest";
import { assessP0Replay, type P0ReplayRow } from "../src/experiment/replay.js";

const minute = (s: string) => Date.parse(s);
const anchor = minute("2026-11-22T16:01:00Z");
const decision = minute("2026-11-22T16:01:10Z");
const rawBody = (counts: number[]) => ({
  data: counts.map((count, i) => ({
    start: new Date(anchor - 120_000 + i * 60_000).toISOString(),
    end: new Date(anchor - 60_000 + i * 60_000).toISOString(),
    tweet_count: count,
  })),
  meta: { total_tweet_count: counts.reduce((a, b) => a + b, 0) },
});
const observed = (counts: number[], overrides: Record<string, number | null> = {}) => ({
  rawResponse: rawBody(counts),
  acquisition: {
    requestStartedAtMs: overrides.requestStartedAtMs ?? decision - 8_000,
    responseReceivedAtMs: overrides.responseReceivedAtMs ?? decision - 4_000,
    queryWindowStartMs: anchor - 120_000,
    queryWindowEndMs: anchor,
  },
  availableAtMs: overrides.availableAtMs ?? decision - 1_000,
});
const row = (key: string, xCounts: P0ReplayRow["xCounts"]): P0ReplayRow => ({
  candidateKey: key,
  mint: "SyntheticMintA",
  population: "selected_alert",
  anchorAtMs: anchor,
  decisionAtMs: decision,
  xCounts,
  outcome: { return60mPct: -25, priceBasis: "anchor_minute_open_descriptive" },
});

describe("P0 replay evidence admission (synthetic-only)", () => {
  it("keeps all rows in the denominator, including zero, missing, late and duplicate mint moments", () => {
    const rows = [
      row("mintA@1", observed([0, 0])),
      row("mintA@2", observed([0, 2])),
      row("mintA@3", null),
      row("mintA@4", observed([0, 1], {
        responseReceivedAtMs: decision + 20_000,
        availableAtMs: decision + 21_000,
      })),
    ];
    const before = JSON.stringify(rows);
    const result = assessP0Replay(rows);
    expect(result).toMatchObject({
      mode: "P0_evidence_only", totalInputMoments: 4,
      selectedAlertMoments: 4, candidateDecisionMoments: 0,
      pointInTimeX: 2, measuredZeroX: 1, measuredNonzeroX: 1,
      missingX: 1, notAdmissibleX: 1, outcomesWithDescriptiveReturns: 4,
      ablationReady: false, executablePnlAvailable: false,
    });
    expect(result.decisions.map((x) => x.mentions)).toEqual([0, 2, null, null]);
    expect(result.decisions[3]).toMatchObject({ status: "not_admissible", reason: "feature_after_decision" });
    expect(JSON.stringify(rows)).toBe(before); // no input mutation
  });

  it("rejects retrospective counts even when the post's minute predates the decision", () => {
    const x = observed([0, 1], {
      requestStartedAtMs: decision + 100,
      responseReceivedAtMs: decision + 200,
      availableAtMs: decision + 200,
    });
    const result = assessP0Replay([row("late", x)]);
    expect(result.pointInTimeX).toBe(0);
    expect(result.notAdmissibleX).toBe(1);
    expect(result.decisions[0]?.mentions).toBeNull();
  });

  it("fails closed on missing or impossible feature availability", () => {
    const base = observed([0, 1]);
    for (const x of [
      { ...base, availableAtMs: null },
      { ...base, availableAtMs: base.acquisition.responseReceivedAtMs! - 1 },
      { ...base, acquisition: { ...base.acquisition, responseReceivedAtMs: null } },
    ]) {
      expect(assessP0Replay([row("missing", x)]).decisions[0]).toMatchObject({
        status: "not_admissible", reason: "missing_or_inconsistent_availability", mentions: null,
      });
    }
  });

  it("keeps incomplete pages and window gaps unknown rather than treating them as zero", () => {
    const incomplete = observed([0, 0]);
    incomplete.rawResponse = {
      ...incomplete.rawResponse,
      meta: { ...incomplete.rawResponse.meta, next_token: "next" },
    };
    const gap = observed([0]);
    const result = assessP0Replay([row("more", incomplete), row("gap", gap)]);
    expect(result).toMatchObject({ pointInTimeX: 0, notAdmissibleX: 2 });
    expect(result.decisions.map((x) => x.reason)).toEqual([
      "pagination_incomplete", "incomplete_window_coverage",
    ]);
  });

  it("refuses absent metadata, a mismatched total and malformed raw bins", () => {
    const valid = observed([0, 1]);
    const cases = [
      { ...valid.rawResponse, meta: undefined },
      { ...valid.rawResponse, meta: { total_tweet_count: 0 } },
      { ...valid.rawResponse, data: [
        valid.rawResponse.data[0],
        { ...valid.rawResponse.data[1], tweet_count: -1 },
      ] },
      { ...valid.rawResponse, data: [
        valid.rawResponse.data[0],
        { ...valid.rawResponse.data[1], tweet_count: 1.5 },
      ] },
    ];
    for (const rawResponse of cases) {
      const result = assessP0Replay([row("invalid", { ...valid, rawResponse })]);
      expect(result.decisions[0]).toMatchObject({
        status: "not_admissible", reason: "invalid_raw_counts", mentions: null,
      });
    }
  });

  it("rejects duplicate candidate moments, invalid time order and non-descriptive outcomes", () => {
    const a = row("same-key", null);
    expect(() => assessP0Replay([a, { ...a }])).toThrow(/unique/);
    expect(() => assessP0Replay([{ ...a, decisionAtMs: anchor - 1 }])).toThrow(/timestamps/);
    expect(() => assessP0Replay([{
      ...a, outcome: { return60mPct: Infinity, priceBasis: "anchor_minute_open_descriptive" },
    }])).toThrow(/descriptive/);
    expect(() => assessP0Replay([{
      ...a, outcome: { return60mPct: 3, priceBasis: "execution_quote" as never },
    }])).toThrow(/descriptive/);
  });

  it("separates candidate-decision rows from sent alerts without inferring universe completeness", () => {
    const a = { ...row("a", null), population: "candidate_decision" as const, outcome: null };
    const b = row("b", null);
    const result = assessP0Replay([a, b]);
    expect(result).toMatchObject({
      totalInputMoments: 2, selectedAlertMoments: 1,
      candidateDecisionMoments: 1, missingX: 2,
      outcomesWithDescriptiveReturns: 1, ablationReady: false,
    });
  });
});

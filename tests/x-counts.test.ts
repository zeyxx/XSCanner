import { describe, expect, it } from "vitest";
import { assessPointInTimeCounts, buildXCountsUrl, parseXCountsPage, summarizeXCountsBeforeCutoff } from "../src/adapters/x-counts.js";

describe("x-counts adapter", () => {
  it("builds minute-granularity counts URL", () => {
    const url = buildXCountsUrl("mint123", {
      startTimeIso: "2026-11-12T00:00:00.000Z",
      endTimeIso: "2026-11-13T00:00:00.000Z",
    });
    expect(url).toBe(
      "https://api.x.com/2/tweets/counts/recent?query=mint123&granularity=minute&start_time=2026-11-12T00%3A00%3A00.000Z&end_time=2026-11-13T00%3A00%3A00.000Z",
    );
  });

  it("parses bins and counts only bins ended at or before cutoffMs", () => {
    const page = parseXCountsPage({
      data: [
        { start: "2026-11-13T15:59:00.000Z", end: "2026-11-13T16:00:00.000Z", tweet_count: 2 },
        { start: "2026-11-13T16:00:00.000Z", end: "2026-11-13T16:01:00.000Z", tweet_count: 5 },
        { start: "2026-11-13T16:01:00.000Z", end: "2026-11-13T16:02:00.000Z", tweet_count: 1 },
      ],
      meta: { total_tweet_count: 8 },
    });
    const cutoff = Date.parse("2026-11-13T16:00:32.000Z");
    expect(summarizeXCountsBeforeCutoff(page, cutoff)).toEqual({
      totalReturned: 8,
      beforeCutoff: 2,
      nonzeroBinsBeforeCutoff: 1,
      binCount: 3,
      hasMore: false,
    });
  });
});


describe("point-in-time eligibility of official X counts", () => {
  const ms = (iso: string) => Date.parse(iso);
  const windowStart = ms("2026-11-14T15:59:00Z");
  const windowEnd = ms("2026-11-14T16:01:00Z");
  const request = ms("2026-11-14T16:01:02Z");
  const response = ms("2026-11-14T16:01:08Z");
  const decision = ms("2026-11-14T16:01:10Z");
  const page = parseXCountsPage({
    data: [
      { start: "2026-11-14T15:59:00Z", end: "2026-11-14T16:00:00Z", tweet_count: 0 },
      { start: "2026-11-14T16:00:00Z", end: "2026-11-14T16:01:00Z", tweet_count: 3 },
    ],
    meta: { total_tweet_count: 3 },
  });
  const evidence = {
    requestStartedAtMs: request,
    responseReceivedAtMs: response,
    queryWindowStartMs: windowStart,
    queryWindowEndMs: windowEnd,
    decisionAtMs: decision,
  };

  it("accepts actually received, complete minute bins and preserves measured zeros", () => {
    expect(assessPointInTimeCounts(page, evidence)).toEqual({
      status: "admissible",
      totalMentions: 3,
      binCount: 2,
    });
    const zeros = parseXCountsPage({
      data: [
        { start: "2026-11-14T15:59:00Z", end: "2026-11-14T16:00:00Z", tweet_count: 0 },
        { start: "2026-11-14T16:00:00Z", end: "2026-11-14T16:01:00Z", tweet_count: 0 },
      ],
      meta: { total_tweet_count: 0 },
    });
    expect(assessPointInTimeCounts(zeros, evidence)).toMatchObject({
      status: "admissible",
      totalMentions: 0,
    });
  });

  it("rejects a retrospective API response despite posts predating the decision", () => {
    expect(assessPointInTimeCounts(page, {
      ...evidence,
      responseReceivedAtMs: decision + 60_000,
    })).toEqual({ status: "not_admissible", reason: "response_after_decision" });
  });

  it("rejects missing acquisition timestamps instead of imputing availability", () => {
    expect(assessPointInTimeCounts(page, {
      ...evidence,
      responseReceivedAtMs: null,
    })).toEqual({ status: "not_admissible", reason: "missing_or_invalid_timing" });
  });

  it("rejects incomplete pagination and never treats it as a zero count", () => {
    expect(assessPointInTimeCounts({ ...page, nextToken: "more" }, evidence)).toEqual({
      status: "not_admissible", reason: "pagination_incomplete",
    });
    expect(assessPointInTimeCounts({ ...page, bins: [] }, evidence)).toEqual({
      status: "not_admissible", reason: "missing_or_invalid_bins",
    });
  });

  it("rejects gaps, duplicates and missing boundary minutes", () => {
    const skipped = { ...page, bins: [page.bins[1]!] };
    expect(assessPointInTimeCounts(skipped, evidence)).toEqual({
      status: "not_admissible", reason: "incomplete_window_coverage",
    });
    const duplicated = { ...page, bins: [...page.bins, page.bins[0]!] };
    expect(assessPointInTimeCounts(duplicated, evidence)).toEqual({
      status: "not_admissible", reason: "incomplete_window_coverage",
    });
  });

  it("rejects negative counts and bins which were not fully closed when fetched", () => {
    expect(assessPointInTimeCounts({
      ...page, bins: [{ ...page.bins[0]!, tweetCount: -1 }, page.bins[1]!],
    }, evidence)).toEqual({ status: "not_admissible", reason: "missing_or_invalid_bins" });
    expect(assessPointInTimeCounts(page, {
      ...evidence,
      responseReceivedAtMs: windowStart + 30_000,
      requestStartedAtMs: windowStart + 20_000,
      decisionAtMs: windowStart + 40_000,
    }).status).toBe("not_admissible");
  });

  it("treats the response timestamp as admissible on the exact decision boundary", () => {
    expect(assessPointInTimeCounts(page, { ...evidence, decisionAtMs: response }).status).toBe("admissible");
  });
});

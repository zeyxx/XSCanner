import { describe, expect, it } from "vitest";
import { buildXCountsUrl, parseXCountsPage, summarizeXCountsBeforeCutoff } from "../src/adapters/x-counts.js";

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

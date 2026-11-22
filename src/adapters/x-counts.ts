/**
 * Pure parser and URL builder for Official X API v2 `GET /2/tweets/counts/recent`.
 * No network I/O, no clock, no secret.
 */
export type XCountBin = {
  start: string;
  end: string;
  startMs: number;
  endMs: number;
  tweetCount: number;
};

export type XCountsPage = {
  bins: XCountBin[];
  totalTweetCount: number;
  nextToken: string | null;
};

/**
 * Builds `/2/tweets/counts/recent` URL with minute granularity.
 * Note (docs/EXPERIMENTS.md E2): `end_time` must be >= ~15 s before `now`, and `start_time` within 7 days.
 */
export function buildXCountsUrl(
  query: string,
  opts: { startTimeIso?: string; endTimeIso?: string; nextToken?: string } = {},
): string {
  const u = new URL("https://api.x.com/2/tweets/counts/recent");
  u.searchParams.set("query", query);
  u.searchParams.set("granularity", "minute");
  if (opts.startTimeIso) u.searchParams.set("start_time", opts.startTimeIso);
  if (opts.endTimeIso) u.searchParams.set("end_time", opts.endTimeIso);
  if (opts.nextToken) u.searchParams.set("next_token", opts.nextToken);
  return u.toString();
}

export function parseXCountsPage(raw: unknown): XCountsPage {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const data = Array.isArray(obj.data) ? obj.data : [];
  const bins: XCountBin[] = [];

  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const b = item as Record<string, unknown>;
    const start = typeof b.start === "string" ? b.start : null;
    const end = typeof b.end === "string" ? b.end : null;
    const tweetCount = typeof b.tweet_count === "number" ? b.tweet_count : null;
    if (!start || !end || tweetCount === null) continue;
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    bins.push({ start, end, startMs, endMs, tweetCount });
  }

  const meta = typeof obj.meta === "object" && obj.meta !== null ? (obj.meta as Record<string, unknown>) : {};
  const totalTweetCount =
    typeof meta.total_tweet_count === "number"
      ? meta.total_tweet_count
      : bins.reduce((s, b) => s + b.tweetCount, 0);
  const nextToken =
    typeof meta.next_token === "string" && meta.next_token.length > 0 ? meta.next_token : null;

  return { bins, totalTweetCount, nextToken };
}

/**
 * Sums bins strictly ended at or before `cutoffMs` (`endMs <= cutoffMs`) to avoid look-ahead
 * into the minute containing `t0`.
 */
export function summarizeXCountsBeforeCutoff(page: XCountsPage, cutoffMs: number) {
  let beforeCutoff = 0;
  let nonzeroBinsBeforeCutoff = 0;
  for (const b of page.bins) {
    if (b.endMs <= cutoffMs) {
      beforeCutoff += b.tweetCount;
      if (b.tweetCount > 0) nonzeroBinsBeforeCutoff += 1;
    }
  }
  return {
    totalReturned: page.totalTweetCount,
    beforeCutoff,
    nonzeroBinsBeforeCutoff,
    binCount: page.bins.length,
    hasMore: page.nextToken !== null,
  };
}


/**
 * Research-only, deterministic admissibility gate for a historical X counts page.
 *
 * A post created before an alert is NOT necessarily available to a strategy at that
 * alert: a retrospective API call may have fetched it hours later. Timestamps below
 * must be recorded by the collector when the HTTP request actually occurs. No
 * current-time defaults are allowed; absent evidence is unknown, never zero.
 *
 * For this first pilot the requested window must use complete, contiguous minute
 * bins, with exact boundaries. Queries with partial boundary minutes are marked
 * unknown until their coverage semantics have been characterized.
 */
export type CountsAcquisitionEvidence = {
  requestStartedAtMs: number | null;
  responseReceivedAtMs: number | null;
  queryWindowStartMs: number | null;
  queryWindowEndMs: number | null;
  decisionAtMs: number;
};

export type DecisionCountAssessment =
  | { status: "admissible"; totalMentions: number; binCount: number }
  | {
      status: "not_admissible";
      reason:
        | "missing_or_invalid_timing"
        | "response_after_decision"
        | "future_or_unclosed_window"
        | "pagination_incomplete"
        | "missing_or_invalid_bins"
        | "incomplete_window_coverage";
    };

export function assessPointInTimeCounts(
  page: XCountsPage,
  evidence: CountsAcquisitionEvidence,
): DecisionCountAssessment {
  const {
    requestStartedAtMs: requested,
    responseReceivedAtMs: received,
    queryWindowStartMs: start,
    queryWindowEndMs: end,
    decisionAtMs: decision,
  } = evidence;
  if (
    requested === null || received === null || start === null || end === null ||
    ![requested, received, start, end, decision].every(Number.isFinite) ||
    requested > received || start >= end
  ) {
    return { status: "not_admissible", reason: "missing_or_invalid_timing" };
  }
  if (received > decision) {
    return { status: "not_admissible", reason: "response_after_decision" };
  }
  if (end > decision || end > received) {
    return { status: "not_admissible", reason: "future_or_unclosed_window" };
  }
  if (page.nextToken !== null) {
    return { status: "not_admissible", reason: "pagination_incomplete" };
  }
  if (page.bins.length === 0) {
    return { status: "not_admissible", reason: "missing_or_invalid_bins" };
  }

  const bars = [...page.bins].sort((a, b) => a.startMs - b.startMs);
  let total = 0;
  let expectedStart = start;
  for (const bin of bars) {
    if (
      !Number.isFinite(bin.startMs) || !Number.isFinite(bin.endMs) ||
      !Number.isSafeInteger(bin.tweetCount) || bin.tweetCount < 0 ||
      bin.endMs - bin.startMs !== 60_000 || bin.startMs < start ||
      bin.endMs > end || bin.endMs > received
    ) {
      return { status: "not_admissible", reason: "missing_or_invalid_bins" };
    }
    if (bin.startMs !== expectedStart) {
      return { status: "not_admissible", reason: "incomplete_window_coverage" };
    }
    total += bin.tweetCount;
    if (!Number.isSafeInteger(total)) {
      return { status: "not_admissible", reason: "missing_or_invalid_bins" };
    }
    expectedStart = bin.endMs;
  }
  if (expectedStart !== end) {
    return { status: "not_admissible", reason: "incomplete_window_coverage" };
  }
  return { status: "admissible", totalMentions: total, binCount: bars.length };
}

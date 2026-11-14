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

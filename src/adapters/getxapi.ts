/**
 * Pure parser and URL builder for GetXAPI's `GET /twitter/tweet/advanced_search`.
 * No network I/O, no clock, no secret.
 */
export type GetXApiTweet = {
  id: string;
  createdAt: string | null;
  createdAtMs: number | null;
  authorId: string | null;
  authorHandle: string | null;
  authorFollowers: number | null;
  text: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
};

export type GetXApiPage = {
  tweets: GetXApiTweet[];
  hasMore: boolean;
  nextCursor: string | null;
};

export function buildGetXApiSearchUrl(
  query: string,
  opts: { product?: "Latest" | "Top"; cursor?: string } = {},
): string {
  const u = new URL("https://api.getxapi.com/twitter/tweet/advanced_search");
  u.searchParams.set("q", query);
  u.searchParams.set("product", opts.product ?? "Latest");
  if (opts.cursor) u.searchParams.set("cursor", opts.cursor);
  return u.toString();
}

export function parseGetXApiPage(raw: unknown): GetXApiPage {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(obj.tweets) ? obj.tweets : [];
  const tweets: GetXApiTweet[] = [];

  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const t = item as Record<string, unknown>;
    const id = typeof t.id === "string" ? t.id : typeof t.id_str === "string" ? t.id_str : null;
    if (!id) continue;
    const createdAt = typeof t.createdAt === "string" ? t.createdAt : typeof t.created_at === "string" ? t.created_at : null;
    const parsedMs = createdAt ? Date.parse(createdAt) : NaN;
    const author = typeof t.author === "object" && t.author !== null ? (t.author as Record<string, unknown>) : {};
    tweets.push({
      id,
      createdAt,
      createdAtMs: Number.isFinite(parsedMs) ? parsedMs : null,
      authorId: typeof author.id === "string" ? author.id : null,
      authorHandle: typeof author.userName === "string" ? author.userName : null,
      authorFollowers: typeof author.followers === "number" ? author.followers : null,
      text: typeof t.text === "string" ? t.text : "",
      likeCount: typeof t.likeCount === "number" ? t.likeCount : 0,
      retweetCount: typeof t.retweetCount === "number" ? t.retweetCount : 0,
      replyCount: typeof t.replyCount === "number" ? t.replyCount : 0,
      quoteCount: typeof t.quoteCount === "number" ? t.quoteCount : 0,
    });
  }

  const nextCursor =
    typeof obj.next_cursor === "string" && obj.next_cursor.length > 0 ? obj.next_cursor : null;
  const hasMore = typeof obj.has_more === "boolean" ? obj.has_more : nextCursor !== null;
  return { tweets, hasMore, nextCursor };
}

/** Counts tweets and unique authors strictly at or before `cutoffMs` (when provided). */
export function summarizeGetXApiPage(page: GetXApiPage, cutoffMs?: number) {
  const eligible =
    cutoffMs === undefined
      ? page.tweets
      : page.tweets.filter((t) => t.createdAtMs !== null && t.createdAtMs <= cutoffMs);
  const authors = new Set(eligible.map((t) => t.authorId ?? t.authorHandle ?? t.id));
  return {
    totalReturned: page.tweets.length,
    beforeCutoff: eligible.length,
    uniqueAuthorsBeforeCutoff: authors.size,
    hasMore: page.hasMore,
  };
}

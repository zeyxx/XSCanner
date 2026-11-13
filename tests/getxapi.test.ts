import { describe, expect, it } from "vitest";
import { buildGetXApiSearchUrl, parseGetXApiPage, summarizeGetXApiPage } from "../src/adapters/getxapi.js";

describe("getxapi adapter", () => {
  it("builds advanced_search URL with Latest default and optional cursor", () => {
    expect(buildGetXApiSearchUrl("mint123 -is:retweet")).toBe(
      "https://api.getxapi.com/twitter/tweet/advanced_search?q=mint123+-is%3Aretweet&product=Latest",
    );
    expect(buildGetXApiSearchUrl("mint123", { product: "Top", cursor: "cur_1" })).toContain(
      "product=Top&cursor=cur_1",
    );
  });

  it("parses tweets and counts unique authors before cutoff", () => {
    const page = parseGetXApiPage({
      tweet_count: 3,
      has_more: true,
      next_cursor: "abc",
      tweets: [
        {
          id: "1",
          text: "first",
          createdAt: "Thu Nov 12 22:20:00 +0000 2026",
          likeCount: 5,
          author: { id: "u1", userName: "alice", followers: 100 },
        },
        {
          id: "2",
          text: "second by same author",
          createdAt: "Thu Nov 12 22:21:00 +0000 2026",
          author: { id: "u1", userName: "alice", followers: 100 },
        },
        {
          id: "3",
          text: "after alert",
          createdAt: "Thu Nov 12 22:30:00 +0000 2026",
          author: { id: "u2", userName: "bob", followers: 50 },
        },
      ],
    });
    expect(page.tweets).toHaveLength(3);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("abc");

    const cutoff = Date.parse("2026-11-12T22:25:00Z");
    expect(summarizeGetXApiPage(page, cutoff)).toEqual({
      totalReturned: 3,
      beforeCutoff: 2,
      uniqueAuthorsBeforeCutoff: 1,
      hasMore: true,
    });
  });
});

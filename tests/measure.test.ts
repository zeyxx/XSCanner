import { describe, expect, it } from "vitest";
import { measureAttention } from "../src/measure.js";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SYSTEM = "11111111111111111111111111111111";
const MINT = "9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump";

const countsBody = {
  data: [
    {
      start: "2026-10-30T17:10:50.000Z",
      end: "2026-10-30T17:11:00.000Z",
      tweet_count: 0,
    },
    {
      start: "2026-10-30T18:52:00.000Z",
      end: "2026-10-30T18:53:00.000Z",
      tweet_count: 1,
    },
  ],
  meta: { total_tweet_count: 1 },
};

describe("measureAttention", () => {
  it("does not call counts when the account is a wallet", async () => {
    let countsCalls = 0;
    const result = await measureAttention(MINT, {
      now: () => new Date("2026-11-06T17:05:50Z"),
      readAccount: async () => ({
        kind: "account",
        owner: SYSTEM,
        executable: false,
        dataLength: 0,
      }),
      readCounts: async () => {
        countsCalls += 1;
        return countsBody;
      },
      cache: new Map(),
    });

    expect(result.kind).toBe("not_a_mint");
    expect(countsCalls).toBe(0);
  });

  it("returns zero bins for a mint and does not drop them", async () => {
    let countsCalls = 0;
    const result = await measureAttention(MINT, {
      now: () => new Date("2026-11-06T17:05:50Z"),
      readAccount: async () => ({
        kind: "account",
        owner: TOKEN_2022,
        executable: false,
        dataLength: 568,
      }),
      readCounts: async () => {
        countsCalls += 1;
        return countsBody;
      },
      cache: new Map(),
    });

    expect(result.kind).toBe("measured");
    if (result.kind !== "measured") return;
    expect(countsCalls).toBe(1);
    expect(result.bins).toHaveLength(2);
    expect(result.bins[0]?.tweet_count).toBe(0);
    expect(result.page.complete).toBe(true);
  });

  it("does not call counts again the same UTC day", async () => {
    let countsCalls = 0;
    const cache = new Map();
    const deps = {
      now: () => new Date("2026-11-06T17:05:50Z"),
      readAccount: async () => ({
        kind: "account" as const,
        owner: TOKEN_2022,
        executable: false,
        dataLength: 568,
      }),
      readCounts: async () => {
        countsCalls += 1;
        return countsBody;
      },
      cache,
    };

    await measureAttention(MINT, deps);
    await measureAttention(MINT, deps);

    expect(countsCalls).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { isMint, measureAttention } from "../src/measure.js";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SYSTEM = "11111111111111111111111111111111";
const TOKEN_LEGACY = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const mintBytes = (length = 82): Uint8Array => {
  const data = new Uint8Array(length);
  data[45] = 1; // Base SPL Mint isInitialized flag
  if (length > 165) data[165] = 1; // Token-2022 AccountType.Mint
  return data;
};
const MINT = "9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump";

const countsBody = {
  data: [
    {
      start: "2026-10-30T17:10:00.000Z",
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
        data: new Uint8Array(),
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
        data: mintBytes(568),
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

  it("does not call counts again the same UTC minute", async () => {
    let countsCalls = 0;
    const cache = new Map();
    const deps = {
      now: () => new Date("2026-11-06T17:05:50Z"),
      readAccount: async () => ({
        kind: "account" as const,
        owner: TOKEN_2022,
        executable: false,
        data: mintBytes(568),
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

describe("counts integrity and minute-scale freshness", () => {
  const validMint = () => ({
    kind: "account" as const,
    owner: TOKEN_2022,
    executable: false,
    data: mintBytes(),
  });

  it("never turns malformed, missing or empty responses into measured zero", async () => {
    const invalid = [
      null, {}, { meta: { total_tweet_count: 0 } },
      { data: [], meta: { total_tweet_count: 0 } },
      { data: [{ start: "bad", end: "2026-10-30T17:11:00Z", tweet_count: 0 }], meta: { total_tweet_count: 0 } },
      { data: [{ start: "2026-10-30T17:10:00Z", end: "2026-10-30T17:11:00Z", tweet_count: -1 }], meta: { total_tweet_count: 0 } },
      { data: [{ start: "2026-10-30T17:10:00Z", end: "2026-10-30T17:11:00Z", tweet_count: 2 }], meta: { total_tweet_count: 1 } },
    ];
    for (const body of invalid) {
      const cache = new Map();
      const result = await measureAttention(MINT, {
        now: () => new Date("2026-11-22T16:00:00Z"),
        readAccount: async () => validMint(),
        readCounts: async () => body,
        cache,
      });
      expect(result).toEqual({ kind: "unknown", reason: "invalid_counts" });
      expect(cache.size).toBe(0);
    }
  });

  it("retains a real zero bin, but rejects incomplete pagination without caching", async () => {
    const zero = {
      data: [{ start: "2026-10-30T17:10:00Z", end: "2026-10-30T17:11:00Z", tweet_count: 0 }],
      meta: { total_tweet_count: 0 },
    };
    const cache = new Map();
    const deps = {
      now: () => new Date("2026-11-22T16:00:00Z"),
      readAccount: async () => validMint(),
      readCounts: async () => zero,
      cache,
    };
    const measured = await measureAttention(MINT, deps);
    expect(measured.kind).toBe("measured");
    if (measured.kind === "measured") {
      expect(measured.bins[0]?.tweet_count).toBe(0);
      expect(measured.page.complete).toBe(true);
    }
    cache.clear();
    const incomplete = await measureAttention(MINT, {
      ...deps,
      readCounts: async () => ({ ...zero, meta: { total_tweet_count: 0, next_token: "next" } }),
    });
    expect(incomplete).toEqual({ kind: "unknown", reason: "pagination_incomplete" });
    expect(cache.size).toBe(0);
  });

  it("refreshes after one UTC minute and evicts the prior mint observation", async () => {
    let clock = "2026-11-22T16:00:10Z";
    let calls = 0;
    const cache = new Map();
    const deps = {
      now: () => new Date(clock),
      readAccount: async () => validMint(),
      readCounts: async () => { calls++; return countsBody; },
      cache,
    };
    await measureAttention(MINT, deps);
    await measureAttention(MINT, deps);
    expect(calls).toBe(1);
    clock = "2026-11-22T16:01:00Z";
    await measureAttention(MINT, deps);
    expect(calls).toBe(2);
    expect(cache.size).toBe(1);
    expect([...cache.keys()][0]).toContain("2026-11-22T16:01");
  });
});

describe("Token-2022 TLV structure (synthetic, no RPC)", () => {
  const token2022 = (data: Uint8Array) => ({
    kind: "account" as const,
    owner: TOKEN_2022,
    executable: false,
    data,
  });
  const tlvMint = (type: number, valueLength: number) => {
    const data = mintBytes(166 + 4 + valueLength);
    const view = new DataView(data.buffer);
    view.setUint16(166, type, true);
    view.setUint16(168, valueLength, true);
    return data;
  };

  it("accepts extension-free 166-byte mint and well-formed mint-only extensions", () => {
    expect(isMint(token2022(mintBytes(166)))).toBe(true);
    expect(isMint(token2022(tlvMint(3, 32)))).toBe(true); // MintCloseAuthority
    expect(isMint(token2022(tlvMint(18, 64)))).toBe(true); // MetadataPointer
    expect(isMint(token2022(tlvMint(9, 0)))).toBe(true);  // NonTransferable
  });

  it("rejects 355-byte multisig ambiguity, account-only and unknown extension tags", () => {
    expect(isMint(token2022(mintBytes(355)))).toBe(false);
    expect(isMint(token2022(tlvMint(2, 8)))).toBe(false); // TransferFeeAmount: account-only
    expect(isMint(token2022(tlvMint(65535, 0)))).toBe(false);
    const accountTag = tlvMint(3, 32);
    accountTag[165] = 2;
    expect(isMint(token2022(accountTag))).toBe(false);
  });

  it("rejects malformed extension lengths, duplicates and nonzero tail padding", () => {
    const truncated = tlvMint(3, 32);
    new DataView(truncated.buffer).setUint16(168, 500, true);
    expect(isMint(token2022(truncated))).toBe(false);
    expect(isMint(token2022(tlvMint(3, 1)))).toBe(false); // wrong known type length

    const doubled = mintBytes(166 + 2 * (4 + 32));
    const view = new DataView(doubled.buffer);
    view.setUint16(166, 3, true);
    view.setUint16(168, 32, true);
    view.setUint16(202, 3, true);
    view.setUint16(204, 32, true);
    expect(isMint(token2022(doubled))).toBe(false);

    const bogusTail = mintBytes(210);
    bogusTail[180] = 1; // non-zero after Uninitialized TLV sentinel
    expect(isMint(token2022(bogusTail))).toBe(false);
    const shortTag = mintBytes(167);
    shortTag[166] = 3;
    expect(isMint(token2022(shortTag))).toBe(false);
  });

  it("does not call any X provider for forged TLV or multisig-shaped account", async () => {
    for (const data of [tlvMint(2, 8), mintBytes(355)]) {
      let calls = 0;
      const result = await measureAttention(MINT, {
        now: () => new Date("2026-11-22T18:00:00Z"),
        readAccount: async () => token2022(data),
        readCounts: async () => { calls++; return countsBody; },
        cache: new Map(),
      });
      expect(result).toEqual({ kind: "not_a_mint" });
      expect(calls).toBe(0);
    }
  });
});

describe("mint account gate (fail closed before provider calls)", () => {
  const account = (owner: string, data: Uint8Array) => ({
    kind: "account" as const,
    owner,
    executable: false,
    data,
  });

  it("accepts initialized classic and Token-2022 mint layouts", () => {
    expect(isMint(account(TOKEN_LEGACY, mintBytes()))).toBe(true);
    expect(isMint(account(TOKEN_2022, mintBytes()))).toBe(true);
    expect(isMint(account(TOKEN_2022, mintBytes(568)))).toBe(true);
  });

  it("rejects a 165-byte legacy token account and its 2022 equivalent", () => {
    const holdingAccount = mintBytes(165);
    expect(isMint(account(TOKEN_LEGACY, holdingAccount))).toBe(false);
    expect(isMint(account(TOKEN_2022, holdingAccount))).toBe(false);
    const extendedAccount = mintBytes(210);
    extendedAccount[165] = 2; // Token-2022 AccountType.Account
    expect(isMint(account(TOKEN_2022, extendedAccount))).toBe(false);
  });

  it("rejects missing raw bytes, uninitialized mint, invalid authority flags, and spoofed extensions", () => {
    expect(isMint({ kind: "account", owner: TOKEN_LEGACY, executable: false, data: undefined as unknown as Uint8Array })).toBe(false);
    expect(isMint(account(TOKEN_LEGACY, new Uint8Array(82)))).toBe(false);
    const brokenFlag = mintBytes();
    brokenFlag[0] = 3; // invalid COption for mint authority
    expect(isMint(account(TOKEN_LEGACY, brokenFlag))).toBe(false);
    const wrongPadding = mintBytes(210);
    wrongPadding[100] = 1;
    expect(isMint(account(TOKEN_2022, wrongPadding))).toBe(false);
    expect(isMint(account(TOKEN_LEGACY, mintBytes(210)))).toBe(false);
    expect(isMint(account(SYSTEM, mintBytes()))).toBe(false);
  });

  it("does not query a paid X provider for a token-holding account", async () => {
    let paidCalls = 0;
    const result = await measureAttention(MINT, {
      now: () => new Date("2026-11-22T16:00:00Z"),
      readAccount: async () => account(TOKEN_2022, mintBytes(165)),
      readCounts: async () => { paidCalls++; return countsBody; },
      cache: new Map(),
    });
    expect(result).toEqual({ kind: "not_a_mint" });
    expect(paidCalls).toBe(0);
  });
});

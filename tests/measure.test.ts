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

  it("does not call counts again the same UTC day", async () => {
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

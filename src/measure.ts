const TOKEN_OWNERS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);

/**
 * The account-data bytes must come from the same RPC getAccountInfo result as
 * owner/executable. A dataLength-only check cannot distinguish an SPL mint
 * from a token-holding account (both belong to a Token Program).
 */
export type AccountRead =
  | { kind: "account"; owner: string; executable: boolean; data: Uint8Array }
  | { kind: "rejected" }
  | { kind: "absent" };

export type CountsBin = { start: string; end: string; tweet_count: number };

export type MeasureResult =
  | { kind: "not_a_mint" }
  | { kind: "unknown"; reason: "invalid_counts" | "pagination_incomplete" }
  | { kind: "measured"; bins: CountsBin[]; page: { complete: boolean } };

export type MeasureDeps = {
  now: () => Date;
  readAccount: (address: string) => Promise<AccountRead>;
  readCounts: (query: string) => Promise<unknown>;
  cache: Map<string, MeasureResult>;
};

const MINT_BASE_SIZE = 82;
const TOKEN_ACCOUNT_BASE_SIZE = 165;
const TOKEN_2022_MINT_TYPE = 1;

/**
 * Conservative structural check of the canonical SPL Mint base layout.
 * This is not a substitute for a complete Token-2022 extension decoder.
 * Mint-authority options: little-endian u32, initialized flag at byte 45.
 */
function validMintBase(data: Uint8Array): boolean {
  if (data.length < MINT_BASE_SIZE || data[45] !== 1) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const mintAuthorityOption = view.getUint32(0, true);
  const freezeAuthorityOption = view.getUint32(46, true);
  return (mintAuthorityOption === 0 || mintAuthorityOption === 1)
    && (freezeAuthorityOption === 0 || freezeAuthorityOption === 1);
}

export function isMint(account: AccountRead): boolean {
  if (account.kind !== "account" || account.executable || !TOKEN_OWNERS.has(account.owner)) {
    return false;
  }
  const data = account.data;
  if (!(data instanceof Uint8Array) || !validMintBase(data)) return false;

  // The classic SPL Token program has fixed-size Mint accounts only.
  if (account.owner === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
    return data.length === MINT_BASE_SIZE;
  }

  // Token-2022 mints without extensions share the 82-byte base layout.
  if (data.length === MINT_BASE_SIZE) return true;

  // Token-2022 extended mints are padded to the Account base size, then
  // carry an AccountType byte (1=Mint, 2=TokenAccount) at offset 165.
  // Reject arbitrary extra bytes and ambiguous 165-byte token accounts.
  if (data.length <= TOKEN_ACCOUNT_BASE_SIZE + 1 ||
      data[TOKEN_ACCOUNT_BASE_SIZE] !== TOKEN_2022_MINT_TYPE) return false;
  for (let i = MINT_BASE_SIZE; i < TOKEN_ACCOUNT_BASE_SIZE; i++) {
    if (data[i] !== 0) return false;
  }
  return true;
}

type ParsedCounts =
  | { kind: "valid"; bins: CountsBin[]; complete: boolean }
  | { kind: "invalid" };

/**
 * Fail closed: malformed or missing X counts are unknown, never measured zero.
 * page.complete indicates pagination only; it is NOT point-in-time admissibility
 * (that needs acquisition evidence and a fully specified query window).
 */
function parseCounts(body: unknown): ParsedCounts {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { kind: "invalid" };
  }
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.data) || record.data.length === 0 ||
      typeof record.meta !== "object" || record.meta === null || Array.isArray(record.meta)) {
    return { kind: "invalid" };
  }
  const meta = record.meta as Record<string, unknown>;
  if (!Number.isSafeInteger(meta.total_tweet_count) || (meta.total_tweet_count as number) < 0) {
    return { kind: "invalid" };
  }
  for (const token of [meta.next_token, meta.pagination_token]) {
    if (token !== undefined && token !== null && (typeof token !== "string" || token.length === 0)) {
      return { kind: "invalid" };
    }
  }

  const bins: CountsBin[] = [];
  let summed = 0;
  for (const item of record.data) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { kind: "invalid" };
    }
    const bin = item as Record<string, unknown>;
    if (typeof bin.start !== "string" || typeof bin.end !== "string" ||
        !Number.isSafeInteger(bin.tweet_count) || (bin.tweet_count as number) < 0) {
      return { kind: "invalid" };
    }
    const startMs = Date.parse(bin.start);
    const endMs = Date.parse(bin.end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) ||
        endMs - startMs !== 60_000 || startMs % 60_000 !== 0) {
      return { kind: "invalid" };
    }
    summed += bin.tweet_count as number;
    if (!Number.isSafeInteger(summed)) return { kind: "invalid" };
    bins.push({ start: bin.start, end: bin.end, tweet_count: bin.tweet_count as number });
  }
  if (summed > (meta.total_tweet_count as number)) return { kind: "invalid" };
  return {
    kind: "valid",
    bins,
    complete: meta.next_token == null && meta.pagination_token == null,
  };
}

export async function measureAttention(
  mint: string,
  deps: MeasureDeps,
): Promise<MeasureResult> {
  // An observation cannot be reused for an entire day when resolution is one minute.
  const minute = deps.now().toISOString().slice(0, 16);
  const key = `${mint}:${minute}`;
  const cached = deps.cache.get(key);
  if (cached) return cached;

  const account = await deps.readAccount(mint);
  if (!isMint(account)) return { kind: "not_a_mint" };

  const parsed = parseCounts(await deps.readCounts(mint));
  if (parsed.kind === "invalid") return { kind: "unknown", reason: "invalid_counts" };
  if (!parsed.complete) return { kind: "unknown", reason: "pagination_incomplete" };

  const result: MeasureResult = {
    kind: "measured",
    bins: parsed.bins,
    page: { complete: true },
  };
  // Keep one cached observation per mint, without unbounded minute-key growth.
  for (const previousKey of deps.cache.keys()) {
    if (previousKey.startsWith(`${mint}:`) && previousKey !== key) {
      deps.cache.delete(previousKey);
    }
  }
  deps.cache.set(key, result);
  return result;
}

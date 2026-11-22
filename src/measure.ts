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

function parseCounts(body: unknown): { bins: CountsBin[]; complete: boolean } {
  const record = body as {
    data?: Array<{ start?: string; end?: string; tweet_count?: number }>;
    meta?: { next_token?: string; pagination_token?: string };
  };
  const bins = (record.data ?? []).map((bin) => ({
    start: bin.start ?? "",
    end: bin.end ?? "",
    tweet_count: bin.tweet_count ?? 0,
  }));
  const meta = record.meta ?? {};
  const complete = meta.next_token == null && meta.pagination_token == null;
  return { bins, complete };
}

export async function measureAttention(
  mint: string,
  deps: MeasureDeps,
): Promise<MeasureResult> {
  const day = deps.now().toISOString().slice(0, 10);
  const key = `${mint}:${day}`;
  const cached = deps.cache.get(key);
  if (cached) return cached;

  const account = await deps.readAccount(mint);
  if (!isMint(account)) {
    return { kind: "not_a_mint" };
  }
  const parsed = parseCounts(await deps.readCounts(mint));
  const result: MeasureResult = {
    kind: "measured",
    bins: parsed.bins,
    page: { complete: parsed.complete },
  };
  deps.cache.set(key, result);
  return result;
}

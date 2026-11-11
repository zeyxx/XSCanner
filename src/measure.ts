const TOKEN_OWNERS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);

export type AccountRead =
  | { kind: "account"; owner: string; executable: boolean; dataLength: number }
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

function isMint(account: AccountRead): boolean {
  return (
    account.kind === "account" &&
    !account.executable &&
    account.dataLength > 0 &&
    TOKEN_OWNERS.has(account.owner)
  );
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

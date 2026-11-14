# Experiment ledger

One row per test. A row has a question, a method, a result, credits spent, and what it does not answer.
No X credit is spent to answer a question a document or his code already answers.
No second paid call until the first call's body has been read and written here.

## Batches

### A — no X credits. Already closed, or closed by reading.

| Hole | Question | Result | Credits |
|---|---|---|---|
| 1 | Does anyone consume an X-then-chain signal? | No symbol in his tree. Cut, not a finding that the signal is useless. | 0 |
| 3 price | Is recent counts billed per request? | Yes. $0.005 per request. Docs read 2026-11-06. See below E1. | 0 |
| 7 | Must we refetch chain flags? | No. He already computes mayhem, bundled supply, and Dex orders. They arrive in the request or the check is skipped. | 0 |
| 9 | Is post-text cosine his coordination method? | No. His brief is accounts that behave alike. | 0 |

### B — no X credits. Still open. Do not buy an answer.

| Hole | Why a counts call does not answer it | How it closes |
|---|---|---|
| 2 | A counts body has no timestamp of his scan. | His logs or DB: age of the mint at `noteNarrativeWanted`. Config only: scan every 1 minute, fast path if a young launch holds the band floor for 2.5 s (`render.yaml`). That is a ceiling on cadence, not the measured age. |
| 4 | One mint is not a universe of same-age mints. | A caller sends the cohort, or we store births over time. Do not query X for every new mint to build it. |
| 5 | One mint has no siblings. | Same. Needs a set. Do not spend to invent the set. |
| 6 | Counts does not say if a string is a mint. | Closed by E3. A free account read. Not an X call. |
| 8 | A mint query misses replies that do not repeat the mint. | A later query on `linkedXRef`, only when a caller sends one. Not in the first call. |

### C — one paid call. Stop after the body. Do not follow the next page.

Question: for a 7-day minute window, how many bins are in the first page, and is `next_token` set?

Method: `GET /2/tweets/counts/recent`, `granularity=minute`, one query, one request. Write the bin count, whether `next_token` is present, and the raw meta. Do not request the next page.

That one body also confirms the doc: bins with `tweet_count`, not posts.

It does not confirm the billed amount. That is the console. If the console is not open, do not send a second request to "see the charge".

A repeat the same UTC day, to test dedup, is a second request. Forbidden until this row exists and the console can show the delta.

### D — do not buy

Post search. $0.005 per post returned. A page of 100 is $0.50. Only after a counts bin is hot, and only for a sample. Not this batch.

## E1 — counts price and shape, from the docs

Date: 2026-11-06.
Credits: 0.
Sources: `https://docs.x.com/x-api/getting-started/pricing`, `https://docs.x.com/x-api/posts/counts/introduction`, `https://docs.x.com/x-api/posts/get-count-of-recent-posts`.

- Counts recent: $0.005 per request. Counts all: $0.010 per request.
- Recent window: 7 days. Granularity: minute, hour (default), day.
- Body: time bins and `tweet_count`. Not posts.
- Recent reference has `next_token`. A window can take more than one request.
- Full-archive intro: a minute page holds 31 days. Recent is 7 days. Whether that page size applies to recent is not written on the recent page. Batch C measures it.

## E2 — recent minute page, one request

Date: 2026-11-06.
Credits: one successful request. Expected $0.005 if the docs hold. The billed amount was not read from the console. Two earlier requests were HTTP 400 (our `end_time` was too fresh, then `start_time` was before the 7-day floor). Those did not return bins. Whether a 400 is billed is not in this row.

Query: `solana -is:retweet`. Granularity: minute. Window: `2026-10-30T16:45:17Z` to `2026-11-06T16:40:17Z`. One request. Next page not requested.

- Status 200. Body is time bins, not posts.
- `bin_count`: 10076.
- `next_token`: absent.
- `total_tweet_count`: 354561.
- `zero_bins`: 0. `max` in one minute: 1500.
- The bin count matches the minute span of the window. A full 7-day minute series fits in one page. The page cap is at least 10076. The cap above that was not measured. Do not buy a wider window to find it.

This does not say a quiet mint returns a bin for every empty minute. This query had no empty minute. A mint call is a later row.

## E3 — a base58 string is not a mint

Date: 2026-11-06.
Credits: 0. RPC: `https://api.mainnet-beta.solana.com`, `getAccountInfo`.

| String | Result |
|---|---|
| USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | owner `Tokenkeg…`, not executable, data present |
| `9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump` | same owner, not executable, data present |
| wallet `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM` | owner System program, not executable, empty data |
| a transaction signature, length 88 | RPC error `-32602 WrongSize`. No account. |

A signature is rejected by size. A mint and a wallet are both valid addresses. Only the account read separates them.

## E4 — Token-2022 is also a mint

Date: 2026-11-06.
Credits: 0. Same RPC, `getAccountInfo`.

| String | Result |
|---|---|
| PYUSD `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` | owner `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, not executable, data present |
| `HEM1NM9vpVjeSkH5jkvTG5bDe7ZbFNvM6vWRJqghpump` | same owner, not executable, data present |

The rule is not "owner is Tokenkeg". A mint is an account owned by Tokenkeg or Token-2022, not executable, with data. A wallet stays on the System program. A signature is still rejected by size.

## E5 — credit balance, not a per-request invoice

Date: 2026-11-06.
Credits: one read of `get_usage_credits` on the official MCP. Whether that read itself is billed is not separated here.

- `prepaid_balance`: 4.99
- `free_balance`: 0
- `total_balance`: 4.99

The operator said the test grant was $5. This read is the first balance we measured. If the grant was $5.00 and nothing else was spent, $0.01 is gone. That is two $0.005 charges, or one $0.01 charge. It cannot be assigned to the successful counts request, the two HTTP 400s, or this read. No balance was taken before those calls.

## E6 — a quiet mint still returns empty minutes

Date: 2026-11-06.
Credits: one `get_posts_counts_recent` call. Next page not requested.

Query: `9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump`. Granularity: minute. Window: `2026-10-30T17:10:50Z` to `2026-11-06T17:05:50Z`.

- `bin_count`: 10076. `next_token`: absent.
- `zero_bins`: 10043. `nonzero_bins`: 33. `max` in one minute: 1.
- `total_tweet_count`: 33. Sum of bins: 33.
- Empty minutes are returned as `tweet_count: 0`. A quiet query does not shrink the page.

Balance immediately before: 4.99. Balance after this call: 4.98. The usage read between them did not move the balance on the previous pair of reads (E5, then the read just before this call, both 4.99). The one-cent drop belongs to this counts request, at the precision of the balance field. The docs say $0.005 per request. A half-cent cannot be read on a cent field. This does not prove the price is $0.01.

## E7 — GetXAPI vs Official X counts on 30 collected mints

Date: 2026-11-14.
Script: `npm run compare:x` (`data/compare-x.jsonl`, joined with `data/prices.jsonl`).
Credits spent (verified by user on provider dashboards):
- Official X `GET /2/tweets/counts/recent`: 30 requests = **$0.15** (**$0.005/request**, confirms E1).
- GetXAPI `GET /twitter/tweet/advanced_search` (1 page, `product=Latest`): **$0.001/request** (30 requests = **$0.03**).

Coverage (`n = 30` mints with complete 60m GeckoTerminal price paths):
- Any mention of mint address (before or after `t0`): Official **20/30 (67%)**, GetXAPI **17/30 (57%)**.
- Mention strictly before `t0`: Official **9/30 (30%)**, GetXAPI **5/30 (17%)**.
- Volume match: exact match on 19/30 mints; GetXAPI returned strictly fewer tweets than Official on 11/30 mints (e.g. `WATER` 0 vs 8, `DESU` 2 vs 10, `BOT` 1 vs 6).

Descriptive returns by pre-`t0` presence (exploratory `n = 30`, no fees/slippage/liquidity):
- Official `pre > 0` (`n = 9`): `+5m` median +36.6% (67% up), `+15m` -51.1%, `+60m` -53.4% (0% up), `peak60` median +123.3%.
- Official `pre = 0` (`n = 21`): `+5m` median -15.0% (38% up), `+15m` -20.6%, `+60m` -34.8% (19% up), `peak60` median +175.9%.
- GetXAPI `pre > 0` (`n = 5`): `+5m` median -8.7%, `+60m` -46.5% (0% up), `peak60` median +123.3%.
- GetXAPI `pre = 0` (`n = 25`): `+5m` median -7.5%, `+60m` -43.6% (16% up), `peak60` median +175.9%.

What this does not answer:
- Statistical significance (`n = 30` is too small).
- Discussions without the raw mint address (ticker/name or `links.twitter` replies).
- Whether X adds value beyond TokenSage (still blocked on `outcomes` export from GCR).

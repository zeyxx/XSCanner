# Integration: what is observed, what is not

Status: rewritten after reading the running code. Earlier versions of this file
invented a call site (`noteSocialAttentionWanted`) that does not exist.
Do not treat a diagram here as wired.

Three texts disagree. They are not the same kind of claim.

| Text | Kind | What it is |
|---|---|---|
| `docs/GUIDELINE.md` | GCR's brief for a standalone product | Both directions, own Solana listener, track from creation. Does not mention TrenchScanner or TokenSage. |
| TrenchScanner + TokenSage code | Terrain | What actually runs. |
| Discord, 2026-11-05 20:54 | Offer, not a wire | He has not built XSCanner. He might have TokenSage call it later. The partner webhook is ready; the API key comes when we ask. |
| This file, before this rewrite | Our hypothesis, written as fact | Discarded where it is not in the code. |

We do not edit his repositories.

## Observed

TrenchScanner's worker already listens to Solana (`PumpPortalStream` in `apps/worker/src/index.ts`).

After a mint passes `runRugScreen`, the scan calls `noteNarrativeWanted`. Basic depth on first pass. Full depth when the mint gets a decision row. See `apps/worker/src/tokensage/prefetch.ts`.

TokenSage's own guide says: no discovery feed, no exhaustive X scrape, the consumer brings the address. It answers what the linked post or profile is about. It does not count public mentions.

The partner webhook fires after a model call. Body includes `token.mint`, symbol, name. Signature `X-TrenchScanner-Signature`. A partner registers the URL at `PUT /stats/webhook`. This is an output. It cannot feed the score that produced the alert.

`noteSocialAttentionWanted` and `loadSocialAttentionReads` are not in his tree. Grep returns nothing.

TrenchScanner's README: social signal comes only from TokenSage. There is no mention-volume feed.

## What XSCanner is, on that terrain

A measurement of public X attention for a mint someone gives it.

It does not listen to Solana. That listener already has an owner.

It does not replace TokenSage. TokenSage reads the linked post. XSCanner would count independent voices talking about the mint. That gap is in his guide (non-goal: exhaustive X scrape) and in the TrenchScanner README.

The HTTP shape we can build without touching his code:

```
POST /v1/attention
```

The caller must send what it already knows. A mint alone is not enough for the checks his brief requires.

```
{
  mint,
  symbol?,
  name?,
  createdAt?,          // age, for any later cohort
  linkedXRef?,         // profile or tweet URL TokenSage already fetched
  onChainContext?      // flags he already computed; we do not refetch them
}
```

`onChainContext` is how authenticity cross-checks arrive without a second Solana listener: mayhem, paid boost, holder concentration, creator sells, bundled launch. If the field is absent, those checks are not done. They are not invented.

## Open holes (his brief, not satisfied by a single mint call)

Named so they are not papered over. None of these are implemented. None are "later" in the sense of forgotten.
Which holes one observation closes, and which must not be bought with credits: `docs/EXPERIMENTS.md`.

1. **X then chain.** His v1 scope is both directions. Research he cites: about 23.5% of coins are created after an X post. No caller consumes that signal today. Parking it is a cut, not a finding that the signal is useless.

2. **Minutes.** His horizon is minutes to hours. The first 5 minutes of trading are cited as predicting a rug within the hour. A call after the rug screen is already late. The webhook is later. We have not measured how late.

3. **Cost brake.** Observed 2026-11-06 on `https://docs.x.com/x-api/getting-started/pricing` and `https://docs.x.com/x-api/posts/counts/introduction`.
   - `Counts: Recent` is **$0.005 per request**. `Counts: All` is **$0.010 per request**. Listed under per-request charges, not per post returned.
   - Recent counts cover the last 7 days. Granularity is `minute`, `hour` (default), or `day`. The body is time bins with `tweet_count`, not posts.
   - A recent search page of 100 posts is $0.50 at $0.005 per post returned. One counts request is 100 times cheaper than that page, if one request covers the window we need.
   - Measured 2026-11-06, one request, query `solana -is:retweet`, minute granularity, almost 7 days: 10076 bins, no `next_token`. A full week of minute bins fits in one page. Ledger: `docs/EXPERIMENTS.md` E2. A quiet mint the same day returned the same page size, including minutes at zero (`docs/EXPERIMENTS.md` E6). Balance moved from 4.99 to 4.98 on that one counts request. The field is in cents. The docs say $0.005. A half-cent cannot be read here. Still unknown: whether a repeated request the same UTC day is billed again.

4. **Cohort.** A new mint has no history. He compares it to all mints of the same age. One request does not see the others. A percentile without that universe is a false number. Do not emit one.

5. **Copycats.** One viral post spawns many mints. He wants each mint's share of that attention. TokenSage says "this is a copy". It does not say which copy is winning attention. One mint in cannot answer that.

6. **A base58 string is not a mint.** Measured 2026-11-06, no X credit. A signature is rejected by size. A mint and a wallet are both valid addresses. Only an account read separates them. A mint owner is Tokenkeg or Token-2022. Ledger: `docs/EXPERIMENTS.md` E3 and E4.

7. **Social signals alone are not enough.** His authenticity section says so: raids, `t.me` invites, bundled buys, creator sells, Mayhem, paid boosts, a KOL wallet that bought before the post. Those chain facts must arrive in `onChainContext`, or the check is skipped and labeled skipped.

8. **The X query starts from the linked tweet, not only the mint.** Replies in that thread count even when they do not repeat the address. Without `linkedXRef`, that thread is missed.

9. **Clustering method.** His method is accounts that behave alike (same address in a short window, same reply target, same invite, synced times). Post-text cosine similarity is a different measure. Do not call it his method.

## What is explicitly not claimed

- XSCanner is not wired into his score.
- The webhook is not the input of that score.
- A composite 0–100 score is not validated. His validation needs labeled tokens and chain outcomes (graduation, rug, lead/lag versus buyers). We do not have that join.
- Third-party X providers are scraping-backed. His brief says the official route is the only ToS-clean one. The tradeoff is not decided.

## Errors already observed (do not repeat)

1. Reimplemented his Solana listener inside XSCanner. Removed.
2. Wrote `noteSocialAttentionWanted` in this file before grepping his tree.
3. Treated his standalone brief, his running scanner, and one Discord sentence as one architecture.
4. Wrote a webhook receiver before knowing the consumer. The webhook is his outbound partner channel.
5. Called milestones done when they were untested or unwired.
6. Read his code before pulling it (hundreds of commits behind).
7. Coded the explanation before the characterization. See the session note on the scientific method: observation after the code is not a test of an unknown.

# XSCanner — Agent Protocol

`docs/INTEGRATION.md` is the integration authority. If this file disagrees with it, this file is wrong.

`docs/GUIDELINE.md` is GCR's brief for a standalone product. It is not the integration plan. It is not implemented.

## What XSCanner is

A measurement of public X attention for a mint someone gives it.

The gap it fills: TokenSage reads the linked post and says what the token is about. It does not count independent voices. TrenchScanner has no mention-volume feed. That count is the job.

Not wired. No caller in his code. Do not describe a prefetch (`note` / `flush` / `load`) as if it exists.

## What XSCanner is not

- Not a second Solana listener. `PumpPortalStream` already runs in his worker.
- Not a rug screen, holder check, or market feed.
- Not TokenSage. Do not re-read the linked post to decide what the token is about.
- Not the input of his score. That call does not exist.
- Not his partner webhook. That webhook fires after a model call. It cannot feed the score that produced the alert.
- Not a trading bot.

## Architecture

- Hexagonal: ports in `src/ports/`, adapters in `src/adapters/`, pure logic in `src/domain/`.
- I/O only in adapters.
- TypeScript (Node). Decision: `docs/DECISIONS.md` D-001.
- Scoring parameters live in one object next to the metrics, not mixed with port and pool. D-002.
- Postgres for posts we actually store. Local instance for dev. Do not claim CYNIC production hosting until a unit exists.

## Invariants

- Do not implement PumpPortal, DexScreener, RugCheck, or mint discovery. He already owns that.
- Do not edit TrenchScanner or TokenSage. Copy an idea, not a file.
- `git fetch` and pull his default branch before reading his tree. A stale clone is not terrain.
- Trace who sends what before writing an integration. Grep the symbol. If the grep is empty, the call is a hypothesis.
- Done means tested and connected. Offline tests of an unwired function are a draft.
- Do not emit `cohort_percentile` without a universe of same-age mints. A zero or a 0.5 is a false number.
- Do not call post-text cosine similarity his coordination method. His method is accounts that behave alike.
- Do not mark a base58 string as a mint unless an account read confirmed it. A mint owner is Tokenkeg or Token-2022, the account is not executable, and it has data. A wallet or a signature is not a mint. Do not call counts for those.
- Chain facts used in authenticity (mayhem, paid boost, holder concentration, creator sells, bundled launch) arrive in `onChainContext` or the check is skipped and labeled skipped.
- Official X is the only ToS-clean route in his brief. Third-party adapters exist. The tradeoff is not decided.
- Official counts pricing was read 2026-11-06. Recent counts are the volume spine. Post search is not. See `docs/EXPERIMENTS.md`.

## Request shape (not wired)

```
POST /v1/attention
{
  mint,
  symbol?,
  name?,
  createdAt?,
  linkedXRef?,
  onChainContext?
}
```

A mint alone misses the linked thread and the chain flags. See `docs/INTEGRATION.md`.

## Code status

Draft. Not connected.

| Piece | Keep if restarting the measurement? |
|---|---|
| Extraction of addresses, URLs, cashtags, invites | Yes. Offline tests. Does not validate a string as a mint. |
| `PostSource` port and the three X adapters | Draft. Shapes are useful. Live calls not made. ToS open. |
| Postgres schema, HTTP server | Draft. Contract and stored fields do not match this file. |
| `attention.ts`, `metrics.ts`, `tfidf.ts` | Do not extend. They emit a formula his brief does not describe, including a cohort number without a universe. |
| `src/adapters/webhook/receiver.ts` | Wrong consumer. Not the integration. |

## Docs

- `docs/INTEGRATION.md` — observed terrain, open holes, non-claims
- `docs/GUIDELINE.md` — his standalone brief
- `docs/RESEARCH.md` — his evidence notes
- `docs/DECISIONS.md` — decisions we actually took
- `docs/SCORING.md` — his target formula, and what the code actually computes
- `docs/PROVIDERS.md` — provider notes and bugs found in the adapters

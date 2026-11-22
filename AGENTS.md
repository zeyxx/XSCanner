# XSCanner — Agent Protocol

`docs/INTEGRATION.md` is the **current local evidence and proposal** for T/T integration, not a ratified upstream contract. Check the referenced TrenchScanner/TokenSage revisions and ask their owners before claiming an interface or permission is approved. `docs/GUIDELINE.md` remains a separate standalone-product brief.

`docs/GUIDELINE.md` is GCR's brief for a standalone product. It is not the integration plan. It is not implemented.

## What XSCanner is

A measurement of public X attention for a mint someone gives it.

The gap it fills: TokenSage reads the linked post and says what the token is about. It does not count independent voices. TrenchScanner has no mention-volume feed. That count is the job.

Not wired. No caller in his code. Do not describe a prefetch (`note` / `flush` / `load`) as if it exists.

## What XSCanner is not

- For the **T/T-seeded pilot**, not a second Solana listener: TrenchScanner already owns its worker. The **standalone X → chain direction** remains a distinct deferred product hypothesis in `docs/GUIDELINE.md`, not a prohibition forever.
- Not a rug screen, holder check, or market feed.
- Not TokenSage. Do not re-read the linked post to decide what the token is about.
- Not the input of his score. That call does not exist.
- Not his partner webhook. That webhook fires after a model call. It cannot feed the score that produced the alert.
- Not a trading bot.

## Architecture — target versus implemented tree

- **Observed on this Draft branch (2026-11-22):** `src/measure.ts`, pure provider parsers in `src/adapters/`, offline alert helpers in `src/collect/`, price-analysis helpers in `src/prices/`, CLI scripts and tests. No HTTP server, DB schema, Postgres integration, score service, or TrenchScanner consumer is evidenced in this Git tree.
- **Target only, not implemented:** hexagonal ports (`src/ports/`), domain scoring (`src/domain/`), adapters for chosen live sources, versioned snapshots and durable storage. Put I/O in adapters when these components are actually built. Do not create empty directory scaffolding just to match a diagram.
- **Accepted local design decisions, not delivery receipts:** TypeScript/Node (D-001), score config next to future metrics (D-002). Keep runtime secrets/ports separate from score configuration. Do not claim CYNIC production hosting or Postgres persistence until the owning runtime and schema are verified.

## Invariants

- In the **T/T-first pilot**, reuse the upstream chain discovery/risk data rather than reimplement PumpPortal, DexScreener or RugCheck. Do not silently remove the separately scoped standalone X → chain discovery goal.
- Do not edit TrenchScanner or TokenSage. Copy an idea, not a file.
- `git fetch` and pull his default branch before reading his tree. A stale clone is not terrain.
- Trace who sends what before writing an integration. Grep the symbol. If the grep is empty, the call is a hypothesis.
- Done means tested and connected. Offline tests of an unwired function are a draft.
- Do not emit `cohort_percentile` without a universe of same-age mints. A zero or a 0.5 is a false number.
- Do not call post-text cosine similarity his coordination method. His method is accounts that behave alike.
- Do not mark a base58 string as a mint until the **decoded SPL account is confirmed to be a mint**, not a token-holding account; owner Tokenkeg/Token-2022, non-executable and nonempty data are **insufficient on their own**. Token-2022 extensions need explicit handling. Do not call paid counts on ambiguous or invalid accounts.
- Chain facts used in authenticity (mayhem, paid boost, holder concentration, creator sells, bundled launch) arrive in `onChainContext` or the check is skipped and labeled skipped.
- The standalone brief **proposes** the official X route as lower supply/ToS risk. Current provider terms, data collection, retention and commercial rights are **NOT VERIFIED**; using a third-party API is not a blanket compliance guarantee. Only GetXAPI and official X parsing modules are in this branch, not all historical adapters.
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

| Piece | Git-tree status / interpretation |
|---|---|
| `src/measure.ts`, `src/adapters/x-counts.ts`, `src/adapters/getxapi.ts` | **Present**, unit-tested primitives only; no live integration or valid production score |
| `src/collect/`, `src/prices/`, `scripts/*.ts` | **Present**, offline or explicitly invoked CLI tooling, some with external I/O; not runtime-verified or all typechecked in CI |
| `src/ports/`, `src/domain/`, Postgres schema, HTTP server, three historical provider adapters | **Absent**, possible targets or removed prototypes; do not describe as working |
| `attention.ts`, `metrics.ts`, `tfidf.ts`, historical webhook receiver | **Removed historical draft**, not a current implementation; see `docs/SCORING.md` for why it was rejected |

## Docs

- `docs/INTEGRATION.md` — observed terrain, open holes, non-claims
- `docs/GUIDELINE.md` — his standalone brief
- `docs/RESEARCH.md` — his evidence notes
- `docs/DECISIONS.md` — decisions we actually took
- `docs/SCORING.md` — target formula vs **retired historical scoring draft**, not current scoring code
- `docs/PROVIDERS.md` — provider notes and bugs found in the adapters

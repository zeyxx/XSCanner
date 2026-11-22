# XSCanner

A measurement of public X attention for a mint someone gives it.

Not wired. Not a second Solana listener. Not TokenSage. Not a trading bot.

`docs/INTEGRATION.md` is the authority for how this sits next to TrenchScanner and TokenSage. If this file disagrees with it, this file is wrong.

`docs/GUIDELINE.md` is GCR's brief for a standalone product. It is not the integration plan, and it is not implemented.

## Status

Observed 2026-11-12 (`npx vitest run`, `npx tsc --noEmit`):

- `src/measure.ts`: one function, `measureAttention`. Not connected to anything.
- `src/collect/`: pure helpers for a local alert log (`record.ts`) and its summary (`summary.ts`).
- `scripts/collect-alerts.ts`: connects to TrenchScanner's subscriber Model Alert websocket with `MODEL_ALERT_KEY` from `.env` and appends each alert to `data/alerts-YYYY-MM-DD.jsonl` (git-ignored). Live connection verified once on 2026-11-12. No replay exists on the server, so downtime leaves gaps.
- `scripts/summarize-alerts.ts` (`npm run summary`): counts notifications, tokens, models and delivery delay.
- Tests: 10 pass. The old `tests/adapters.test.ts` imported deleted files and was removed.
- No server, no schema, no wiring into TokenSage. No measure of predictive value.

The earlier draft under `src/domain/` was removed. It encoded a formula his brief does not describe, a cohort number without a universe, and a call site that does not exist in his tree. Do not restore it as-is.

## X0 — evidence reconciliation (2026-11-22, proposal)

**Scope:** This is the experimental branch, not `main`; do not treat code here as connected to TrenchScanner's score or running in production. X0 is the next proposed research gate, not an implementation or deployment approval. [TALARIA R&D-SOL-01](https://github.com/zeyxx/talaria/issues/8) tracks cross-project priorities; this repository owns its experiment and code.

The [E7 ledger](docs/EXPERIMENTS.md) already records a **14 Nov exploratory comparison on 30 mints** with complete 60-minute price paths. Official X recent counts yielded **9/30 mints with a pre-`t0` raw-mint mention** vs **5/30 for GetXAPI**; recorded cost for 30 requests was **$0.15 vs $0.03**, respectively. Those are provider-coverage and descriptive-return observations, **not proof of predictive alpha**, statistical significance, a live feed or an improvement beyond TokenSage. The earlier one-mint test from 6 Nov is historic; do not restart research as if E7 did not happen.

**Next bounded decision:** review the actual branch/test provenance and [four-arm comparison protocol](docs/PROTOCOL.md), establish timestamp-correct baseline data and permissions, and select a small controlled experiment with a pre-approved budget. In that protocol, the TokenSage comparisons (B/D) cannot be evaluated without the operator-only anchored narrative/outcomes data; with only alerts and prices, A vs C is an exploratory comparison **without controlling for TokenSage**. Check availability of a valid/replaced partner credential privately before accessing any partner endpoint; never place keys or private data in GitHub.

**No implicit GO** for X paid API usage, scraping, merges to `main`, partner API access, upstream code changes, deployment or real trading. Archive findings remain dated; when a test is actually rerun, record revision, data window, cost and output read-back in the existing `docs/EXPERIMENTS.md` ledger.

## Docs

- `docs/INTEGRATION.md` — what was observed in his code, the open holes, what is not claimed
- `docs/GUIDELINE.md` — his standalone brief
- `docs/RESEARCH.md` — his evidence notes
- `docs/PROTOCOL.md` — comparison protocol (draft, not validated, nothing run)
- `docs/SCORING.md` — his target formula, and why the deleted code was not that formula
- `docs/DECISIONS.md` — decisions actually taken (language, where scoring parameters live)
- `docs/PROVIDERS.md` — notes on the three X providers, including bugs found in the deleted adapters
- `AGENTS.md` — rules for the next code

## Rules for the next code

- Do not reimplement PumpPortal, DexScreener, or RugCheck.
- Do not emit a cohort percentile without a universe of same-age mints.
- Do not call post-text cosine similarity his coordination method.
- Done means tested and connected. A file on disk is a draft.

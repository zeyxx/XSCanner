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

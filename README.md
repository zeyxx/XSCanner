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

**Next bounded decision:** review the actual branch/test provenance and [four-arm comparison protocol](docs/PROTOCOL.md), establish timestamp-correct baseline data and permissions, and select a small controlled experiment with a pre-approved budget. **A true A/B/C/D model ablation requires operator-owned candidate-level, decision-time features and outcomes**, because existing TrenchScanner model scores and alert selection already incorporate TokenSage. Partner-only alerts and price paths permit only **P — selected-alert descriptive association**, not true A vs C lift or any claim of added predictive value beyond TokenSage. Check availability of a valid/replaced partner credential privately before accessing any partner endpoint; never place keys or private data in GitHub.

**No implicit GO** for X paid API usage, scraping, merges to `main`, partner API access, upstream code changes, deployment or real trading. Archive findings remain dated; when a test is actually rerun, record revision, data window, cost and output read-back in the existing `docs/EXPERIMENTS.md` ledger.

## Active workstreams and evidence gates (X0, 2026-11-22)

**One XSCanner project, not seven new repositories or competing roadmaps.** Workstream names below route a question to its **existing owner document**. `GUIDELINE.md` still owns the standalone product scope and milestones; `INTEGRATION.md` owns upstream boundaries; `PROTOCOL.md` owns hypotheses and evaluations. Status labels distinguish a proposal from implemented, tested and integrated code.

| Workstream | Question / owner | First evidence gate | Now |
| --- | --- | --- | --- |
| **X1 — T/T integration** | TrenchScanner/TokenSage ownership and async contracts; [integration](docs/INTEGRATION.md) | Agree **A: scanner orchestrates separate reads** vs **B: TokenSage consumes social reads**; verify data shapes, permissions and arrival before model decision, without editing upstream | **Code inspected / proposal only** |
| **X2 — X sources and economics of collection** | Coverage, legitimacy, supplier failures, freshness and budgets; [providers](docs/PROVIDERS.md) + [experiments](docs/EXPERIMENTS.md) | Offline replay of provider formats and E7 receipts; per-eligible-mint cost, empty/missing share, latency and lawful use; explicit GO before new paid requests | **E7 exploratory** |
| **X3 — identity and attribution** | Mint/account validation; URL, ticker, replies, shared-story and copycat attribution; [guideline](docs/GUIDELINE.md) and [integration](docs/INTEGRATION.md) | Deterministic negatives/ambiguous links and mint-to-thread evidence; no synthetic certainty from address substring counts | **Partial primitives** |
| **X4 — social measurement and manipulation** | Independent voices, timing, coordination, raids, flags; [scoring](docs/SCORING.md) | Versioned features from observable data, quality/false-positive tests; **no** authenticity or cohort percentile without actors or cohort | **Target not implemented** |
| **X5 — incremental utility and profitability** | [comparison protocol](docs/PROTOCOL.md) | Pre-registered A (T-only features), B (T+S), C (T+X), D (T+S+X) **on all candidate decision moments**; partner alerts alone = P-only descriptive study; point-in-time evaluation + uncertainty; compare **economic value net of feasible execution costs** separately from **provider/infra cost and potential product revenue**; no claim of trading alpha from E7 | **Not proven; operator data needed for B/D** |
| **X6 — reliable standalone runtime** | [guideline milestones](docs/GUIDELINE.md) | Schema and idempotent minute bins; replay, queues, TTLs, rate limits, usage meters, opt-in public API, security and observability; independent CI and read-back | **Offline CI only** |
| **X7 — autonomous X -> chain research** | Bidirectional discovery beyond T/T; [guideline](docs/GUIDELINE.md) | Prove incremental discovery vs existing PumpPortal and source rights/economics; explicitly deferred from the T/T-seeded pilot, not dropped from product ambition | **Deferred hypothesis** |

**Order of execution is not X1 through X7 sequentially.** Start with **X1 + X2 + minimum viable X5** (can the data answer the question before it costs more?). X3 supplies trustworthy matching, then X4 earns its complexity through evidence. X6 advances only as demanded by a reproducible experiment. X7 remains separately gated. Cross-cutting collaboration/permissions and secret hygiene apply everywhere but do **not** establish a new service.

**Decision states:** `PROPOSED` -> `EVIDENCE_COLLECTED` -> `REPRODUCED_OFFLINE` -> `EXPERIMENT_APPROVED` -> `SHADOW_VALIDATED` -> `INTEGRATION_APPROVED_BY_OWNER` (each requires its own read-back). `NO_GO` or `UNKNOWN` are valid outcomes, not automatic permission to advance. A GitHub PR or passed unit tests alone does not imply live features or financial profitability.

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

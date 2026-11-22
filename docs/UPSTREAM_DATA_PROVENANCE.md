# X0/P0 — Upstream data provenance and authorization gate

**Source inspection:** 2026-11-22. Static public Git sources only: TrenchScanner `main@b4ed579effca13cbc759885686114258d4426ec4`; TokenSage `main@48996c4116643da48b5e31731d5e0e592179bf66`. **Not** a production runtime/config read-back, API request or grant of export rights. No partner credentials or data accessed.

## Observed authority and shape

| Source / field | Proven contract | P0 implication |
|---|---|---|
| [`CandidateOutcome` Prisma](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/packages/core/prisma/schema.prisma#L1234-L1329) | `id`, `anchorAt`, `sampleKind`, `features` (anchor values with null=unknown), `seatScores`, `seatCalls`, label/price fields | Natural **candidate-moment** identity. Do not substitute model alert `createdAt` for `anchorAt`. Features at anchor are not an independent receipt of each provider's request/availability time. |
| [`DECISION_SAMPLE_KINDS`](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/apps/worker/src/jobs/candidateOutcomeJob.ts#L105-L145) | `event`, `second`, `entry` are decision moments; `second` is Narrative-seat-specific. `hourly` is background; `emission` curator-selected; `match` user-filter-selected | An ablation cannot silently mix sample kinds or count selected emission anchors as an independent control universe. Predeclare cohort and weights by kind. |
| [`outcomes` export](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/apps/api/src/routes/statsExport.ts#L37-L205) | JSONL reads candidate outcomes, ordered by `(anchorAt,id)`, supports `sampleKind`, `finalizedOnly`, bounded time window, and optional `limit`; the CSV flattens feature columns | The operator can potentially export an anchored sample without building a new API. Use JSONL for nested `features` and `seatCalls` where available; verify row counts and that `limit` did not truncate the requested population. |
| [Partner access](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/apps/api/src/routes/statsAccess.ts#L11-L45) | `PARTNER_EXPORT_DATASETS = ["alerts","paths"]`; `outcomes`, `narratives`, `screen` are **operator-only** | Existing/compromised partner token must not be used to bypass this gate. Partner data permits **P-only selected-alert descriptive** research, not true A/B/C/D ablation. |
| [`alerts` export](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/apps/api/src/routes/statsExport.ts#L667-L708) | `createdAt`, `candidateOutcomeId`, `model`, narrative fields and outcomes where stored | Link to `CandidateOutcome.id` with operator permission. Alert time and anchor time differ; an old `candidateOutcomeId` link may be null after pruning. |
| [`screen` export](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/apps/api/src/routes/statsExport.ts#L311-L422) | Operator-only screen snapshots, checks and rejected-token paths, subject to sparse capture/retention | May characterize screen exclusions; **not** a substitute for scored `event`/`entry` decisions or their model features. |
| [`TokenNarrative` schema](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/packages/core/prisma/schema.prisma#L2033-L2180) | One current row per mint, `analyzedAt`, `checkedAt`, various X timestamps, no per-anchor immutable read log implied by this model | A later `narratives` export cannot establish exactly what an earlier model saw. Prefer `CandidateOutcome.features` for anchored S values and separate acquisition timestamps for strict availability proof. |

## Retention: a material selection-bias risk

- [TrenchScanner env default](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/packages/core/src/config/env.ts): `CANDIDATE_OUTCOME_RETENTION_DAYS=90`; `render.yaml` currently declares 90; `.env.example` still shows 60. **Live effective value has not been read.**
- [cleanup job](https://github.com/sollama58/TrenchScanner/blob/b4ed579effca13cbc759885686114258d4426ec4/apps/worker/src/jobs/cleanupJob.ts) keeps some selected winners/calls longer while pruning old baseline rows. A long export window (API allows up to 180 days) does **not** imply 180 days of unbiased cohort data.
- A partner `paths` response can include outcome-anchored trajectories but that does **not** authorize reading all `CandidateOutcome.features`.
- Some rows' `candidateOutcomeId` link survives the alert, but its source `CandidateOutcome` may be pruned. A successful alert/path export is **not evidence** of a complete unselected denominator.
- Request actual earliest/latest complete windows and a producer-side by-kind count; do not infer completeness solely from one returned file or a HTTP 200.

## Files searched / availability

- XScanner Draft PR #9 tree at `339181b`, initial Hermes branch `3a1e91d`, archived Claude branch `a7c2fa6`, and X0 reconciliation branch `3251996`: no `data/prices.jsonl` or `data/compare-x.jsonl` in the **inspected Git trees**; `main` remains a small scaffold. The aggregated 2026-11-14 E7 result in `docs/EXPERIMENTS.md` is **not** a reconstructible row-level dataset.
- Targeted connected Drive metadata search for `XScanner` and `compare-x`: no matches at inspection. This **does not prove** that private files are absent from local disks, unindexed Drive files or partner storage.
- Never upload operator-exported raw rows, keys, identifying accounts, private partner data or unlicensed source fixtures to this **public** GitHub repo.

## Bounded, permission-first operator request (draft; NOT sent)

**Step 0 — metadata only, no export yet:** ask the owner whether a one-week window (proposed 2026-11-15 to 2026-11-22 UTC) has sufficiently complete `CandidateOutcome` rows, and confirm current runtime revision/retention, counts by `sampleKind` and finalized status, null fractions for `features` / `seatScores` / `seatCalls`, link rates via `candidateOutcomeId`, and rights/approved storage. Identify which timestamps document when TokenSage read data were available to a model. Only aggregate metadata is necessary for this first feasibility answer.

**Step 1 — if approved by owner:** small private JSONL sample from `outcomes` for `sampleKind=event,second,entry` (do not silently mix `hourly`), **projected/redacted on the operator side before any sharing**: the existing `/stats/export` endpoint does not expose a per-column projection filter. Limit the shared payload to `id`, `mintAddress`, `sampleKind`, `anchorAt`, `features` (whitelisted), `seatScores`, `seatCalls`, `labelRule`, `finalizedAt` and only the outcome fields needed for the prespecified comparison. A small authorized `alerts` join can link actual emissions; never reconstruct candidate identity from mint alone. For P-only observations, a separate partner-approved `alerts`/`paths` export is a **different** dataset and must stay labeled P.

**Step 2 — provenance manifest:** provider/source revision, export query window (UTC), executed query/filters/limit, row count by kind, expected-vs-returned row totals, privacy/rights approval reference stored privately, extraction and available timestamps, SHA256 of private canonical files, completeness declaration, schema/feature-version checks and retention constraints. Public GitHub receives only redacted schema, aggregate counts, code and non-sensitive hashes.

**Step 3 — X feasibility:** an X counts response fetched **after** the historical decision can support provider coverage or cost analysis, but it cannot be admitted as a feature available then. Strict P0 needs observed `requestStartedAt`, `responseReceivedAt` and `availableAt <= decisionAt` from a contemporaneous observation. Without that, record **NO-GO PIT** or design a separate prospective, explicitly approved study.

## Decision

At this source-inspection checkpoint: **GO for operator feasibility/rights inquiry; NO-GO for live X spending, retrospective X lift claims and A/B/C/D ablation**. This is an evidence/permissions boundary, not a request to change upstream or access protected endpoints.

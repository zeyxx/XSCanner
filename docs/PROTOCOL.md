# Comparison protocol (draft)

Status: proposal, 2026-11-12. Not validated. Nothing here has been run.
No X credit, API call, webhook or deployment is authorized by this file.

## Question

Does public X attention (mention counts per mint) add information beyond TokenSage's linked-post read, for the decisions TrenchScanner makes? At what latency and cost?

A weak result for mention counts does not show that other social signals are useless.

## Arms

All four arms are evaluated on the same set of alerts.

| Arm | Information available at decision time |
|---|---|
| A. Baseline | TrenchScanner model output only |
| B. TokenSage | A + TokenSage read available at that time |
| C. XScanner | A + X attention counts |
| D. Both | A + TokenSage + X attention counts |

Compare B vs A, C vs A, D vs B, D vs C. Report each separately.

## Unit and reference

- Unit: one TrenchScanner alert (`alerts` export), with its mint and alert timestamp `t0`.
- Reference outcome: price path after `t0` (`paths` export). Outcome definition, horizon and thresholds are fixed before looking at any result.
- Same universe for every arm. No alert dropped from one arm only.

## No look-ahead (hard rule)

- Every feature must be computable from data timestamped at or before `t0` plus the arm's latency.
- TokenSage read: use the feature vector stored at the anchor (`CandidateOutcome.features`, narrative columns). It is a summary of the read, not the read. If only the current read can be obtained, arms B and D are not evaluable. Do not substitute the current read.
- X counts: bins strictly before `t0 + latency`. Counts endpoint, minute bins. Recent window is 7 days, so historical alerts older than 7 days need full-archive counts (priced separately, $0.010 per request per docs read 2026-11-06). Verify the price on the date of the test.
- Mint attribution: a string counts as a mint only after the account check (`docs/EXPERIMENTS.md` E3 and E4).

## Temporal feasibility countertests (X0 proposal, 2026-11-22)

These controls are required **before** turning descriptive E7 returns into a strategy metric. They do not rewrite E7 or authorize a provider call.

1. **Event timestamp vs availability timestamp.** Record separately `t0` (TrenchScanner alert), X post/bin end time, API request time, API response time, and the time a feature could have been used. An X mention originally posted before `t0` but recovered retrospectively does **not** establish that it was queryable with the same completeness before the decision.
2. **Decision-time comparability.** Define a decision instant `t_decision = t0 + measured pipeline latency`. Distinguish any common-latency comparison from arm-specific latency comparisons; the latter change both information and possible market entry time. No arm may use data unavailable at its own declared decision instant.
3. **Entry price is not the candle open containing `t0`.** The current `src/prices/returns.ts` uses the **open of the minute bar containing `t0`** for descriptive returns. That open can precede the alert. For an *executable strategy* outcome, predefine an entry quote/price observable no earlier than `t_decision`, plus spreads, fees, slippage, liquidity, failed fills and price impact. If these cannot be measured, label the metric **descriptive price-path return**, never tradable PnL or expected profitability.
4. **Same cohort and missingness.** Keep every eligible alert in the denominator for each arm, mark unknown/unavailable features explicitly, and report missingness and abstention. The mint-address-only search misses ticker/name and linked-post discussions; do not equate no matching mint string with no social attention.
5. **No TokenSage substitution.** Without anchored historical TokenSage features from the operator, arms B and D remain **NOT_EVALUABLE**. A vs C alone cannot answer whether X improves on TokenSage; no post-hoc current narrative read is an acceptable replacement.
6. **Prespecified uncertainty.** The 30-mint E7 sample is exploratory. Fix the holdout, regime/window, minimum effective sample and statistical uncertainty method **before** any new comparison; a high peak return or one positive slice is not evidence of realized alpha.

**Outcome of X0:** approve a bounded offline/prospective comparison with defensible time semantics and permissioned sources, or record a NO-GO with the blocking evidence. Nothing here authorizes paid X requests, use of an exposed credential, partner data export, trading, merging or deploying.

## Costs to include

- X data cost per alert, from the console, not from docs alone. Balance reads are in cents, so batch enough requests to see the delta.
- Delay between `t0` and feature availability.
- Trading side if a return is reported: fees, liquidity, slippage. A simulation does not guarantee a real result.

## Fixed before any run

- Outcome definition and horizon.
- Minimum number of alerts per arm. Decide with the data owner after learning how many exist.
- Maximum latency considered useful.
- Maximum data budget.
- Failure criteria: majority of mint queries empty, bins missing, or cost above budget.

## What TrenchScanner's code says it keeps (read 2026-11-12, main `56c3e5b9`; not production)

- `CandidateOutcome.features`: feature vector at the anchor, `null` = unknown then. Includes `NARRATIVE_FEATURES` (TokenSage-derived). Rows are pruned after `CANDIDATE_OUTCOME_RETENTION_DAYS` (default 90). After that only a summary copied into `Match` remains.
- `CuratedAlert`: `narrativeVerdict`, `narrativeNotedAt`, `narrativeRationale`.
- `TokenNarrative`: one row per mint, overwritten. Not a history. Do not use it as the read at alert time.
- Candles: 1 s and 15 s kept `CANDLE_FINE_RETENTION_DAYS` (default 30), minute and wider `CANDLE_RETENTION_DAYS` (default 90).
- Partner key reads only `alerts` and `paths` exports (max 180 days per request). `outcomes` and `narratives` exports are operator-only.
- A subscriber's Model Alert key opens a live websocket only, with no replay. Collecting it from now on builds our own history.
- Unknown: production values of the retention settings, how many alerts exist, whether `features` covers what TokenSage actually read.

## Blockers

1. `outcomes` export (or only the narrative columns of `features` with `anchorAt`) is operator-only. GCR must export or open it.
2. Production retention values and number of alerts and prices kept.
3. A renewed, safely shared partner key. The first key was exposed and must be treated as compromised.
4. Age of the mint at scan time (`docs/INTEGRATION.md` hole 2). Needs his logs or DB.
5. A universe of same-age mints for any cohort percentile (hole 4).

## Order of work

1. Obtain data answers from GCR. Until then, arms B and D are not specified. Meanwhile, a live collector on a subscriber key can start building history (needs the owner's decision).
2. If only alerts and prices are available: run A vs C only. State that TokenSage was not controlled for.
3. Pilot on a small set. Write bin counts, empty-bin share and measured cost in `docs/EXPERIMENTS.md` before widening.
4. Only then compare arms. Report effect sizes with uncertainty. Do not claim a trading edge.

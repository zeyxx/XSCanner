# Comparison protocol (draft)

Status: original protocol proposed 2026-11-12, revised as a **Draft proposal** 2026-11-22. The **A/B/C/D model-ablation experiment has not been executed or ratified**. Separate E7 provider-count observations in `docs/EXPERIMENTS.md` are historical, descriptive and do not validate this protocol.
No X credit, API call, webhook or deployment is authorized by this file.

## Question

Does public X attention (mention counts per mint) add information beyond TokenSage's linked-post read, for the decisions TrenchScanner makes? At what latency and cost?

A weak result for mention counts does not show that other social signals are useless.

## Arms

All four arms require **the same eligible population of candidate decision moments**, not just the models' emitted alerts. Preserve the split by mint and event time (and regime) to avoid leakage between repeated moments of the same coin.

| Arm | Model features permitted as of decision |
|---|---|
| A. True T-only | On-chain/market TrenchScanner features; **no TokenSage-derived ns* features** |
| B. T+S | A + TokenSage features available at that decision moment |
| C. T+X | A + XScanner features actually available at that moment |
| D. T+S+X | A + S + X at that moment |

**Critical contamination guard (2026-11-22 upstream code review):** TrenchScanner's existing `CandidateOutcome.features` and trained model outputs **already include TokenSage ns* features**, including engagement from linked X posts (`nsXLikes`, `nsXReposts`, etc.). An exported **existing model score is NOT arm A** and merely adding public X counts to those scores is not arm C. A proper ablation requires an explicitly defined feature projection and comparable training/evaluation across arms (or a separately justified fixed-model experiment); do not label a filter/slice of current alerts as A/B/C/D model lift.

Compare B vs A, C vs A, D vs B, D vs C on held-out decision moments with outcomes and uncertainty. Avoid repeated-token leakage and hidden retraining differences.

## Unit and reference

- **Model ablation unit:** each eligible candidate decision moment (`CandidateOutcome` with anchor timestamp and point-in-time feature vector, subject to an agreed population and label policy), including moments without a sent alert. Select training/holdout splits before evaluating arms. An emitted alert is a **selected subset**.
- **Partner-only observation unit:** one exported emitted alert (`alerts`) with mint and alert timestamp `t0` and a follow-up path (`paths`). This can test the **descriptive association** between X attention and outcomes *conditional on having been selected by existing T/T*, but cannot estimate the lift of a new ranking model or a true T-only baseline.
- Reference outcomes: predefined price paths and on-chain events from the same decision horizon; threshold/entry price policy must be fixed before looking at an arm's result.
- Preserve the same eligible universe across arms. Unknown/unavailable features stay missing; no arm-specific dropping of challenging tokens.

## No look-ahead (hard rule)

- Every feature must be computable from data timestamped at or before `t0` plus the arm's latency.
- TokenSage read: use the feature vector stored at the anchor (`CandidateOutcome.features`, narrative columns). It is a summary of the read, not the read. If only the current read can be obtained, arms B and D are not evaluable. **Existing models and partner alerts are already influenced by TokenSage**: they are not an unconfounded arm A either. Do not substitute a current read or pretend stripping a field from an existing model score removes its effect.
- X counts: bins strictly before `t0 + latency`. Counts endpoint, minute bins. Recent window is 7 days, so historical alerts older than 7 days need full-archive counts (priced separately, $0.010 per request per docs read 2026-11-06). Verify the price on the date of the test.
- Mint attribution: a string counts as a mint only after the account check (`docs/EXPERIMENTS.md` E3 and E4).

## Temporal feasibility countertests (X0 proposal, 2026-11-22)

These controls are required **before** turning descriptive E7 returns into a strategy metric. They do not rewrite E7 or authorize a provider call.

1. **Event timestamp vs availability timestamp.** Record separately `t0` (TrenchScanner alert), X post/bin end time, API request time, API response time, and the time a feature could have been used. An X mention originally posted before `t0` but recovered retrospectively does **not** establish that it was queryable with the same completeness before the decision.
2. **Decision-time comparability.** Define a decision instant `t_decision = t0 + measured pipeline latency`. Distinguish any common-latency comparison from arm-specific latency comparisons; the latter change both information and possible market entry time. No arm may use data unavailable at its own declared decision instant.
3. **Entry price is not the candle open containing `t0`.** The current `src/prices/returns.ts` uses the **open of the minute bar containing `t0`** for descriptive returns. That open can precede the alert. For an *executable strategy* outcome, predefine an entry quote/price observable no earlier than `t_decision`, plus spreads, fees, slippage, liquidity, failed fills and price impact. If these cannot be measured, label the metric **descriptive price-path return**, never tradable PnL or expected profitability.
4. **Same cohort and missingness.** Keep every eligible alert in the denominator for each arm, mark unknown/unavailable features explicitly, and report missingness and abstention. The mint-address-only search misses ticker/name and linked-post discussions; do not equate no matching mint string with no social attention.
5. **No TokenSage substitution or selected-alert ablation.** Without operator-owned candidate-level anchored features, outcomes and an agreed evaluation/retraining policy, **none of A/B/C/D are a verified model ablation**. Partner alerts/paths can support a **P-only exploratory descriptive analysis** (observed X mentions vs outcomes among already-alerted tokens), but it is neither arm A nor a claim that X improves on TokenSage. No post-hoc current narrative read is an acceptable replacement.
6. **Prespecified uncertainty.** The 30-mint E7 sample is exploratory. Fix the holdout, regime/window, minimum effective sample and statistical uncertainty method **before** any new comparison; a high peak return or one positive slice is not evidence of realized alpha.

**Offline falsification guard (implemented on this Draft branch, not integrated):** `src/adapters/x-counts.ts::assessPointInTimeCounts`, covered by synthetic `tests/x-counts.test.ts`, rejects a counts response retrieved after the decision even if its posts predate `t0`. It also refuses missing acquisition times, pagination, missing bins and coverage gaps instead of fabricating a zero. This **does not** make retrospectively queried E7 values point-in-time admissible; E7 remains a descriptive provider comparison. A provider adapter must record honest request/response timestamps and an aligned closed query window to satisfy this gate. No live API calls occur in the tests. It does not certify the live provider's timestamp semantics or an executable entry price.

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

1. Obtain data answers from the upstream owner (population of candidate moments, anchored `features`, feature availability, labels, history, permissions). Until then **a genuine A/B/C/D model ablation is blocked**. A live collector is a separate opt-in data-gathering decision.
2. With partner `alerts` and `paths` alone: run only **P — selected-alert descriptive association** (counts/timing/coverage/cost versus observed outcomes); do **not** call it A vs C lift. Report how selection and TokenSage contamination limit inference.
3. Pilot on a small, predeclared set using existing E7 receipts first. Record bin counts, gaps, source availability timestamps and cost in `docs/EXPERIMENTS.md` before widening or spending more.
4. For true model lift, use a common candidate population and comparable re-evaluation/retraining of T, T+S, T+X and T+S+X on held-out time cohorts. Report effects/uncertainty and feasible-cost sensitivity. Do not claim a trading edge.

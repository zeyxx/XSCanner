# P0 — Offline replay admission, not a model backtest

Status: **schema and countertests only, 2026-11-22**. No historical source bundle has been imported, no pricing/billing activated, no live or upstream access requested. This repo is public: do **not** publish private partner alerts/paths, keys, identifiable private records or unlicensed fixtures.

## What is actually possible today

- `docs/EXPERIMENTS.md` E7 is a historical **30-mint aggregate**, collected on 2026-11-14. It reports descriptive X provider coverage and price-path summaries but the raw `data/compare-x.jsonl` and `data/prices.jsonl` files are **absent from the Git tree**.
- Aggregates cannot reconstruct individual candidate decision moments, source acquisition times, non-alerted candidate population, TokenSage anchored reads or realized execution prices. **Do not invent rows from the 9/30, 5/30, $0.18 historical totals.**
- `src/experiment/replay.ts::assessP0Replay` is a **pure evidence-admission function**, not a data connector, strategy simulation, forecasting algorithm or A/B/C/D scorer. It only accepts caller-supplied in-memory rows; it does not make a network call or write a file.

## One row per candidate decision moment

`P0ReplayRow` carries the following required contract:

| Field | Meaning | Required proof |
|---|---|---|
| `candidateKey` | stable decision-moment identity, **not just mint** | no duplicates, repeated decisions on same mint preserved |
| `mint` | candidate mint string | mint account check upstream; syntax alone is not enough |
| `population` | `selected_alert` or `candidate_decision` | origin and scope documented, not inferred from a partial export |
| `t0Ms`, `decisionAtMs` | alert/candidate timestamp and decision cutoff | finite, ordered, independently recorded |
| `xCounts.page` | minute bins and pagination of a specific X counts response | raw response/normalization version; a parser cannot invent missing bins |
| `xCounts.acquisition` | request start, response arrival, query window start/end | values recorded at I/O time; no historical fill-ins |
| `xCounts.availableAtMs` | instant the X result became usable by model | non-null, >= response receipt, <= decision for PIT admission |
| `outcome` | optional descriptive 60m price return | labeled `t0_minute_open_descriptive` only, not executable PnL |

All `xCounts` data are evaluated with `assessPointInTimeCounts`: no look-ahead, missing/pagination/window gaps are **not admissible**. A valid measured zero remains **zero**; absent or late X is **null**. A late retrospective provider response cannot become a point-in-time signal even if the tweets were posted before the decision.

## Outputs and nonclaims

The validator returns **counts of input moments**, populations, measured-zero, measured-nonzero, missing, nonadmissible and optional descriptive-outcome availability, plus one status per input. It always emits `mode: "P0_evidence_only"`, `ablationReady: false`, `executablePnlAvailable: false`.

A row labeled `candidate_decision` is **not proof that all candidates were exported**. `selected_alert` records are conditioned on the existing TrenchScanner/TokenSage model; descriptive comparison on them is the P-only selected-alert protocol, **not** the A/B/C/D ablation. The validator does not train models, evaluate holdouts, estimate incremental lift or profitability, compute any trade entry, or claim statistical significance.

## Future evidence dependencies (must be fulfilled explicitly)

1. **Data rights:** upstream owner permission for export and allowed storage/redaction; never use the historically exposed partner key.
2. **Denominator:** completeness manifest for candidate moments (including non-alerted ones), mint/cohort IDs, source version, losses/retention, and frozen time windows.
3. **Time:** for each X/TokenSage read, factual acquisition and model-availability timestamps. A response fetched only now is retrospective, not a decision-time feature.
4. **Outcomes:** independent descriptive returns with a known price basis. Any executable return requires entry price at or after decision, liquidity/slippage/fees/fills. E7 t0 candle open is not a trade.
5. **A/B/C/D only later:** anchored on-chain/base and TokenSage feature vectors, full candidate population, frozen train/holdout partition by mint/time/regime, prespecified uncertainty, identical outcome horizons, and comparable re-evaluation/retraining of T / T+S / T+X / T+S+X.
6. **Retention/source truth:** verify producer schema against current TrenchScanner/TokenSage Git and production with owner permission before accepting data.

## Gate to continue

- Run this **same versioned validator** on a small, authorized, raw P0 sample stored privately; record SHA256, source, owner permission, schema and an *observed* denominator.
- Publish **only aggregate/non-sensitive receipts** in this public repo.
- If actual data or time provenance is missing, publish `NO-GO: incomplete evidence` rather than filling gaps with E7 aggregates.

References: `docs/PROTOCOL.md`, `docs/INTEGRATION.md`, `docs/EXPERIMENTS.md`, `src/adapters/x-counts.ts`.

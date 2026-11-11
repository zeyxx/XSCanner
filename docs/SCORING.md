# XSCanner — Scoring

Two layers. Do not merge them.

His target formula is in `docs/GUIDELINE.md` sections 5 and 6. It is not implemented.

The code in `src/domain/services/` computes something else. That something else is a draft. It is not his score.

## His target (not implemented)

Core measure: `effective_voices`. Unique authors after collapsing a coordinated cluster to about one voice.

Coordination, in his brief, is accounts that behave alike: same mint in a short window, same reply target, near-duplicate text, shared `t.me` or referral, synced times, a roster that recurs across coins.

Dynamics he asks for, none of them in the code as specified:

- Decayed attention, half-life estimated from data. No published memecoin half-life. Open.
- Velocity as a fast EWMA over a slow EWMA (about 5 min vs 60 min), not a raw count in a window.
- Surprise as a Poisson or negative-binomial tail against a baseline. Not `(current - baseline) / baseline` with baseline 0.
- Cohort percentile against all mints of the same age. Requires a universe we do not have. Do not emit a number.

Composite 0–100 is a later formula. Weights are config. Every snapshot should carry `scoreVersion` and a hash of that config. The code stores neither.

Authenticity is `1 - coordinated share`, plus flags, plus chain cross-checks. Social signals alone are not enough. Chain flags come in the request or the check is skipped.

Flags he names: raid, paid boost, mayhem, KOL cluster, bundled launch, LLM-bot tell, coordinated shill. None are detected.

Validation he requires: a labeled set, lead/lag against buyers, graduation and rug outcomes. Not done. Do not claim the score means something.

## What the code actually computes

| Field | Code today | Relation to his brief |
|---|---|---|
| `mentions` | post count | Reference count only. He says this is not the main signal. |
| `effective_voices` | clusters of similar post text (TF-IDF cosine, threshold 0.8) | Not his method. Not unique-author count either. |
| `velocity` | count of posts in the last 1h, else the mention count | Not an EWMA ratio. |
| `velocity_1h`, `velocity_6h`, `velocity_24h` | counts in those windows | A window count. Not his velocity. |
| `surprise` | relative change against a caller-supplied baseline, else 0 or 1 | Not a Poisson tail. |
| `cohort_percentile` | rank against a caller-supplied list, else 0.5, else 0 if no posts | False number unless that list is all same-age mints. It is not. |
| `authenticity` | constant 1.0 | Not measured. |
| `flags` | empty | Not measured. |

`docs/SCORING.md` previously marked unique-author count and span velocity as implemented. That description was already stale when the clustering landed. Both descriptions are retired.

## Rules while the draft remains

- Do not add the draft fields to his score.
- Do not fill `cohort_percentile` to look complete.
- Do not rename the text cluster count to `effective_voices` in new code. Pick a name that says what it is, or delete it.
- A formula change bumps a version only once the version is stored on the snapshot. Storing nothing and claiming a version is not versioning.

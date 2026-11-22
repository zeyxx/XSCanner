import {
  assessPointInTimeCounts,
  type CountsAcquisitionEvidence,
  type XCountsPage,
} from "../adapters/x-counts.js";

/**
 * P0 evidence admission, not a trading simulator, model replay or A/B/C/D
 * ablation. The runner operates ONLY on explicitly supplied in-memory rows.
 * No clocks, filesystem, RPC, X calls, exports or credential reads.
 */
export type P0ReplayRow = {
  candidateKey: string; // event/decision identity; do not deduplicate by mint
  mint: string;
  population: "selected_alert" | "candidate_decision";
  t0Ms: number;
  decisionAtMs: number;
  xCounts: {
    page: XCountsPage;
    acquisition: Omit<CountsAcquisitionEvidence, "decisionAtMs">;
    availableAtMs: number | null; // when this particular read reached the model
  } | null;
  outcome: {
    return60mPct: number | null;
    priceBasis: "t0_minute_open_descriptive";
  } | null;
};

export type P0Decision = {
  candidateKey: string;
  status: "point_in_time" | "not_admissible" | "missing";
  reason: string | null;
  mentions: number | null; // zero only from a fully validated measured page
};

export type P0Summary = {
  mode: "P0_evidence_only";
  totalCandidateMoments: number;
  selectedAlertMoments: number;
  candidateDecisionMoments: number;
  outcomesWithDescriptiveReturns: number;
  pointInTimeX: number;
  measuredZeroX: number;
  measuredNonzeroX: number;
  missingX: number;
  notAdmissibleX: number;
  decisions: P0Decision[];
  ablationReady: false;
  executablePnlAvailable: false;
};

/**
 * Preserve the full supplied denominator, abstentions, repeated decision
 * moments on one mint, and the distinction between missing and measured zero.
 * All statuses are descriptive evidence quality, not prediction or lift.
 */
export function assessP0Replay(rows: readonly P0ReplayRow[]): P0Summary {
  const seen = new Set<string>();
  const summary: P0Summary = {
    mode: "P0_evidence_only",
    totalCandidateMoments: 0,
    selectedAlertMoments: 0,
    candidateDecisionMoments: 0,
    outcomesWithDescriptiveReturns: 0,
    pointInTimeX: 0,
    measuredZeroX: 0,
    measuredNonzeroX: 0,
    missingX: 0,
    notAdmissibleX: 0,
    decisions: [],
    ablationReady: false,
    executablePnlAvailable: false,
  };

  for (const row of rows) {
    if (!row.candidateKey || !row.mint || seen.has(row.candidateKey)) {
      throw new Error("P0 rows require non-empty unique decision identities and mint addresses.");
    }
    seen.add(row.candidateKey);
    if (!Number.isFinite(row.t0Ms) || !Number.isFinite(row.decisionAtMs) ||
        row.decisionAtMs < row.t0Ms) {
      throw new Error("P0 decision and alert timestamps must be finite and ordered.");
    }
    if (row.population !== "selected_alert" && row.population !== "candidate_decision") {
      throw new Error("Unknown P0 population label.");
    }
    if (row.outcome !== null && (row.outcome.priceBasis !== "t0_minute_open_descriptive" ||
        (row.outcome.return60mPct !== null && !Number.isFinite(row.outcome.return60mPct)))) {
      throw new Error("P0 only accepts finite descriptive outcomes; never executable PnL.");
    }

    summary.totalCandidateMoments++;
    if (row.population === "selected_alert") summary.selectedAlertMoments++;
    else summary.candidateDecisionMoments++;
    if (row.outcome?.return60mPct !== null &&
        row.outcome?.return60mPct !== undefined) summary.outcomesWithDescriptiveReturns++;

    if (row.xCounts === null) {
      summary.missingX++;
      summary.decisions.push({
        candidateKey: row.candidateKey, status: "missing", reason: "no_x_read",
        mentions: null,
      });
      continue;
    }

    const x = row.xCounts;
    const a = x.acquisition;
    const received = a.responseReceivedAtMs;
    const available = x.availableAtMs;
    if (available === null || !Number.isFinite(available) || received === null ||
        !Number.isFinite(received) || available < received) {
      summary.notAdmissibleX++;
      summary.decisions.push({
        candidateKey: row.candidateKey, status: "not_admissible",
        reason: "missing_or_inconsistent_availability", mentions: null,
      });
      continue;
    }
    if (available > row.decisionAtMs) {
      summary.notAdmissibleX++;
      summary.decisions.push({
        candidateKey: row.candidateKey, status: "not_admissible",
        reason: "feature_after_decision", mentions: null,
      });
      continue;
    }

    const proof = assessPointInTimeCounts(x.page, {
      ...a, decisionAtMs: row.decisionAtMs,
    });
    if (proof.status === "not_admissible") {
      summary.notAdmissibleX++;
      summary.decisions.push({
        candidateKey: row.candidateKey, status: "not_admissible",
        reason: proof.reason, mentions: null,
      });
      continue;
    }
    summary.pointInTimeX++;
    if (proof.totalMentions === 0) summary.measuredZeroX++;
    else summary.measuredNonzeroX++;
    summary.decisions.push({
      candidateKey: row.candidateKey, status: "point_in_time",
      reason: null, mentions: proof.totalMentions,
    });
  }
  return summary;
}

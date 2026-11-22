/**
 * Read-only npm advisory snapshot for CI. No installs, repairs, or lockfile edits.
 * The audit command queries the configured npm registry for published advisories.
 * This report is informational: PASS does not imply zero vulnerabilities.
 */
import { spawnSync } from "node:child_process";

type Advisory = {
  severity?: string;
  isDirect?: boolean;
  range?: string;
  nodes?: string[];
  via?: Array<string | { name?: string; title?: string; url?: string; source?: number }>;
  fixAvailable?: boolean | { name?: string; version?: string; isSemVerMajor?: boolean };
};
type AuditReport = {
  error?: { code?: string; summary?: string };
  metadata?: {
    vulnerabilities?: Record<string, number>;
    dependencies?: Record<string, number>;
  };
  vulnerabilities?: Record<string, Advisory>;
};

function audit(label: string, flags: string[]): void {
  const run = spawnSync("npm", ["audit", "--json", ...flags], {
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
    timeout: 90_000,
  });
  if (run.error || (run.status !== 0 && run.status !== 1)) {
    throw new Error(`npm audit (${label}) failed to run: ${run.error?.message ?? run.stderr}`);
  }
  let report: AuditReport;
  try {
    report = JSON.parse(run.stdout) as AuditReport;
  } catch {
    throw new Error(`npm audit (${label}) returned invalid JSON`);
  }
  if (report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities) {
    throw new Error(`npm audit (${label}) did not return a valid advisory report: ${report.error?.code ?? "missing fields"}`);
  }
  const totals = report.metadata.vulnerabilities;
  console.log(`AUDIT ${label}: ${JSON.stringify(totals)}`);
  for (const [name, v] of Object.entries(report.vulnerabilities).sort(([a], [b]) => a.localeCompare(b))) {
    const advisories = (v.via ?? []).filter((item): item is Exclude<typeof item, string> => typeof item !== "string");
    console.log(JSON.stringify({
      scope: label,
      package: name,
      severity: v.severity ?? "unknown",
      direct: v.isDirect ?? null,
      range: v.range ?? null,
      installedPaths: v.nodes ?? [],
      advisories: advisories.map((item) => ({ source: item.source ?? null, title: item.title ?? null, url: item.url ?? null })),
      fixAvailable: v.fixAvailable ?? null,
    }));
  }
}

audit("all", []);
audit("production-only", ["--omit=dev"]);
console.log("Read-only advisory report. No npm audit fix was executed; release/security gate remains open.");

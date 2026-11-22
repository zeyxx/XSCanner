/**
 * CLI preflight only: two independently billable X provider calls per mint.
 * A local estimate is NOT a provider-side billing limit. Live runs are opt-in
 * and require independently confirmed provider spending controls.
 * No network, filesystem, credentials or clock reads occur in this module.
 */
export type ComparisonPlan =
  | { execute: false; limit: number; estimatedMaxUsd: null; maxProviderRequests: number }
  | { execute: true; limit: number; estimatedMaxUsd: number; maxProviderRequests: number };

const MAX_MINTS_PER_RUN = 50;
const MAX_PRICING_AGE_DAYS = 7;
const REQUIRED_PRICE_KEYS = [
  "--max-usd",
  "--official-usd-per-request",
  "--getx-usd-per-request",
] as const;

/** Exact decimal-dollar parser, in integer microdollars, no rounding up/down. */
function usdMicros(value: string | undefined): number {
  if (!value || !/^(0|[1-9]\d{0,5})(?:\.(\d{1,6}))?$/.test(value)) {
    throw new Error("Money must be explicit non-negative USD with at most 6 decimals.");
  }
  const [whole, fractional = ""] = value.split(".");
  const micros = Number(whole) * 1_000_000 + Number(fractional.padEnd(6, "0"));
  if (!Number.isSafeInteger(micros)) throw new Error("USD amount exceeds safe precision.");
  return micros;
}

export function planComparison(args: readonly string[], nowMs: number): ComparisonPlan {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid clock.");
  const opts = new Map<string, string>();
  const switches = new Set<string>();
  const knownValues = new Set<string>(["--limit", "--pricing-reviewed-at", ...REQUIRED_PRICE_KEYS]);
  const knownSwitches = new Set(["--execute", "--dry-run", "--spending-cap-confirmed"]);

  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (knownSwitches.has(key)) {
      if (switches.has(key)) throw new Error(`Duplicate flag ${key}.`);
      switches.add(key);
      continue;
    }
    if (!knownValues.has(key)) throw new Error(`Unknown argument: ${key}.`);
    if (opts.has(key) || i + 1 >= args.length) throw new Error(`Missing/duplicate value for ${key}.`);
    opts.set(key, args[++i]!);
  }

  if (switches.has("--execute") && switches.has("--dry-run")) {
    throw new Error("Cannot combine --execute and --dry-run.");
  }
  const rawLimit = opts.get("--limit") ?? "20";
  if (!/^\d+$/.test(rawLimit)) throw new Error("--limit must be a positive integer.");
  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_MINTS_PER_RUN) {
    throw new Error(`--limit must be 1..${MAX_MINTS_PER_RUN}.`);
  }

  if (!switches.has("--execute")) {
    if (opts.has("--max-usd") || opts.has("--official-usd-per-request") ||
        opts.has("--getx-usd-per-request") || opts.has("--pricing-reviewed-at") ||
        switches.has("--spending-cap-confirmed")) {
      throw new Error("Budget/pricing flags without --execute are ambiguous.");
    }
    return { execute: false, limit, estimatedMaxUsd: null, maxProviderRequests: 0 };
  }
  if (!switches.has("--spending-cap-confirmed")) {
    throw new Error("Live requests need independent provider-side spending caps, then --spending-cap-confirmed.");
  }
  for (const key of REQUIRED_PRICE_KEYS) {
    if (!opts.has(key)) throw new Error(`Missing live budget evidence: ${key}.`);
  }
  const pricingDate = opts.get("--pricing-reviewed-at");
  if (!pricingDate || !/^\d{4}-\d{2}-\d{2}$/.test(pricingDate)) {
    throw new Error("Live requests need --pricing-reviewed-at YYYY-MM-DD.");
  }
  const reviewedAt = Date.parse(pricingDate + "T00:00:00.000Z");
  if (!Number.isFinite(reviewedAt) ||
      new Date(reviewedAt).toISOString().slice(0, 10) !== pricingDate) {
    throw new Error("Invalid pricing review date.");
  }
  const ageDays = (nowMs - reviewedAt) / 86_400_000;
  if (ageDays < 0 || ageDays > MAX_PRICING_AGE_DAYS + 1) {
    throw new Error("Provider prices were not reviewed within the last seven calendar days.");
  }
  const maximum = usdMicros(opts.get("--max-usd"));
  const official = usdMicros(opts.get("--official-usd-per-request"));
  const getx = usdMicros(opts.get("--getx-usd-per-request"));
  if (maximum === 0 || official === 0 || getx === 0) {
    throw new Error("Live cost ceiling and per-provider estimates must be positive.");
  }
  const estimatedMicros = limit * (official + getx);
  if (!Number.isSafeInteger(estimatedMicros) || estimatedMicros > maximum) {
    throw new Error("Worst-case request count exceeds the declared USD ceiling.");
  }
  return {
    execute: true,
    limit,
    estimatedMaxUsd: estimatedMicros / 1_000_000,
    maxProviderRequests: limit * 2,
  };
}

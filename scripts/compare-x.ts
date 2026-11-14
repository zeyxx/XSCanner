import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { buildGetXApiSearchUrl, parseGetXApiPage, summarizeGetXApiPage } from "../src/adapters/getxapi.js";
import { buildXCountsUrl, parseXCountsPage, summarizeXCountsBeforeCutoff } from "../src/adapters/x-counts.js";
import { dist, latestComplete, type PriceRow } from "../src/prices/analyze.js";

/**
 * Compares GetXAPI `advanced_search` vs Official X `counts/recent` on a small sample of
 * complete mints from `data/prices.jsonl`. One page per provider per mint (never paginates).
 *
 * Usage: npm run compare:x -- [--limit 20]
 */
const getxKey = process.env.GETXAPI_KEY;
const xBearer = process.env.X_API_BEARER_TOKEN;
if (!getxKey || !xBearer) {
  if (!getxKey) console.error("GETXAPI_KEY is missing in .env.");
  if (!xBearer) console.error("X_API_BEARER_TOKEN is missing in .env.");
  process.exit(1);
}

const limitIdx = process.argv.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) || 20 : 20;
const OUT_FILE = "data/compare-x.jsonl";
const PRICES_FILE = "data/prices.jsonl";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ExtendedPriceRow = PriceRow & { symbol?: string | null; t0?: string };

const priceRows = readFileSync(PRICES_FILE, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as ExtendedPriceRow);

const complete = latestComplete(priceRows) as (ExtendedPriceRow & { t0: string })[];
complete.sort((a, b) => a.t0.localeCompare(b.t0));

const already = new Set<string>();
if (existsSync(OUT_FILE)) {
  for (const l of readFileSync(OUT_FILE, "utf8").split("\n")) {
    if (!l.trim()) continue;
    const row = JSON.parse(l) as { mint?: string };
    if (row.mint) already.add(row.mint);
  }
}

const candidates = complete.filter((r) => !already.has(r.mint));
// Evenly spaced sample across time so we do not cherry-pick winners or one hour.
const step = Math.max(1, Math.floor(candidates.length / limit));
const sample = candidates.filter((_, i) => i % step === 0).slice(0, limit);

console.log(`complete mints: ${complete.length}  already compared: ${already.size}  running: ${sample.length}`);
mkdirSync("data", { recursive: true });

for (const row of sample) {
  const t0Ms = Date.parse(row.t0);
  const nowMs = Date.now();
  const sevenDaysFloorMs = nowMs - (6 * 24 + 23) * 3_600_000;
  const startIso = new Date(Math.max(t0Ms - 24 * 3_600_000, sevenDaysFloorMs)).toISOString();
  const endIso = new Date(nowMs - 30_000).toISOString();

  const gxUrl = buildGetXApiSearchUrl(row.mint, { product: "Latest" });
  const xcUrl = buildXCountsUrl(row.mint, { startTimeIso: startIso, endTimeIso: endIso });

  const [gxRes, xcRes] = await Promise.all([
    fetch(gxUrl, { headers: { Authorization: `Bearer ${getxKey}`, accept: "application/json" }, signal: AbortSignal.timeout(15_000) }),
    fetch(xcUrl, { headers: { Authorization: `Bearer ${xBearer}`, accept: "application/json" }, signal: AbortSignal.timeout(15_000) }),
  ]);

  if (!gxRes.ok || !xcRes.ok) {
    console.log(`${row.symbol ?? row.mint}: error getxapi=${gxRes.status} official=${xcRes.status}`);
    if (gxRes.status === 401 || gxRes.status === 402 || xcRes.status === 403 || xcRes.status === 401) break;
    await sleep(1_500);
    continue;
  }

  const gxPage = parseGetXApiPage(await gxRes.json());
  const xcPage = parseXCountsPage(await xcRes.json());
  const gx = summarizeGetXApiPage(gxPage, t0Ms);
  const xc = summarizeXCountsBeforeCutoff(xcPage, t0Ms);

  const entry = {
    fetchedAt: new Date().toISOString(),
    mint: row.mint,
    symbol: row.symbol ?? null,
    t0: row.t0,
    ret5m: row.returns.atMin["5"] ?? null,
    ret60m: row.returns.atMin["60"] ?? null,
    getxapi: gx,
    officialCounts: xc,
  };
  appendFileSync(OUT_FILE, JSON.stringify(entry) + "\n");
  console.log(
    `${(row.symbol ?? "?").padEnd(10)} gx(total=${gx.totalReturned}, pre=${gx.beforeCutoff}, auth=${gx.uniqueAuthorsBeforeCutoff})  off(total=${xc.totalReturned}, pre=${xc.beforeCutoff})  r60=${entry.ret60m?.toFixed(1) ?? "n/a"}%`,
  );
  await sleep(1_200);
}

if (existsSync(OUT_FILE)) {
  const all = readFileSync(OUT_FILE, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as { ret60m: number | null; getxapi: { beforeCutoff: number }; officialCounts: { beforeCutoff: number } });
  const gxPre = all.filter((r) => r.getxapi.beforeCutoff > 0);
  const gxZero = all.filter((r) => r.getxapi.beforeCutoff === 0);
  const offPre = all.filter((r) => r.officialCounts.beforeCutoff > 0);
  const offZero = all.filter((r) => r.officialCounts.beforeCutoff === 0);
  console.log("\n== summary", `n=${all.length}`);
  console.log("getxapi pre>0:", dist(gxPre.map((r) => r.ret60m)), "  pre=0:", dist(gxZero.map((r) => r.ret60m)));
  console.log("official pre>0:", dist(offPre.map((r) => r.ret60m)), "  pre=0:", dist(offZero.map((r) => r.ret60m)));
}

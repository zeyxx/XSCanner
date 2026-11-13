import { appendFileSync, mkdirSync } from "node:fs";
import { buildGetXApiSearchUrl, parseGetXApiPage, summarizeGetXApiPage } from "../src/adapters/getxapi.js";

/**
 * Single-request probe for GetXAPI (`GET /twitter/tweet/advanced_search`).
 * Stops after one page (never follows `next_cursor`). Writes raw metadata + parsed summary
 * to `data/getxapi-probe.jsonl` so we can verify payload shape and dashboard credit delta.
 *
 * Usage: npm run probe:getxapi -- <mint_or_query> [cutoff_iso]
 */
const key = process.env.GETXAPI_KEY;
if (!key) {
  console.error("GETXAPI_KEY is not set in .env.");
  process.exit(1);
}

const queryArg = process.argv[2];
const cutoffArg = process.argv[3];
if (!queryArg) {
  console.error("Usage: npm run probe:getxapi -- <mint_or_query> [cutoff_iso]");
  process.exit(1);
}

const cutoffMs = cutoffArg ? Date.parse(cutoffArg) : undefined;
const url = buildGetXApiSearchUrl(queryArg, { product: "Latest" });

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${key}`, accept: "application/json" },
  signal: AbortSignal.timeout(15_000),
});

const status = res.status;
const bodyText = await res.text();
let raw: unknown = null;
try {
  raw = JSON.parse(bodyText);
} catch {
  console.error(`HTTP ${status} (non-JSON body, length=${bodyText.length})`);
  process.exit(1);
}

if (!res.ok) {
  console.error(`HTTP ${status}`, raw);
  process.exit(1);
}

const page = parseGetXApiPage(raw);
const summary = summarizeGetXApiPage(page, cutoffMs);

mkdirSync("data", { recursive: true });
appendFileSync(
  "data/getxapi-probe.jsonl",
  JSON.stringify({
    fetchedAt: new Date().toISOString(),
    query: queryArg,
    cutoffIso: cutoffArg ?? null,
    status,
    summary,
    page,
  }) + "\n",
);

console.log("status:", status);
console.log("summary:", summary);
if (page.tweets[0]) {
  console.log("newest tweet:", {
    id: page.tweets[0].id,
    createdAt: page.tweets[0].createdAt,
    authorHandle: page.tweets[0].authorHandle,
    authorFollowers: page.tweets[0].authorFollowers,
  });
}

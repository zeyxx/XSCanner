import { readdirSync, readFileSync } from "node:fs";
import type { AlertRecord } from "../src/collect/record.js";
import { analyze, type PriceRow } from "../src/prices/analyze.js";

const rows = readFileSync("data/prices.jsonl", "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as PriceRow);

const models = new Map<string, Set<string>>();
for (const f of readdirSync("data").filter((n) => /^alerts-.*\.jsonl$/.test(n))) {
  for (const line of readFileSync(`data/${f}`, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as AlertRecord;
    if ("parseError" in r) continue;
    const m = r.message as { mint?: string; model?: string };
    if (!m.mint) continue;
    (models.get(m.mint) ?? models.set(m.mint, new Set()).get(m.mint)!).add(m.model ?? "unknown");
  }
}
const counts = new Map([...models].map(([k, v]) => [k, v.size]));
const res = analyze(rows, counts);
console.log(`mints with a complete price row: ${res.mints}\n`);
const fmt = (d: { n: number; median: number; mean: number; shareUp: number } | null) =>
  d ? `n=${d.n} median=${d.median.toFixed(1)}% mean=${d.mean.toFixed(1)}% up=${(d.shareUp * 100).toFixed(0)}%` : "n/a";
for (const [title, groups] of [["overall", res.overall], ["by quote", res.byQuote], ["by number of models", res.byModels]] as const) {
  console.log(`== ${title}`);
  for (const [k, v] of Object.entries(groups)) {
    console.log(`  ${k}`);
    for (const [h, d] of Object.entries(v)) console.log(`    ${h.padEnd(8)} ${fmt(d)}`);
  }
}
console.log("\nDescriptive only. No fees, slippage or liquidity. Quote conversion to USD unverified for non-SOL pairs.");

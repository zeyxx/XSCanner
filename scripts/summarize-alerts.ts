import { readdirSync, readFileSync } from "node:fs";
import type { AlertRecord } from "../src/collect/record.js";
import { summarize } from "../src/collect/summary.js";

const files = readdirSync("data").filter((f) => /^alerts-.*\.jsonl$/.test(f)).sort();
const records: AlertRecord[] = [];
for (const f of files) {
  for (const line of readFileSync(`data/${f}`, "utf8").split("\n")) {
    if (line.trim()) records.push(JSON.parse(line) as AlertRecord);
  }
}
const s = summarize(records);
console.log(`files: ${files.length}  notifications: ${s.records}  parse errors: ${s.parseErrors}`);
console.log(`distinct tokens: ${s.tokens.length}`);
if (s.deliveryMs) console.log("deliveryMs:", s.deliveryMs);
console.log("calls by model:", s.callsByModel);
console.log("tokens (oldest first):");
for (const t of s.tokens) {
  console.log(`  ${t.firstAlertedAt}  ${t.symbol ?? "?"}  ${t.mint}  calls=${t.calls}  models=${t.models.length}`);
}

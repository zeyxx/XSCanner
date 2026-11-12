import { appendFileSync, mkdirSync } from "node:fs";
import { FATAL_CLOSE_CODES, nextBackoffMs, toRecord } from "../src/collect/record.js";

const URL = "wss://api.trenchscanner.app/v1/model-alerts";
const key = process.env.MODEL_ALERT_KEY;
if (!key) {
  console.error("MODEL_ALERT_KEY is not set. Put it in .env, never in a chat or a commit.");
  process.exit(1);
}

mkdirSync("data", { recursive: true });
let attempt = 0;
let count = 0;

function connect(): void {
  const ws = new WebSocket(URL);
  ws.addEventListener("open", () => {
    // First frame is the key (the server also accepts headers, which the built-in client cannot set).
    ws.send(JSON.stringify({ key }));
    attempt = 0;
    console.log(new Date().toISOString(), "connected");
  });
  ws.addEventListener("message", (event) => {
    const now = new Date();
    const file = `data/alerts-${now.toISOString().slice(0, 10)}.jsonl`;
    appendFileSync(file, JSON.stringify(toRecord(String(event.data), now)) + "\n");
    count += 1;
    if (count % 10 === 1) console.log(now.toISOString(), `alerts recorded: ${count}`);
  });
  ws.addEventListener("close", (event) => {
    console.log(new Date().toISOString(), "closed", event.code, event.reason);
    if (FATAL_CLOSE_CODES.has(event.code)) {
      console.error("Not retrying: key refused, revoked, or access ended.");
      process.exit(2);
    }
    setTimeout(connect, nextBackoffMs(attempt++));
  });
  ws.addEventListener("error", () => {
    // The close event follows and handles the retry.
  });
}

connect();

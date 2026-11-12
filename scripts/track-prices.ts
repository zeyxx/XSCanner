import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import type { AlertRecord } from "../src/collect/record.js";
import { computeReturns, type Candle } from "../src/prices/returns.js";

/**
 * Reads data/alerts-*.jsonl, and for each mint old enough fetches minute candles from
 * GeckoTerminal (free, ~30 requests/min) and writes the returns after the first alert
 * to data/prices.jsonl. Read-only on the network, no key. A mint is skipped once a complete row exists.
 *
 * Usage: npm run prices [-- --min-age <minutes>]   (default 65: a full hour plus a margin)
 */
const minAgeMin = Number(process.argv[process.argv.indexOf("--min-age") + 1]) || 65;
const PRICES_FILE = "data/prices.jsonl";
const SPACING_MS = 2_500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type First = { mint: string; symbol: string | null; t0: string; alertPriceUsd: number | null };

function firstAlerts(): First[] {
  const byMint = new Map<string, First>();
  for (const f of readdirSync("data").filter((n) => /^alerts-.*\.jsonl$/.test(n)).sort()) {
    for (const line of readFileSync(`data/${f}`, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const r = JSON.parse(line) as AlertRecord;
      if ("parseError" in r) continue;
      const m = r.message as { mint?: string; symbol?: string; alertedAt?: string; caps?: { priceUsd?: number } };
      if (!m.mint || !m.alertedAt) continue;
      const cur = byMint.get(m.mint);
      if (!cur || m.alertedAt < cur.t0)
        byMint.set(m.mint, { mint: m.mint, symbol: m.symbol ?? null, t0: m.alertedAt, alertPriceUsd: m.caps?.priceUsd ?? null });
    }
  }
  return [...byMint.values()];
}

function done(): Set<string> {
  const out = new Set<string>();
  if (!existsSync(PRICES_FILE)) return out;
  for (const line of readFileSync(PRICES_FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as { mint: string; returns: { complete: boolean } };
    if (r.returns.complete) out.add(r.mint);
  }
  return out;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${new URL(url).host}`);
  return res.json();
}

type Pair = { pairAddress: string; dexId: string; quoteToken?: { symbol?: string }; liquidity?: { usd?: number } };

async function resolvePool(mint: string): Promise<Pair | null> {
  const body = (await getJson(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)) as { pairs?: Pair[] };
  const pairs = body.pairs ?? [];
  pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  return pairs[0] ?? null;
}

const skip = done();
const nowSec = Math.floor(Date.now() / 1000);
const todo = firstAlerts().filter(
  (t) => !skip.has(t.mint) && nowSec - Date.parse(t.t0) / 1000 >= minAgeMin * 60,
);
console.log(`mints with alerts: ${firstAlerts().length}  already complete: ${skip.size}  to fetch: ${todo.length}`);

for (const t of todo) {
  try {
    const t0Sec = Math.floor(Date.parse(t.t0) / 1000);
    const pair = await resolvePool(t.mint);
    if (!pair) {
      console.log(t.symbol ?? t.mint, "no pool found");
      continue;
    }
    await sleep(SPACING_MS);
    const url =
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pair.pairAddress}/ohlcv/minute` +
      `?aggregate=1&limit=70&currency=usd&before_timestamp=${t0Sec + 3660}`;
    const body = (await getJson(url)) as { data: { attributes: { ohlcv_list: Candle[] } } };
    const returns = computeReturns(body.data.attributes.ohlcv_list, t0Sec, nowSec);
    appendFileSync(
      PRICES_FILE,
      JSON.stringify({
        mint: t.mint,
        symbol: t.symbol,
        t0: t.t0,
        pool: pair.pairAddress,
        dex: pair.dexId,
        quote: pair.quoteToken?.symbol ?? null,
        currency: "usd",
        alertPriceUsd: t.alertPriceUsd,
        fetchedAt: new Date().toISOString(),
        returns,
      }) + "\n",
    );
    const r = returns.atMin;
    console.log(
      `${t.symbol ?? "?"} quote=${pair.quoteToken?.symbol ?? "?"} entry=${returns.entry} +5m=${r["5"]?.toFixed(1) ?? "n/a"} +15m=${r["15"]?.toFixed(1) ?? "n/a"} +60m=${r["60"]?.toFixed(1) ?? "n/a"} complete=${returns.complete}`,
    );
  } catch (err) {
    console.log(t.symbol ?? t.mint, "failed:", String(err));
  }
  await sleep(SPACING_MS);
}

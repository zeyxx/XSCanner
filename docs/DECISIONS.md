# XSCanner — Decisions

## D-001: Language — TypeScript (Node)

**Date:** 2026-11-05
**Status:** Accepted

### Decision
TypeScript (Node.js) for the entire XSCanner codebase.

### Rationale
1. **Integration with TrenchScanner and TokenSage** — TrenchScanner uses TypeScript/Node; TokenSage uses Python/FastAPI. Their existing integration is **HTTP/JSON** with an asynchronous prefetch and persisted results, not shared TypeScript imports. TypeScript fits XSCanner's TrenchScanner-facing adapter and tooling, while the service boundary remains language-neutral.
2. **Official Solana tooling** — `@pump-fun/pump-sdk`, `@solana/web3.js`, DexScreener/Jupiter clients are all TypeScript-first.
3. **Ship speed** — the user wants vertical completeness fast. TypeScript has mature HTTP, websocket, and testing tooling (vitest).
4. **Stats work** — MinHash, Poisson, EWMA can be done with npm packages (`datasketch`-equivalent, `simple-statistics`). Not as rich as Python/scipy, but sufficient for v1.

### Trade-offs
- Python would be better for advanced stats (Hawkes process, clustering). Deferred to a Python notebook for research track (Milestone 9).
- Rust would be faster but heavier to iterate and GCR won't contribute.

**Evidence correction (2026-11-22):** The original D-001 justification incorrectly described TokenSage as TypeScript. Correcting this factual premise does not revoke the accepted language choice, or authorize an SDK import into TokenSage. Source of truth: the upstream repositories' current code and API contracts.

### Consequences
- All domain logic in TypeScript. Pure functions where possible (FCIS).
- Research/analysis notebooks in Python (separate, not in the main codebase).

## D-002: Scoring parameters live next to the score

**Date:** 2026-11-06
**Status:** Accepted

### Decision
Scoring thresholds live in one object, `SCORING_CONFIG`, next to the metrics.
Runtime (port, pool, secrets) stays in the environment.
Provider API bounds stay in the adapter that calls that provider.

### Rationale
Same split as TrenchScanner: domain cuts next to the code that reads them, env for runtime.
GUIDELINE asks for score version and a config hash. One object can be hashed later.
A single dump file mixed those three kinds and could not be hashed cleanly.

### Consequences
Do not add port, pool, or X API limits to `SCORING_CONFIG`.
Do not edit TrenchScanner or TokenSage to share this file. Copy the idea, not the code.

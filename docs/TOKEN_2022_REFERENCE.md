# X0 — Token-2022 reference-differential plan (offline)

Status: **reference mapping implemented; independent runtime differential NOT RUN**.
Checked 2026-11-22 against
[solana-program/token-2022 interface v4.0.0 Rust sources](https://docs.rs/spl-token-2022-interface/4.0.0/src/spl_token_2022_interface/extension/mod.rs.html),
particularly `ExtensionType::get_account_type`,
`check_for_invalid_mint_extension_combinations`,
`try_for_each_tlv_extension_type`, and `type_and_tlv_indices`.
This is a static inspection of a published source; it is not a receipt of a live account, or execution of the Rust oracle.

## Guard contracts reproduced in TypeScript

- Base: initialized Mint base (82 bytes), two authority COption flags 0/1, owner one of SPL Token or Token-2022, not executable.
- Legacy token mint: exactly 82 bytes. Token-2022 mint: 82 bytes or `>=166`, excluding 355-byte Multisig, with 83 zero padding bytes and byte 165 = `AccountType.Mint` for extended accounts.
- TLV at byte 166: repeated little-endian u16 `type`, u16 `length`, bounded payload. Whitelist of mint-only ExtensionTypes as published at inspection; reject unknown or account-only types. Reject repeated types, truncated headers/payloads, and nonzero padding after `Uninitialized`.
- Fixed-size checks **only** for `MintCloseAuthority` (32 bytes), `NonTransferable` (0), `MetadataPointer` (64); all other TLV lengths are currently bound-checked but **not** semantically validated.
- Five type-set contradictions, reproduced from Rust `check_for_invalid_mint_extension_combinations`:
  1. ConfidentialTransferFeeConfig (16) requires both TransferFeeConfig (1) and ConfidentialTransferMint (4).
  2. TransferFeeConfig (1) and ConfidentialTransferMint (4) together require ConfidentialTransferFeeConfig (16).
  3. ConfidentialMintBurn (24) requires ConfidentialTransferMint (4).
  4. ScaledUiAmount (25) cannot coexist with InterestBearingConfig (10).
  5. NonTransferable (9) with ConfidentialTransferMint (4) requires ConfidentialMintBurn (24).

Countertests in `tests/measure.test.ts` are **locally synthesized TLV bytes**, not extracted from mainnet and not decoded/accepted by the official Rust library. A positive structural test must not be read as proof of valid packed extension values. Some of the combination-rejection tests intentionally use zero-length mock values solely to isolate the type-set check.

## Remaining independent oracle gate — OPEN

1. Obtain a **permissioned, safely shareable, independently sourced** JSON fixture bundle of `getAccountInfo` `owner`, `executable`, and `data` bytes from the same read, including classic mint, 2022 mint with real extensions, classic and 2022 token-holding account, 355-byte multisig, account-absent, malformed TLV, and multiple extension combinations. Record slot, commitment, RPC endpoint type, acquisition timestamp and SHA256 per fixture; **do not put secrets or private partner data in this public repo**.
2. Run reference decoder on the same bytes (e.g., version-pinned `spl-token-2022-interface` `StateWithExtensions::<Mint>::unpack` or maintained `@solana-program/token-2022`). Record oracle version/commit, expected boolean, and class-specific reasons.
3. Compare oracle to `isMint` for identical owner/data; classify divergences as true false-positive (risk of unnecessary paid call), false-negative (lost coverage), or out-of-scope semantic disagreement. Fix before promotion.
4. Confirm the choice of **deny unknown future TLV types** or use an updated decoder when upstream adds a new type. A structural allowlist ages.
5. Remain **read-only and offline** until explicit approval for RPC/provider access; current test suite performs no live reads.

The code in this PR is an **additional conservative filter**, not a proof that every accepted token is a usable tradable mint or that the X query is suitable.

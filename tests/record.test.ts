import { describe, expect, it } from "vitest";
import { FATAL_CLOSE_CODES, nextBackoffMs, toRecord } from "../src/collect/record.js";

const at = new Date("2026-11-12T22:00:05.000Z");

describe("toRecord", () => {
  it("keeps the message untouched and adds receive time and delivery delay", () => {
    const msg = { kind: "curated", id: "a1", alertedAt: "2026-11-12T22:00:00.000Z", mint: "M" };
    expect(toRecord(JSON.stringify(msg), at)).toEqual({
      receivedAt: "2026-11-12T22:00:05.000Z",
      deliveryMs: 5000,
      message: msg,
    });
  });
  it("records a missing alertedAt as null delay", () => {
    expect(toRecord('{"id":"x"}', at)).toMatchObject({ deliveryMs: null });
  });
  it("does not keep unparseable content", () => {
    expect(toRecord("not json", at)).toEqual({
      receivedAt: "2026-11-12T22:00:05.000Z",
      parseError: true,
      rawLength: 8,
    });
  });
});

describe("reconnect policy", () => {
  it("caps the backoff at 30 s", () => {
    expect(nextBackoffMs(0)).toBe(1000);
    expect(nextBackoffMs(20)).toBe(30000);
  });
  it("treats revoked, ended, and refused as fatal", () => {
    expect([...FATAL_CLOSE_CODES].sort()).toEqual([4401, 4403, 4429]);
  });
});

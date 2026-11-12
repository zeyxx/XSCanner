import { describe, expect, it } from "vitest";
import { computeReturns, type Candle } from "../src/prices/returns.js";

const t0 = 1_000_020; // inside bar 0 (1_000_000 to 1_000_060)
const bar = (min: number, o: number, h: number, l: number, c: number): Candle => [1_000_000 + min * 60, o, h, l, c, 1];

describe("computeReturns", () => {
  it("measures from the open of the bar containing t0", () => {
    // t0 = 1_000_020 sits in bar 0 (1_000_000..1_000_060).
    const bars = [bar(0, 100, 110, 95, 105), bar(4, 105, 150, 100, 120), bar(14, 120, 130, 60, 80), bar(59, 80, 90, 70, 85)];
    const r = computeReturns(bars, t0, 1_000_000 + 7200);
    expect(r.entry).toBe(100);
    expect(r.atMin["5"]).toBeCloseTo(20);
    expect(r.atMin["15"]).toBeCloseTo(-20);
    expect(r.atMin["60"]).toBeCloseTo(-15); // bar 59 has ended by t0+60min
    expect(r.peak60Pct).toBeCloseTo(50);
    expect(r.trough60Pct).toBeCloseTo(-40);
    expect(r.complete).toBe(true);
  });
  it("leaves horizons not yet reached as null and marks incomplete", () => {
    const bars = [bar(0, 100, 101, 99, 100), bar(4, 100, 120, 100, 110)];
    const r = computeReturns(bars, t0, 1_000_000 + 600);
    expect(r.atMin["5"]).toBeCloseTo(10);
    expect(r.atMin["15"]).toBeNull();
    expect(r.complete).toBe(false);
  });
  it("gives no entry when no bar covers t0", () => {
    const r = computeReturns([bar(5, 1, 1, 1, 1)], t0, 2_000_000);
    expect(r.entry).toBeNull();
    expect(r.complete).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { buildCountsUrl, buildCountsWindow } from "../src/adapters/x-official.js";
import { parseAccountResponse } from "../src/adapters/solana-rpc.js";

describe("buildCountsWindow", () => {
  it("ends 90 seconds before now and starts 7 days minus 5 minutes earlier", () => {
    const now = new Date("2026-11-06T17:15:00Z");
    const window = buildCountsWindow(now);
    expect(window.end.toISOString()).toBe("2026-11-06T17:13:30.000Z");
    expect(window.start.toISOString()).toBe("2026-10-30T17:18:30.000Z");
  });
});

describe("buildCountsUrl", () => {
  it("includes query, minute granularity, and ISO times", () => {
    const url = buildCountsUrl("ABC", {
      start: new Date("2026-10-30T17:18:30Z"),
      end: new Date("2026-11-06T17:13:30Z"),
    });
    expect(url).toContain("query=ABC");
    expect(url).toContain("granularity=minute");
    expect(url).toContain("start_time=2026-10-30T17%3A18%3A30Z");
    expect(url).toContain("end_time=2026-11-06T17%3A13%3A30Z");
  });
});

describe("parseAccountResponse", () => {
  it("maps a token account to an account read", () => {
    const raw = {
      result: {
        value: {
          owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
          executable: false,
          data: ["AAAA", "base64"],
        },
      },
    };
    expect(parseAccountResponse(raw)).toEqual({
      kind: "account",
      owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      executable: false,
      dataLength: 4,
    });
  });

  it("maps an empty result to absent", () => {
    expect(parseAccountResponse({ result: { value: null } })).toEqual({ kind: "absent" });
  });

  it("maps a wrong-size error to rejected", () => {
    expect(
      parseAccountResponse({ error: { code: -32602, message: "Invalid param: WrongSize" } }),
    ).toEqual({ kind: "rejected" });
  });
});

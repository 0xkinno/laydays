import { describe, expect, it } from "vitest";
import { fmtWilson, wilson } from "@/lib/proof/wilson";

describe("wilson", () => {
  it("matches hand-worked values", () => {
    const a = wilson(13, 15); // 0.8667, interval about 62% to 96%
    expect(a.lo).toBeCloseTo(0.621, 2); expect(a.hi).toBeCloseTo(0.963, 2);
    const b = wilson(5, 5); expect(b.lo).toBeCloseTo(0.566, 2); expect(b.hi).toBe(1);
    const c = wilson(0, 5); expect(c.lo).toBe(0); expect(c.hi).toBeCloseTo(0.434, 2);
    expect(fmtWilson(13, 15)).toBe("13 of 15, interval 62% to 96%");
  });
  it("is empty-safe", () => { expect(wilson(0, 0)).toMatchObject({ lo: 0, hi: 1 }); });
});

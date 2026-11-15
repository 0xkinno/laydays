import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { computeStatement } from "@/lib/laytime/clock";
import type { RuledInterval } from "@/lib/laytime/types";

const base = { demurrageRateCentsPerDay: 2_500_000n, despatchHalfRate: true };
const iv = (id: string, from: number, to: number, effect: RuledInterval["effect"], appliesOnDemurrage = false): RuledInterval => ({
  id, from, to, effect, appliesOnDemurrage,
});

describe("clock", () => {
  it("counts a straight wait and prices demurrage in cents", () => {
    // 36h allowed, 60h elapsed, 24h on demurrage at $25,000/day
    const s = computeStatement({ ...base, allowedMinutes: 36 * 60, commencesAt: 0, intervals: [iv("a", 0, 60 * 60, "counts")] });
    expect(s.demurrageMinutes).toBe(24 * 60);
    expect(s.demurrageCents).toBe(2_500_000n);
    expect(s.expiredAt).toBe(36 * 60);
  });

  it("excepted time does not run before expiry", () => {
    const s = computeStatement({ ...base, allowedMinutes: 600, commencesAt: 0, intervals: [iv("a", 0, 300, "counts"), iv("b", 300, 900, "excepted"), iv("c", 900, 1500, "counts")] });
    expect(s.laytimeUsedMinutes).toBe(600);
    expect(s.expiredAt).toBe(1200);
    expect(s.demurrageMinutes).toBe(300);
  });

  it("once on demurrage always on demurrage unless the clause applies on demurrage", () => {
    const mk = (flag: boolean) =>
      computeStatement({ ...base, allowedMinutes: 100, commencesAt: 0, intervals: [iv("a", 0, 100, "counts"), iv("b", 100, 400, "excepted", flag)] });
    expect(mk(false).demurrageMinutes).toBe(300);
    expect(mk(true).demurrageMinutes).toBe(0);
  });

  it("half rate counts exactly half the minutes", () => {
    const s = computeStatement({ ...base, allowedMinutes: 1000, commencesAt: 0, intervals: [iv("a", 0, 301, "half")] });
    expect(s.laytimeUsedMinutes).toBe(150.5);
  });

  it("reports gaps and never fills them", () => {
    const s = computeStatement({ ...base, allowedMinutes: 1000, commencesAt: 0, intervals: [iv("a", 0, 100, "counts"), iv("b", 200, 300, "counts")] });
    expect(s.gaps).toEqual([{ from: 100, to: 200 }]);
    expect(s.laytimeUsedMinutes).toBe(200);
  });

  it("pays despatch at half rate when laytime is not used up", () => {
    const s = computeStatement({ ...base, allowedMinutes: 1440, commencesAt: 0, intervals: [iv("a", 0, 720, "counts")] });
    expect(s.despatchMinutes).toBe(720);
    expect(s.despatchCents).toBe(625_000n);
  });

  it("property: turning a counted interval into an exception never raises demurrage", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 600 }), { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 3000 }),
        (lens, pick, allowed) => {
          let t = 0;
          const ivs = lens.map((l, i) => { const x = iv(`i${i}`, t, t + l, "counts"); t += l; return x; });
          const a = computeStatement({ ...base, allowedMinutes: allowed, commencesAt: 0, intervals: ivs });
          const k = pick % ivs.length;
          const ivs2 = ivs.map((x, i) => (i === k ? { ...x, effect: "excepted" as const } : x));
          const b = computeStatement({ ...base, allowedMinutes: allowed, commencesAt: 0, intervals: ivs2 });
          return b.demurrageCents <= a.demurrageCents;
        },
      ),
    );
  });

  it("property: reordering identical intervals does not change totals", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 2, maxLength: 8 }), fc.integer({ min: 0, max: 3000 }), (lens, allowed) => {
        const build = (order: number[]) => {
          let t = 0;
          return order.map((l, i) => { const x = iv(`i${i}`, t, t + l, "counts"); t += l; return x; });
        };
        const a = computeStatement({ ...base, allowedMinutes: allowed, commencesAt: 0, intervals: build(lens) });
        const b = computeStatement({ ...base, allowedMinutes: allowed, commencesAt: 0, intervals: build([...lens].reverse()) });
        return a.demurrageCents === b.demurrageCents && a.laytimeUsedMinutes === b.laytimeUsedMinutes;
      }),
    );
  });
});

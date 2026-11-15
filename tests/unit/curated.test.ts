import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { computeStatement } from "@/lib/laytime/clock";

interface Leg { example: number; leg: string; commences: string; completes: string; allowedHours: number; demurrageRateUsdPerDay: number; publishedHoursUsed: number; publishedOutcome: "demurrage" | "despatch"; publishedCents: number }
const set = JSON.parse(readFileSync("proof/curated/handybulk-examples.json", "utf8")) as { legs: Leg[] };
const mins = (iso: string) => Math.floor(Date.parse(iso + ":00Z") / 60000);

describe("curated published worked examples", () => {
  it("has at least six distinct examples", () => { expect(new Set(set.legs.map((l) => l.example)).size).toBeGreaterThanOrEqual(6); });
  for (const l of set.legs) {
    it(`example ${l.example}, ${l.leg}: ${l.publishedOutcome} of ${l.publishedCents} cents, to the minute and cent`, () => {
      const from = mins(l.commences), to = mins(l.completes);
      const s = computeStatement({ allowedMinutes: l.allowedHours * 60, commencesAt: from, demurrageRateCentsPerDay: BigInt(l.demurrageRateUsdPerDay * 100), despatchHalfRate: true, intervals: [{ id: "x", from, to, effect: "counts", appliesOnDemurrage: false }] });
      expect(s.laytimeUsedMinutes).toBe(Math.min(l.allowedHours * 60, to - from));
      expect(to - from).toBe(l.publishedHoursUsed * 60);
      if (l.publishedOutcome === "demurrage") { expect(s.demurrageCents).toBe(BigInt(l.publishedCents)); expect(s.despatchCents).toBe(0n); }
      else { expect(s.despatchCents).toBe(BigInt(l.publishedCents)); expect(s.demurrageCents).toBe(0n); }
    });
  }
});

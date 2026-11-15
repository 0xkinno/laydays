import { describe, expect, it } from "vitest";
import { generateVoyage, TRAP_KINDS } from "@/lib/laytime/generator";

describe("generator", () => {
  it("gives the same voyage for the same seed and a different one for another", () => {
    expect(generateVoyage(7)).toEqual(generateVoyage(7));
    expect(generateVoyage(7)).not.toEqual(generateVoyage(8));
  });
  it("every trap kind appears once with an answer set by the table", () => {
    const v = generateVoyage(42);
    expect(v.intervals.map((i) => i.kind).sort()).toEqual([...TRAP_KINDS].sort());
    for (const i of v.intervals) {
      if (i.kind === "rain_before_expiry") expect(i.truth).toBe("excepted");
      if (i.kind === "rain_after_expiry") expect(i.truth).toBe("counts");
      if (i.kind === "strike_after_expiry") expect(i.truth).toBe("excepted");
      if (i.kind === "shifting_half") expect(i.truth).toBe("half");
    }
  });
  it("intervals are contiguous and in order", () => {
    const v = generateVoyage(3);
    for (let k = 1; k < v.intervals.length; k++) expect(v.intervals[k].from).toBe(v.intervals[k - 1].to);
  });
});

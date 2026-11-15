import { centsForHalfMinutes } from "./money";
import type { ClockInput, ClockLine, Gap, Statement } from "./types";

/**
 * Laytime clock. Pure and deterministic.
 * Internally counts in half minutes so a half-rate interval counts exactly half of its minutes.
 * Rules applied:
 *  - Only time at or after `commencesAt` is considered.
 *  - counts: full minutes against the allowance. half: half of each minute. excepted: nothing.
 *  - Once laytime has expired, time runs on demurrage. An exception only stops the clock on demurrage
 *    when the deciding clause says it applies on demurrage (once on demurrage, always on demurrage).
 *  - Gaps between rulings are reported and never filled.
 * Rounding: money is rounded half up to the cent, once, on the total.
 */
export function computeStatement(input: ClockInput): Statement {
  const allowedHalf = input.allowedMinutes * 2;
  const sorted = [...input.intervals].sort((a, b) => a.from - b.from);

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.to < s.from) throw new Error(`interval ${s.id} ends before it starts`);
    if (i > 0 && s.from < sorted[i - 1].to) throw new Error(`interval ${s.id} overlaps ${sorted[i - 1].id}`);
  }

  let usedHalf = 0;
  let demHalf = 0;
  let expiredAt: number | null = input.allowedMinutes === 0 ? input.commencesAt : null;
  const lines: ClockLine[] = [];
  const gaps: Gap[] = [];
  let cursor: number | null = null;

  for (const iv of sorted) {
    const from = Math.max(iv.from, input.commencesAt);
    const to = iv.to;
    if (to <= from) continue;
    if (cursor !== null && from > cursor) gaps.push({ from: cursor, to: from });
    cursor = to;

    let countedHalf = 0;
    let lineDemHalf = 0;
    let t = from;

    while (t < to) {
      const remainingAllowedHalf = allowedHalf - usedHalf;
      if (remainingAllowedHalf > 0) {
        const weight = iv.effect === "counts" ? 2 : iv.effect === "half" ? 1 : 0;
        if (weight === 0) {
          t = to;
          break;
        }
        const minutesToExpiry = Math.ceil(remainingAllowedHalf / weight);
        const span = Math.min(to - t, minutesToExpiry);
        const take = Math.min(span * weight, remainingAllowedHalf);
        usedHalf += take;
        countedHalf += take;
        t += span;
        if (usedHalf >= allowedHalf && expiredAt === null) expiredAt = t;
      } else {
        const stops = iv.effect === "excepted" && iv.appliesOnDemurrage;
        const weight = stops ? 0 : iv.effect === "half" && iv.appliesOnDemurrage ? 1 : 2;
        const span = to - t;
        lineDemHalf += span * weight;
        t = to;
      }
    }
    demHalf += lineDemHalf;
    lines.push({
      id: iv.id,
      from,
      to,
      effect: iv.effect,
      elapsedMinutes: to - from,
      countedMinutes: countedHalf / 2,
      demurrageMinutes: lineDemHalf / 2,
      usedAfterMinutes: usedHalf / 2,
    });
  }

  const despatchHalfMin = usedHalf < allowedHalf ? allowedHalf - usedHalf : 0;

  return {
    lines,
    gaps,
    allowedMinutes: input.allowedMinutes,
    laytimeUsedMinutes: usedHalf / 2,
    expiredAt,
    demurrageMinutes: demHalf / 2,
    demurrageCents: centsForHalfMinutes(input.demurrageRateCentsPerDay, demHalf),
    despatchMinutes: despatchHalfMin / 2,
    despatchCents: input.despatchHalfRate
      ? centsForHalfMinutes(input.demurrageRateCentsPerDay / 2n, despatchHalfMin)
      : 0n,
  };
}

/** Laytime commences at NOR + notice time, or at commencement of operations if that is earlier. */
export function commencement(norTendered: number, noticeMinutes: number, operationsCommenced?: number): number {
  const byNotice = norTendered + noticeMinutes;
  return operationsCommenced !== undefined ? Math.min(byNotice, operationsCommenced) : byNotice;
}

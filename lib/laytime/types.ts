/** All time is integer minutes since the Unix epoch. Money is integer cents (bigint). No floats. */
export type Minutes = number;

export const EFFECTS = ["counts", "excepted", "half", "ambiguous"] as const;
export type Effect = (typeof EFFECTS)[number];
export type RuledEffect = Exclude<Effect, "ambiguous">;

export interface RuledInterval {
  id: string;
  from: Minutes;
  to: Minutes;
  effect: RuledEffect;
  /** True when the clause that decides this interval also applies after laytime has expired. */
  appliesOnDemurrage: boolean;
}

export interface ClockInput {
  /** Laytime allowed, in whole minutes. */
  allowedMinutes: Minutes;
  /** Minute at which laytime commences (see commencement()). */
  commencesAt: Minutes;
  /** Rulings in time order, no overlap. */
  intervals: RuledInterval[];
  /** USD cents per 24 hours. */
  demurrageRateCentsPerDay: bigint;
  /** Despatch is paid at half the demurrage rate when the charter party says so. */
  despatchHalfRate: boolean;
}

export interface ClockLine {
  id: string;
  from: Minutes;
  to: Minutes;
  effect: RuledEffect;
  /** Minutes in the interval after clipping to commencement. */
  elapsedMinutes: number;
  /** Laytime minutes counted against the allowance (half minutes shown as .5). */
  countedMinutes: number;
  /** Minutes in this interval that fell on demurrage. */
  demurrageMinutes: number;
  /** Laytime used after this interval. */
  usedAfterMinutes: number;
}

export interface Gap {
  from: Minutes;
  to: Minutes;
}

export interface Statement {
  lines: ClockLine[];
  gaps: Gap[];
  allowedMinutes: number;
  laytimeUsedMinutes: number;
  /** Minute laytime expired, or null if it never did. */
  expiredAt: Minutes | null;
  demurrageMinutes: number;
  demurrageCents: bigint;
  despatchMinutes: number;
  despatchCents: bigint;
}

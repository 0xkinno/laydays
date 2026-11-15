"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type Verdict = "OBSERVED" | "REVIEW" | "NOT OBSERVED" | "PERSON";

const STYLE: Record<Verdict, string> = {
  OBSERVED: "bg-signal text-ink border-ink/20",
  REVIEW: "bg-paper text-ink border-ink border-dashed",
  "NOT OBSERVED": "bg-transparent text-ink-soft border-ink/25 hatch",
  PERSON: "bg-harbour text-paper border-harbour",
};
const LABEL: Record<Verdict, string> = { OBSERVED: "Observed", REVIEW: "Review", "NOT OBSERVED": "Not observed", PERSON: "Ruled by analyst" };

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={verdict}
        initial={reduce ? false : { rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={reduce ? undefined : { rotateX: 90, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className={`tag inline-block rounded-[8px] border px-2 py-[3px] text-[11px] ${STYLE[verdict]}`}
      >
        {LABEL[verdict]}
      </motion.span>
    </AnimatePresence>
  );
}

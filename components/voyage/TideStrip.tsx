"use client";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export interface StripItem { id: string; minutes: number; effect: "counts" | "excepted" | "half" | null; label?: string }

/** The ship's wait as a horizontal strip. Width is proportional to minutes. Counted hours fill with Signal,
 *  excepted hours are hatched, half-rate hours are half filled, REVIEW is dashed. */
export function TideStrip({ items, height = 64, animate = false, activeId, onSelect }: { items: StripItem[]; height?: number; animate?: boolean; activeId?: string | null; onSelect?: (id: string) => void }) {
  const reduce = useReducedMotion();
  const total = items.reduce((a, i) => a + i.minutes, 0) || 1;
  const play = animate && !reduce;
  return (
    <div className="flex w-full" style={{ height, gap: 2 }} role="list" aria-label="Intervals of the ship's wait">
      {items.map((it, idx) => {
        const common = { flexGrow: it.minutes, flexBasis: 0, minWidth: 6 } as const;
        const body = (
          <>
            {it.effect === "counts" && <span className="absolute inset-0 bg-signal" />}
            {it.effect === "half" && <><span className="absolute inset-0 bg-paper" /><span className="absolute inset-x-0 bottom-0 h-1/2 bg-signal" /></>}
            {it.effect === "excepted" && <span className="hatch absolute inset-0 bg-paper" />}
            {it.effect === null && <span className="absolute inset-0 bg-paper" />}
          </>
        );
        const cls = `relative block h-full w-full overflow-hidden rounded-[6px] border ${it.effect === null ? "border-dashed border-ink" : "border-ink/25"} ${activeId === it.id ? "ring-2 ring-ink" : ""}`;
        const el = onSelect ? (
          <button type="button" aria-label={`${it.id}, ${it.minutes} minutes, ${it.effect ?? "review"}`} onClick={() => onSelect(it.id)} className={`${cls} cursor-pointer`}>{body}</button>
        ) : (
          <div className={cls}>{body}</div>
        );
        return play ? (
          <motion.div key={it.id} role="listitem" style={{ ...common, transformOrigin: "left" }} initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.15 + idx * 0.09, duration: 0.45, ease: "easeOut" }}>{el}</motion.div>
        ) : (
          <div key={it.id} role="listitem" style={common}>{el}</div>
        );
      })}
      <span className="sr-only">{total} minutes in total</span>
    </div>
  );
}

export function CountUp({ to, format, delay = 0, duration = 1.4 }: { to: number; format: (n: number) => string; delay?: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now() + delay * 1000;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / (duration * 1000)));
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, reduce, delay, duration]);
  return <>{format(v)}</>;
}

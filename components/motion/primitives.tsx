"use client";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type HTMLMotionProps } from "motion/react";
import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";

/** Fades and lifts a block into view once. Disabled under reduced motion. */
export function Reveal({ children, delay = 0, y = 22, className = "", as = "div" }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" | "p" }) {
  const reduce = useReducedMotion();
  const M = motion[as] as React.ComponentType<HTMLMotionProps<"div">>;
  return (
    <M className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}

export function Stagger({ children, className = "", gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } } }}>
      {children}
    </motion.div>
  );
}

/** Thin progress line across the top of the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-ink" style={{ scaleX: x }} />;
}

/** Lenis smooth scroll. Off under reduced motion. */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [reduce]);
  return null;
}

/** A button that leans toward the pointer. */
export function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 }), sy = useSpring(y, { stiffness: 220, damping: 18 });
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy, display: "inline-block" }}
      onPointerMove={(e) => { if (reduce) return; const r = ref.current!.getBoundingClientRect(); x.set((e.clientX - (r.left + r.width / 2)) * strength); y.set((e.clientY - (r.top + r.height / 2)) * strength); }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}

/** Slow parallax drift for a background layer. */
export function Parallax({ children, from = 0, to = -80, className = "" }: { children: ReactNode; from?: number; to?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [from, reduce ? from : to]);
  return <motion.div ref={ref} style={{ y }} className={className}>{children}</motion.div>;
}

/** Endless horizontal ticker. Content is duplicated once so the loop has no visible seam. */
export function Marquee({ items, speed = 38 }: { items: ReactNode[]; speed?: number }) {
  const reduce = useReducedMotion();
  const row = (k: string) => (
    <ul key={k} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={k === "b"}>
      {items.map((it, i) => <li key={i} className="flex shrink-0 items-center gap-3 whitespace-nowrap">{it}</li>)}
    </ul>
  );
  return (
    <div className="overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
      <motion.div className="flex w-max" animate={reduce ? undefined : { x: ["0%", "-50%"] }} transition={{ duration: speed, ease: "linear", repeat: Infinity }}>
        {row("a")}{row("b")}
      </motion.div>
    </div>
  );
}

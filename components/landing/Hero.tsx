"use client";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight, Play } from "lucide-react";
import { CountUp, TideStrip, type StripItem } from "@/components/voyage/TideStrip";
import { Magnetic } from "@/components/motion/primitives";

const fmt = (n: number) => `$${Math.round(n / 100).toLocaleString("en-US")}`;
const WORDS = ["Every", "hour", "of", "a", "ship’s", "wait,", "ruled.", "Every", "claim,", "presented", "before", "day", "90."];

export interface FloatCard { id: string; effect: "counts" | "excepted" | "half" | null; clause: string; label: string }

const POS = ["left-[2%] top-[34%]", "right-[1%] top-[28%]", "left-[6%] top-[62%]", "right-[4%] top-[58%]"];
const TONE: Record<string, string> = { counts: "bg-signal", excepted: "hatch bg-paper", half: "bg-gradient-to-t from-signal from-50% to-paper to-50%" };

export function Hero({ items, totalCents, spreadsheetCents, cards }: { items: StripItem[]; totalCents: number; spreadsheetCents: number; cards: FloatCard[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const shipY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const dialR = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const mask = "radial-gradient(ellipse 50% 46% at 50% 26%, transparent 52%, #000 100%)";

  return (
    <section ref={ref} className="relative isolate overflow-hidden px-4 pb-24 pt-32 sm:px-6">
      {/* atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div className="aurora anim-a left-[8%] top-[6%] h-[420px] w-[520px] bg-signal/70" />
        <div className="aurora anim-b right-[4%] top-[18%] h-[380px] w-[460px] bg-[#9fd9c6]/60" />
        <div className="aurora anim-a bottom-[8%] left-[38%] h-[320px] w-[420px] bg-[#f3e8a2]/70" />
        <div className="grid-lines absolute inset-0 opacity-70" style={{ maskImage: "radial-gradient(70% 60% at 50% 30%, #000, transparent 75%)", WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, #000, transparent 75%)" }} />
      </div>
      <motion.div aria-hidden style={{ y: shipY, maskImage: mask, WebkitMaskImage: mask }} className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 mx-auto w-full max-w-[1600px]">
        <div className="anim-bob">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/hero-tanker.svg" alt="" className="w-full select-none opacity-95" />
        </div>
      </motion.div>
      <motion.div aria-hidden style={{ rotate: dialR }} className="pointer-events-none absolute left-1/2 top-[8%] -z-10 hidden h-[900px] w-[900px] -translate-x-1/2 opacity-[.28] md:block">
        <div className="anim-spin h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/dial.svg" alt="" className="h-full w-full" />
        </div>
      </motion.div>

      {/* floating ruling cards, desktop only, never over the headline */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        {cards.slice(0, 4).map((c, i) => (
          <motion.div key={c.id} className={`absolute ${POS[i]}`} initial={reduce ? false : { opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.2 + i * 0.18, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <div className="anim-float glass edge w-56 rounded-[16px] p-3.5" style={{ animationDelay: `${i * 0.9}s` }}>
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-ink-soft">{c.id}</span><span className={`h-2.5 w-10 rounded-full border border-ink/20 ${c.effect ? TONE[c.effect] : "border-dashed bg-paper"}`} /></div>
              <p className="mt-2 line-clamp-3 text-[13px] leading-snug">{c.label}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-soft">{c.effect ?? "review"} · {c.clause}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div style={{ y: textY }} className="mx-auto max-w-5xl text-center">
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1.5">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full rounded-full bg-signal" style={{ animation: "pulse-ring 2s ease-out infinite" }} /><span className="relative inline-flex size-2 rounded-full bg-harbour" /></span>
          <span className="tag text-[11px] text-ink-soft">SERV Hackathon 02 · Open Track · Base Sepolia live</span>
        </motion.div>
        <h1 className="display mx-auto mt-6 max-w-4xl text-[clamp(42px,7.4vw,96px)] leading-[1.0]" aria-label="Every hour of a ship's wait, ruled. Every claim, presented before day 90.">
          {WORDS.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span className={`inline-block ${w === "ruled." || w === "90." ? "shimmer-text" : ""}`} initial={reduce ? false : { y: "110%", rotate: 3 }} animate={{ y: 0, rotate: 0 }} transition={{ delay: 0.15 + i * 0.055, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>{w}&nbsp;</motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8 }} className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
          Laydays reads the log of a port call against three rulebooks that disagree, with SERV Multipath, and lets the analyst present the claim with her own signature before the time bar.
        </motion.p>
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.8 }} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Magnetic><Link href="/voyage/orla-jansen" className="group inline-flex h-13 items-center gap-2 rounded-[14px] bg-ink px-6 py-3.5 font-medium text-paper shadow-[0_18px_50px_-18px_rgba(20,22,15,.7)] transition hover:-translate-y-0.5"><span className="rounded-md bg-signal px-1.5 py-0.5 text-[11px] font-semibold text-ink">LIVE</span>Open the Orla Jansen claim<ArrowRight size={17} className="transition group-hover:translate-x-1" /></Link></Magnetic>
          <Magnetic><Link href="/judge?tour=1" className="glass inline-flex h-13 items-center gap-2 rounded-[14px] px-6 py-3.5 font-medium transition hover:-translate-y-0.5"><Play size={15} />Watch the 60-second tour</Link></Magnetic>
        </motion.div>
        <p className="mt-4 text-xs text-ink-soft">MT Orla Jansen, Saltmarsh Tankers and Gulfline Trading are fictional. Rulings are recorded live SERV runs.</p>
      </motion.div>

      <motion.div initial={reduce ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="mx-auto mt-16 max-w-5xl">
        <div className="glass edge rounded-[24px] p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="tag text-ink-soft">The wait, ruled</p>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">Houston, 17 to 22 August 2026. Filled hours count, hatched hours are excepted, half-filled hours count at half.</p>
            </div>
            <div className="text-right">
              <p className="tag text-ink-soft">Demurrage after the rulings</p>
              <p className="display text-6xl sm:text-7xl"><CountUp to={totalCents} format={fmt} delay={2.2} /></p>
              <p className="text-xs text-ink-soft">A spreadsheet that counts every hour says <span className="font-mono line-through decoration-flare">{fmt(spreadsheetCents)}</span></p>
            </div>
          </div>
          <div className="mt-7"><TideStrip items={items} height={76} animate /></div>
        </div>
      </motion.div>
    </section>
  );
}

"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CountUp, TideStrip, type StripItem } from "@/components/voyage/TideStrip";
import { GlowCard } from "@/components/ui/GlowCard";

const fmt = (n: number) => `$${Math.round(n / 100).toLocaleString("en-US")}`;

export function Hero({ items, totalCents, spreadsheetCents }: { items: StripItem[]; totalCents: number; spreadsheetCents: number }) {
  const reduce = useReducedMotion();
  const mask = "radial-gradient(ellipse 46% 42% at 50% 24%, transparent 55%, #000 100%)";
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-32 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 50% at 50% 35%, rgba(215,243,74,.28), transparent 70%)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img aria-hidden src="/art/hero-tanker.svg" alt="" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 mx-auto w-full max-w-[1600px] select-none opacity-90" style={{ maskImage: mask, WebkitMaskImage: mask }} />
      <div className="mx-auto max-w-5xl text-center">
        <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="tag text-ink-soft">SERV Hackathon 02, Open Track</motion.p>
        <h1 className="display mx-auto mt-5 max-w-4xl text-[clamp(40px,7.2vw,92px)] leading-[1.02]">
          Every hour of a ship&rsquo;s wait, ruled. Every claim, presented before day 90.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
          Laydays reads the log of a port call against three rulebooks that disagree, with SERV Multipath, and lets the analyst present the claim with her own signature before the time bar.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/voyage/orla-jansen" className="inline-flex h-12 items-center rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] hover:brightness-95">Open the Orla Jansen claim</Link>
          <Link href="/judge?tour=1" className="inline-flex h-12 items-center rounded-[12px] border border-ink/20 px-6 font-medium hover:bg-paper-deep">Watch the 60-second tour</Link>
        </div>
        <p className="mt-3 text-xs text-ink-soft">MT Orla Jansen, Saltmarsh Tankers and Gulfline Trading are fictional. The rulings are recorded live SERV runs.</p>
      </div>

      <div className="mx-auto mt-16 max-w-5xl">
        <GlowCard className="p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="tag text-ink-soft">The wait, ruled</p>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">Houston, 17 to 22 August 2026. Filled hours count, hatched hours are excepted, half-filled hours count at half.</p>
            </div>
            <div className="text-right">
              <p className="tag text-ink-soft">Demurrage after the rulings</p>
              <p className="display text-5xl sm:text-6xl"><CountUp to={totalCents} format={fmt} delay={1.6} /></p>
              <p className="text-xs text-ink-soft">A spreadsheet that counts every hour says <span className="font-mono line-through">{fmt(spreadsheetCents)}</span></p>
            </div>
          </div>
          <div className="mt-6"><TideStrip items={items} height={72} animate /></div>
        </GlowCard>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Statement", d: "The laytime statement the analyst already sends, as a PDF.", href: "/voyage/orla-jansen#statement", img: "/art/dial.svg" },
            { t: "Documents", d: "Six of seven documents ready. The bills of lading are still in an email thread.", href: "/voyage/orla-jansen#documents", img: "/art/rulebooks.svg" },
            { t: "Base receipt", d: "A late or incomplete claim is refused onchain, with the reason decoded.", href: "/voyage/orla-jansen#present", img: "/art/receipt.svg" },
          ].map((c) => (
            <Link key={c.t} href={c.href} className="block">
              <GlowCard className="h-full p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" className="mb-4 h-24 w-full object-contain object-left" />
                <h3 className="display text-2xl">{c.t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{c.d}</p>
              </GlowCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

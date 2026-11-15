"use client";
import Link from "next/link";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { Check, FileText, ShieldCheck, Stamp } from "lucide-react";
import { Marquee, Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { GlowCard } from "@/components/ui/GlowCard";
import { Dial } from "@/components/ui/Dial";
import { VerdictChip } from "@/components/ui/VerdictChip";

/* ------------------------------------------------------------------ ticker */
export function Ticker({ facts }: { facts: string[] }) {
  return (
    <div className="border-y hair bg-paper/60 py-3.5 backdrop-blur">
      <Marquee items={facts.map((f) => (<><span className="size-1.5 rounded-full bg-signal ring-1 ring-ink/30" /><span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">{f}</span></>))} />
    </div>
  );
}

/* --------------------------------------------------------- section chrome */
export function Chapter({ n, tag, title, children, tone = "light" }: { n: string; tag: string; title: string; children: ReactNode; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <section className={dark ? "relative isolate overflow-hidden bg-harbour text-paper" : ""}>
      {dark && <div aria-hidden className="absolute inset-0 -z-10"><div className="aurora anim-a -left-20 top-10 h-[420px] w-[520px] bg-signal/20" /><div className="aurora anim-b right-0 bottom-0 h-[380px] w-[480px] bg-[#2f8f7c]/30" /><div className="grid-lines absolute inset-0 opacity-[.07] invert" /></div>}
      <div className={`mx-auto max-w-6xl px-4 py-24 sm:px-6 ${dark ? "" : "border-t hair"}`}>
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="numeral text-4xl opacity-60">{n}</span>
            <span className="h-px w-12 bg-current opacity-30" />
            <span className="tag opacity-70">{tag}</span>
          </div>
          <h2 className="display mt-4 max-w-3xl text-[clamp(34px,5vw,60px)] leading-[1.04]">{title}</h2>
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/* ----------------------------------------------- converging rulebooks graph */
export function Converge() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduce = useReducedMotion();
  const draw = (d: number) => ({ initial: { pathLength: reduce ? 1 : 0 }, animate: inView ? { pathLength: 1 } : {}, transition: { duration: 1.3, delay: d, ease: "easeInOut" as const } });
  const cols = [
    { x: 220, t: "Charter party", s: "CP-1 to CP-9", rows: [90, 70, 80, 60, 50] },
    { x: 550, t: "Laytime definitions", s: "L-1 to L-8", rows: [80, 90, 60, 70, 40] },
    { x: 880, t: "Port rules", s: "PR-1 to PR-3", rows: [70, 60, 90, 50, 60] },
  ];
  const T = (x: number, y: number, t: string, o: { size?: number; mono?: boolean; fill?: string } = {}) => (
    <text x={x} y={y} textAnchor="middle" className={o.mono ? "" : "tag"} style={{ fontSize: o.size ?? 11, letterSpacing: o.mono ? 0 : "0.14em" }} fontFamily={o.mono ? "var(--font-geist-mono)" : undefined} fill={o.fill ?? "#14160F"}>{t}</text>
  );
  return (
    <svg ref={ref} viewBox="0 0 1100 600" className="w-full" role="img" aria-label="Three rulebooks converge into one SERV Multipath graph, then the Laytime Clock and the analyst's signature">
      {cols.map((c, i) => (
        <g key={c.t}>
          <rect x={c.x - 110} y={20} width={220} height={190} rx={16} fill="rgba(255,255,255,.6)" stroke="rgba(20,22,15,.14)" />
          {T(c.x, 50, c.t.toUpperCase())}
          {T(c.x, 68, c.s, { size: 10, mono: true, fill: "#5B5E54" })}
          {c.rows.map((w, k) => <motion.rect key={k} x={c.x - 88} y={88 + k * 22} height={7} rx={3.5} fill="#14160F" opacity={0.2} initial={{ width: reduce ? w * 1.76 : 0 }} animate={inView ? { width: w * 1.76 } : {}} transition={{ delay: 0.2 + i * 0.15 + k * 0.08, duration: 0.7 }} />)}
          <motion.path d={`M${c.x} 210 C${c.x} 290 550 270 550 330`} fill="none" stroke="#0F3A34" strokeWidth={1.4} {...draw(0.9 + i * 0.15)} />
        </g>
      ))}
      <motion.circle cx={550} cy={376} r={46} fill="#D7F34A" stroke="#14160F" strokeWidth={1.2} initial={{ scale: reduce ? 1 : 0 }} animate={inView ? { scale: 1 } : {}} transition={{ delay: 2.1, type: "spring", stiffness: 160, damping: 14 }} style={{ transformOrigin: "550px 376px" }} />
      {inView && !reduce && <circle cx={550} cy={376} r={46} fill="none" stroke="#D7F34A" strokeWidth={2} style={{ transformOrigin: "550px 376px", animation: "pulse-ring 2.4s ease-out 2.6s infinite" }} />}
      {T(550, 372, "SERV", { size: 10 })}
      {T(550, 388, "MULTIPATH", { size: 10 })}
      <motion.path d="M550 422 V462" fill="none" stroke="#0F3A34" strokeWidth={1.4} {...draw(2.4)} />
      <motion.g initial={{ opacity: reduce ? 1 : 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 2.9 }}>
        <rect x={440} y={462} width={220} height={84} rx={16} fill="rgba(255,255,255,.75)" stroke="#14160F" strokeOpacity={0.5} />
        {T(550, 496, "LAYTIME CLOCK")}
        {T(550, 520, "minutes and cents, no model", { size: 11, mono: true, fill: "#5B5E54" })}
      </motion.g>
      <motion.path d="M660 504 H760" fill="none" stroke="#0F3A34" strokeWidth={1.4} {...draw(3.1)} />
      <motion.path d="M760 504 q22 -40 44 0 t44 0 t44 0" fill="none" stroke="#14160F" strokeWidth={2.4} strokeLinecap="round" {...draw(3.4)} />
      {T(848, 548, "HER SIGNATURE", { size: 10, fill: "#5B5E54" })}
    </svg>
  );
}

/* ------------------------------------------------------------- bento cards */
export function DocsCard({ docs }: { docs: { label: string; present: boolean }[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  return (
    <ul ref={ref} className="space-y-1.5">
      {docs.map((d, i) => (
        <motion.li key={d.label} className="flex items-center justify-between gap-3 rounded-[10px] bg-paper/70 px-3 py-2 text-sm" initial={reduce ? false : { opacity: 0, x: -14 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: i * 0.09 }}>
          <span>{d.label}</span>
          {d.present ? <motion.span initial={reduce ? false : { scale: 0 }} animate={inView ? { scale: 1 } : {}} transition={{ delay: 0.3 + i * 0.09, type: "spring", stiffness: 300, damping: 14 }} className="grid size-5 place-items-center rounded-full bg-signal ring-1 ring-ink/30"><Check size={12} strokeWidth={3} /></motion.span> : <span className="font-mono text-[11px] text-flare">missing</span>}
        </motion.li>
      ))}
    </ul>
  );
}

export function StatementMock({ total }: { total: string }) {
  const rows = [72, 58, 84, 46, 66, 52, 78];
  return (
    <div className="relative rounded-[12px] border hair bg-white/80 p-4 shadow-[0_20px_40px_-24px_rgba(15,58,52,.5)]" style={{ transform: "rotate(-1.4deg)" }}>
      <div className="flex items-center justify-between"><span className="tag text-[10px]">Laytime statement</span><FileText size={14} className="text-ink-soft" /></div>
      <div className="mt-3 space-y-1.5">{rows.map((w, i) => <motion.div key={i} className="h-1.5 rounded-full bg-ink/15" initial={{ width: 0 }} whileInView={{ width: `${w}%` }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.6 }} />)}</div>
      <div className="mt-4 flex items-end justify-between border-t hair pt-3"><span className="tag text-[10px] text-ink-soft">Demurrage due</span><span className="display text-2xl">{total}</span></div>
    </div>
  );
}

export function ReceiptStamp() {
  const reduce = useReducedMotion();
  return (
    <div className="relative rounded-[12px] border hair bg-white/80 p-4 font-mono text-[11px]">
      <p className="text-ink-soft">present(voyage, amount, digest, root, mask)</p>
      <p className="mt-1">block 59,0xx · base sepolia</p>
      <motion.div className="absolute -right-2 top-5 rotate-[-9deg] rounded-[8px] border-2 border-flare px-3 py-1.5 text-flare" initial={reduce ? false : { scale: 2.2, opacity: 0, rotate: -22 }} whileInView={{ scale: 1, opacity: 1, rotate: -9 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}>
        <span className="tag text-[11px]">TimeBarred</span>
      </motion.div>
      <p className="mt-8 text-ink-soft">refused: day 91, nothing moved</p>
    </div>
  );
}

export function Bento({ docs, total, day }: { docs: { label: string; present: boolean }[]; total: string; day: number }) {
  return (
    <Stagger className="grid auto-rows-[minmax(0,auto)] gap-4 md:grid-cols-6">
      <StaggerItem className="md:col-span-3">
        <GlowCard className="h-full p-6"><div className="flex items-start justify-between"><div><p className="tag text-ink-soft">The clock</p><h3 className="display mt-1 text-3xl">Ninety days, counted</h3><p className="mt-2 max-w-xs text-sm text-ink-soft">From completion of discharge. The last seven ticks turn flare.</p></div><Dial day={day} size={150} /></div></GlowCard>
      </StaggerItem>
      <StaggerItem className="md:col-span-3">
        <GlowCard className="h-full p-6"><p className="tag text-ink-soft">The documents</p><h3 className="display mt-1 text-3xl">Seven the clause demands</h3><div className="mt-4"><DocsCard docs={docs} /></div></GlowCard>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <GlowCard className="h-full p-6"><p className="tag text-ink-soft">The statement</p><h3 className="display mt-1 text-2xl">The sheet she already sends</h3><div className="mt-5"><StatementMock total={total} /></div></GlowCard>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <GlowCard className="h-full p-6"><p className="tag text-ink-soft">The refusal</p><h3 className="display mt-1 text-2xl">Late is refused onchain</h3><div className="mt-5"><ReceiptStamp /></div></GlowCard>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <GlowCard className="h-full p-6"><p className="tag text-ink-soft">The signature</p><h3 className="display mt-1 text-2xl">Her wallet, not a server</h3><div className="mt-5 flex items-center gap-3 rounded-[12px] border hair bg-white/80 p-4"><ShieldCheck className="text-harbour" /><p className="text-sm">EIP-712. Nobody else can move the money.</p></div><div className="mt-3 flex items-center gap-3 rounded-[12px] border hair bg-white/80 p-4"><Stamp className="text-harbour" /><p className="text-sm">The relayer pays gas and nothing else.</p></div></GlowCard>
      </StaggerItem>
    </Stagger>
  );
}

/* --------------------------------------------------- dark ruling showcase */
export function RulingShowcase({ quote, meta, branches, hash }: { quote: string; meta: string; branches: { rulebook: string; finding: string; clause_id: string; reason: string }[]; hash: string }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
      <Reveal>
        <blockquote className="display text-[clamp(28px,3.6vw,44px)] leading-[1.12]">&ldquo;{quote}&rdquo;</blockquote>
        <p className="mt-4 font-mono text-xs opacity-70">{meta}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3"><VerdictChip verdict="REVIEW" /><span className="text-sm opacity-80">Two rulebooks disagree and neither clearly governs, so code does not pick a winner. Meera decides, and her ruling is recorded as hers.</span></div>
        <p className="mt-5 break-all font-mono text-[11px] opacity-60">{hash}</p>
      </Reveal>
      <Stagger className="space-y-3" gap={0.15}>
        {branches.map((b) => (
          <StaggerItem key={b.rulebook}>
            <div className="glass-dark rounded-[18px] p-5">
              <div className="flex items-center justify-between"><span className="tag text-[11px] opacity-70">{b.rulebook.replace("_", " ")}</span><span className="font-mono text-xs">{b.clause_id}</span></div>
              <p className="display mt-1 text-3xl capitalize" style={{ color: b.finding === "excepted" ? "#FF9C7A" : b.finding === "counts" ? "#D7F34A" : "#F2F1EA" }}>{b.finding}</p>
              <p className="mt-1.5 text-sm opacity-75">{b.reason}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

/* ------------------------------------------------------------ the loop */
export function Loop() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const h = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const steps: [string, string][] = [
    ["Read", "Port Clerk turns the 41-line log into typed events. Prompt Guard stands in front of every untrusted line."],
    ["Rule", "Clause Reader rules each interval on three branches in one SERV Multipath graph. Shadow Agent checks the output."],
    ["Check", "Code verifies every clause id and log line exists, and resolves precedence between the rulebooks itself."],
    ["Count", "Laytime Clock counts minutes and cents. No model touches a number."],
    ["Sign", "Meera rules what is left, then signs the presentation with her own wallet."],
    ["Settle", "The ledger refuses a late or incomplete claim, pays the undisputed part when Dan accepts, and holds the rest."],
  ];
  return (
    <div ref={ref} className="relative mx-auto max-w-3xl">
      <div aria-hidden className="absolute bottom-2 left-[19px] top-2 w-px bg-ink/15"><motion.div className="w-full bg-ink" style={{ height: h }} /></div>
      <ol className="space-y-9">
        {steps.map(([t, d], i) => (
          <Reveal as="li" key={t} delay={0.04} className="relative flex gap-6">
            <span className="z-10 grid size-10 shrink-0 place-items-center rounded-full border border-ink/30 bg-paper font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
            <div><h3 className="display text-3xl">{t}</h3><p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">{d}</p></div>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <div className="glass edge relative overflow-hidden rounded-[28px] p-10 text-center sm:p-16">
          <div aria-hidden className="aurora anim-a -left-10 -top-10 h-72 w-96 bg-signal/60" />
          <h2 className="display relative mx-auto max-w-3xl text-[clamp(34px,5vw,64px)] leading-[1.04]">Get paid for the wait without losing the claim to the calendar.</h2>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/voyage/orla-jansen" className="inline-flex h-12 items-center rounded-[14px] bg-ink px-6 font-medium text-paper">Open the claim</Link>
            <Link href="/judge" className="glass inline-flex h-12 items-center rounded-[14px] px-6 font-medium">Sixty seconds for judges</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { GlowCard } from "@/components/ui/GlowCard";
import { Dial } from "@/components/ui/Dial";
import { VerdictChip } from "@/components/ui/VerdictChip";
import { Footer } from "@/components/Footer";
import { demoSummary, local, dhm } from "@/lib/view";
import { fact } from "@/lib/facts/read";

const SOURCES = [
  ["Dry bulk demurrage alone is estimated at 8 to 10 billion dollars in fees a year; daily rates run 15,000 to 30,000 dollars.", "https://marcura.com/blog/demurrage-claims-leakage"],
  ["About 75% of analyst time goes to process tasks, a single claim involves roughly 45 steps, and 99% of statements of facts are processed manually.", "https://marcura.com/blog/demurrage-claims-leakage"],
  ["Most teams still run laytime and demurrage on spreadsheets.", "https://marcura.com/resources/blog/demurrage-spreadsheets-vs-software"],
  ["An analyst processing 10 claims a month spends 2,520 to 4,200 hours a year on manual claim processing.", "https://www.voyagerportal.com/resources/manual-paperwork-in-shipping/"],
  ["90-day demurrage time bars with detailed document lists are common in the tanker trade.", "https://www.skuld.com/topics/legal/pi-and-defence/timebar-for-demurrage-claims/"],
  ["A claim was held time-barred because the bills of lading were not presented within 90 days (Tricon Energy v MTM Trading).", "https://caselaw.nationalarchives.gov.uk/ewhc/comm/2020/700"],
] as const;

function Section({ n, tag, title, children }: { n: string; tag: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl border-t hair px-4 py-20 sm:px-6">
      <div className="flex items-baseline gap-4">
        <span className="numeral text-3xl text-ink-soft">{n}</span>
        <span className="tag text-ink-soft">{tag}</span>
      </div>
      <h2 className="display mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function Home() {
  const s = demoSummary();
  const items = s.intervals.map((i) => ({ id: i.id, minutes: i.minutes, effect: i.effect }));
  const closure = s.intervals.find((i) => i.verdict === "REVIEW") ?? s.intervals[1];
  const total = Number(s.ceilingCents);
  const courtAgree = fact<number>("court_agree");
  const courtTotal = fact<number>("court_total");

  return (
    <>
      <main>
        <Hero items={items} totalCents={Number(s.floorCents)} spreadsheetCents={Number(s.spreadsheetCents)} />

        <Section n="01" tag="The moment" title="Day 83 of 90. Seventeen forty in Singapore.">
          <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-4 text-[17px] leading-relaxed">
              <p>Meera Pillai has eleven open claims. The <em>Orla Jansen</em> waited three days and nine hours beyond its laytime at Houston. The log of the port call is 41 handwritten lines: a notice of readiness, free pratique, a fog closure, rain, a hose failure, a berth shift, a strike at the terminal.</p>
              <p>The charter party says some of those hours count, some do not, and some count at half rate. Her spreadsheet says $61,250. The time bar clause lists seven documents that must travel with the claim. One of them, the bills of lading, is still in an email thread she has not opened.</p>
              <p className="text-ink-soft">Everyone assumes the hard part of a demurrage claim is the arithmetic. It is not. The money is lost in the reading, which hours a clause excepts, and in the calendar, a complete claim presented before the bar.</p>
            </div>
            <GlowCard className="flex items-center justify-center p-6"><Dial day={83} size={220} /></GlowCard>
          </div>
          <ul className="mt-10 divide-y hair border-y hair">
            {SOURCES.map(([t, href]) => (
              <li key={t} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-sm">{t}</span>
                <a href={href} className="shrink-0 font-mono text-xs underline underline-offset-4" target="_blank" rel="noreferrer">Source</a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">Each source was opened and the sentence confirmed on 15 November 2026. Meera, Dan, the vessel and both companies are fictional.</p>
        </Section>

        <Section n="02" tag="Rulebooks" title="In shipping, it is called laytime.">
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">SERV describes Multipath as complex, contradicting rulebooks held in one reasoning graph. In banking that is called compliance. A port call is the same problem: the charter party, the industry definitions and the port&rsquo;s own rules each say something different about the same hour.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/rulebooks.svg" alt="Three rulebooks converge into one reasoning graph, then the clock and the signature" className="mt-8 w-full" />
          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="tag">Branch one</p><p className="mt-1 text-ink-soft">The charter party clauses for this voyage.</p></div>
            <div><p className="tag">Branch two</p><p className="mt-1 text-ink-soft">Laytime definitions, in our own words.</p></div>
            <div><p className="tag">Branch three</p><p className="mt-1 text-ink-soft">The port rules and holiday calendar.</p></div>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-ink-soft">Models read and rule. Code keeps the clock and the money. A person signs.</p>
        </Section>

        <Section n="03" tag="The ruling" title="One hour, three rulebooks, one clause.">
          <GlowCard className="p-6 sm:p-8">
            <blockquote className="display text-2xl leading-snug sm:text-3xl">&ldquo;{closure.text}&rdquo;</blockquote>
            <p className="mt-2 font-mono text-xs text-ink-soft">{closure.startLine} to {closure.endLine} · {local(closure.from)} to {local(closure.to)} local · {closure.minutes} minutes</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {closure.branches.map((b) => (
                <div key={b.rulebook} className="rounded-[12px] border hair bg-paper p-4">
                  <p className="tag text-ink-soft">{b.rulebook.replace("_", " ")}</p>
                  <p className="display mt-1 text-2xl capitalize">{b.finding}</p>
                  <p className="mt-1 font-mono text-xs">{b.clause_id}</p>
                  <p className="mt-2 text-sm text-ink-soft">{b.reason}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <VerdictChip verdict={closure.verdict} />
              <span className="text-sm text-ink-soft">The charter party and the port rules disagree, so code does not pick a winner. Meera decides.</span>
            </div>
            <p className="mt-4 break-all font-mono text-[11px] text-ink-soft">rulebook {s.rulebookVersion.slice(0, 16)}… · SERV request {s.steps.find((x) => x.role.startsWith("Clause"))?.requestId ?? "n/a"}</p>
            <Link href={`/trace/${closure.id}`} className="mt-4 inline-block text-sm underline underline-offset-4">Open the trace of this ruling</Link>
          </GlowCard>
        </Section>

        <Section n="04" tag="The clock and the bar" title="A complete claim, before day 90, or nothing.">
          <div className="grid gap-6 md:grid-cols-3">
            <GlowCard className="flex flex-col items-center p-6"><Dial day={83} size={180} /><p className="mt-3 text-center text-sm text-ink-soft">Ninety days from completion of discharge on 22 August 2026.</p></GlowCard>
            <GlowCard className="p-6" >
              <p className="tag text-ink-soft">Documents the clause demands</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {["Notice of readiness", "Statement of facts, signed", "Bills of lading", "Pumping log", "Cargo manifest", "Laytime statement", "Stoppage and shifting notices"].map((d, i) => (
                  <li key={d} className="flex items-center justify-between gap-3"><span>{d}</span><span className={`font-mono text-xs ${i === 2 ? "text-flare" : ""}`}>{i === 2 ? "missing" : "ready"}</span></li>
                ))}
              </ul>
            </GlowCard>
            <GlowCard className="p-6">
              <p className="tag text-ink-soft">The contract refuses</p>
              <div className="mt-3 space-y-3 font-mono text-xs">
                <div className="rounded-[10px] border border-flare/60 p-3"><p className="text-flare">TimeBarred(deadline, now)</p><p className="mt-1 text-ink-soft">Presented after day 90.</p></div>
                <div className="rounded-[10px] border border-flare/60 p-3"><p className="text-flare">MissingSupportingDocuments(mask)</p><p className="mt-1 text-ink-soft">A document the clause demands is not in the claim.</p></div>
              </div>
            </GlowCard>
          </div>
        </Section>

        <Section n="05" tag="Proof" title="Measured against what courts decided.">
          <div className="grid gap-4 sm:grid-cols-3">
            <GlowCard className="p-6"><p className="tag text-ink-soft">Court replay</p><p className="display mt-2 text-4xl">{courtAgree !== null ? `${courtAgree} of ${courtTotal}` : "Not yet run"}</p><p className="mt-2 text-sm text-ink-soft">Reported English judgments on laytime and time bars. Misses are published.</p></GlowCard>
            <GlowCard className="p-6"><p className="tag text-ink-soft">Cost of the demo claim</p><p className="display mt-2 text-4xl">${s.costUsd.toFixed(3)}</p><p className="mt-2 text-sm text-ink-soft">{s.intervals.length} intervals ruled, from the recorded run of {new Date().getFullYear() === 2026 ? "15 Nov 2026" : "this event"}.</p></GlowCard>
            <GlowCard className="p-6"><p className="tag text-ink-soft">Needs a person</p><p className="display mt-2 text-4xl">{s.reviewCount} of {s.intervals.length}</p><p className="mt-2 text-sm text-ink-soft">Intervals the system refused to decide alone.</p></GlowCard>
          </div>
          <Link href="/proof" className="mt-6 inline-block text-sm underline underline-offset-4">Read the full scorecard, including the misses</Link>
        </Section>

        <Section n="06" tag="For agents" title="Pay two cents, get one ruling.">
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">Any agent can ask for one interval to be ruled against a set of clauses over x402, in test USDC on Base Sepolia. The answer carries the clause, the verdict and the SERV request id.</p>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">Pricing is a hypothesis: an analyst who spends 2,520 to 4,200 hours a year on manual claim processing would pay a per-claim desk price well above the cost of a run.</p>
          <Link href="/agents" className="mt-5 inline-flex h-11 items-center rounded-[12px] border border-ink/20 px-5 text-sm font-medium hover:bg-paper-deep">See the paid route</Link>
        </Section>
        <div className="mx-auto max-w-5xl px-4 pb-10 text-xs text-ink-soft sm:px-6">Total on the strip above, before Meera rules the one open interval: {s.usd(s.floorCents)} to {s.usd(BigInt(total))}. Spreadsheet duration: {s.spreadsheetDemurrage}.</div>
      </main>
      <Footer />
    </>
  );
}

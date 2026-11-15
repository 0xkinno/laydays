import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { Bento, Chapter, Converge, CtaBand, Loop, RulingShowcase, Ticker } from "@/components/landing/Sections";
import { GlowCard } from "@/components/ui/GlowCard";
import { Dial } from "@/components/ui/Dial";
import { Footer } from "@/components/Footer";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { demoSummary, local } from "@/lib/view";
import { fact } from "@/lib/facts/read";
import { DEMO } from "@/lib/serv/rulebooks.generated";

const SOURCES = [
  ["Dry bulk demurrage alone is estimated at 8 to 10 billion dollars in fees a year; daily rates run 15,000 to 30,000 dollars.", "https://marcura.com/blog/demurrage-claims-leakage", "Marcura"],
  ["About 75% of analyst time goes to process tasks, a single claim involves roughly 45 steps, and 99% of statements of facts are processed manually.", "https://marcura.com/blog/demurrage-claims-leakage", "Marcura"],
  ["Most teams still run laytime and demurrage on spreadsheets.", "https://marcura.com/resources/blog/demurrage-spreadsheets-vs-software", "Marcura"],
  ["An analyst processing 10 claims a month spends 2,520 to 4,200 hours a year on manual claim processing.", "https://www.voyagerportal.com/resources/manual-paperwork-in-shipping/", "Voyager"],
  ["90-day demurrage time bars with detailed document lists are common in the tanker trade.", "https://www.skuld.com/topics/legal/pi-and-defence/timebar-for-demurrage-claims/", "Skuld"],
  ["A claim was held time-barred because the bills of lading were not presented within 90 days (Tricon Energy v MTM Trading).", "https://caselaw.nationalarchives.gov.uk/ewhc/comm/2020/700", "High Court"],
] as const;

export default function Home() {
  const s = demoSummary();
  const items = s.intervals.map((i) => ({ id: i.id, minutes: i.minutes, effect: i.effect }));
  const closure = s.intervals.find((i) => i.verdict === "REVIEW") ?? s.intervals[1];
  const pick = ["I09", "I13", "I15", "I11"].map((id) => s.intervals.find((i) => i.id === id)).filter(Boolean) as typeof s.intervals;
  const cards = pick.map((i) => ({ id: i.id, effect: i.effect, clause: i.clauseIds.find((c) => c.startsWith("CP") || c.startsWith("PR")) ?? "none", label: i.text.replace(/^\d{4}-\d{2}-\d{2}T\S+\s*/, "") }));
  const day = Math.max(0, Math.floor((Date.now() / 1000 - Date.parse(DEMO.cp.completionOfDischarge) / 1000) / 86400));
  const courtAgree = fact<number>("court_agree");
  const courtTotal = fact<number>("court_total");
  const ledger = process.env.NEXT_PUBLIC_LEDGER_ADDRESS ?? "";
  const facts = [
    `${s.intervals.length} intervals ruled`, `${s.observed} observed`, `${s.reviewCount} sent to a person`, `$${s.costUsd.toFixed(4)} per claim`,
    `rulebook ${s.rulebookVersion.slice(0, 8)}`, ledger ? `ledger ${ledger.slice(0, 8)}…${ledger.slice(-4)} on Base Sepolia` : "Base Sepolia", "TimeBarred refused onchain", "MissingSupportingDocuments refused onchain",
  ];
  const docs = DEMO.cp.requiredDocuments.map((d) => ({ label: d.label, present: d.key !== "bol" }));

  return (
    <>
      <main>
        <Hero items={items} totalCents={Number(s.floorCents)} spreadsheetCents={Number(s.spreadsheetCents)} cards={cards} />
        <Ticker facts={facts} />

        <Chapter n="01" tag="The moment" title="Day 83 of 90. Seventeen forty in Singapore.">
          <div className="grid gap-10 md:grid-cols-[1.15fr_.85fr]">
            <div className="space-y-5 text-[17px] leading-relaxed">
              <Reveal><p>Meera Pillai has eleven open claims. The <em>Orla Jansen</em> waited three days and nine hours beyond its laytime at Houston. The log of the port call is 41 handwritten lines: a notice of readiness, free pratique, a fog closure, rain, a hose failure, a berth shift, a strike at the terminal.</p></Reveal>
              <Reveal delay={0.08}><p>The charter party says some of those hours count, some do not, and some count at half rate. Her spreadsheet says $61,250. The time bar clause lists seven documents that must travel with the claim. One of them, the bills of lading, is still in an email thread she has not opened.</p></Reveal>
              <Reveal delay={0.16}><p className="border-l-2 border-ink pl-4 text-ink-soft">Everyone assumes the hard part of a demurrage claim is the arithmetic. It is not. The money is lost in the reading, which hours a clause excepts, and in the calendar, a complete claim presented before the bar.</p></Reveal>
            </div>
            <Reveal delay={0.1}><div className="glass edge flex items-center justify-center rounded-[24px] p-8"><Dial day={83} size={260} /></div></Reveal>
          </div>
          <Stagger className="mt-12 divide-y hair border-y hair" gap={0.06}>
            {SOURCES.map(([t, href, who]) => (
              <StaggerItem key={t}><div className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"><span className="text-sm">{t}</span><a href={href} className="shrink-0 font-mono text-xs underline underline-offset-4" target="_blank" rel="noreferrer">{who} &rarr;</a></div></StaggerItem>
            ))}
          </Stagger>
          <p className="mt-3 text-xs text-ink-soft">Each source was opened and the sentence confirmed on 15 November 2026. Meera, Dan, the vessel and both companies are fictional.</p>
        </Chapter>

        <Chapter n="02" tag="Rulebooks" title="In shipping, it is called laytime.">
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">SERV describes Multipath as complex, contradicting rulebooks held in one reasoning graph. In banking that is called compliance. A port call is the same problem: the charter party, the industry definitions and the port&rsquo;s own rules each say something different about the same hour.</p>
          <div className="glass edge mt-10 rounded-[28px] p-4 sm:p-8"><Converge /></div>
          <p className="mt-6 max-w-2xl text-sm text-ink-soft">Models read and rule. Code keeps the clock and the money. A person signs.</p>
        </Chapter>

        <Chapter n="03" tag="The ruling" title="One hour, three rulebooks, no safe guess." tone="dark">
          <RulingShowcase quote={closure.text.replace(/^\d{4}-\d{2}-\d{2}T\S+\s*/, "")} meta={`${closure.startLine} to ${closure.endLine} · ${local(closure.from)} to ${local(closure.to)} local · ${closure.minutes} minutes`} branches={closure.branches} hash={`rulebook ${s.rulebookVersion.slice(0, 24)}… · SERV request ${s.steps.find((x) => x.role.startsWith("Clause"))?.requestId ?? "n/a"}`} />
          <Link href={`/trace/${closure.id}`} className="mt-8 inline-block text-sm underline underline-offset-4">Open the trace of this ruling</Link>
        </Chapter>

        <Chapter n="04" tag="The clock and the bar" title="A complete claim, before day 90, or nothing.">
          <Bento docs={docs} total={s.usd(s.floorCents)} day={day} />
        </Chapter>

        <Chapter n="05" tag="The loop" title="From a handwritten log to a signed claim.">
          <Loop />
        </Chapter>

        <Chapter n="06" tag="Proof" title="Measured against what courts decided.">
          <Stagger className="grid gap-4 sm:grid-cols-3">
            <StaggerItem><GlowCard className="h-full p-6"><p className="tag text-ink-soft">Court replay</p><p className="display mt-2 text-4xl">{courtAgree !== null ? `${courtAgree} of ${courtTotal}` : "Not yet run"}</p><p className="mt-2 text-sm text-ink-soft">Reported English judgments on laytime and time bars. Misses are published.</p></GlowCard></StaggerItem>
            <StaggerItem><GlowCard className="h-full p-6"><p className="tag text-ink-soft">Cost of the demo claim</p><p className="display mt-2 text-4xl">${s.costUsd.toFixed(3)}</p><p className="mt-2 text-sm text-ink-soft">{s.intervals.length} intervals ruled in the recorded live run.</p></GlowCard></StaggerItem>
            <StaggerItem><GlowCard className="h-full p-6"><p className="tag text-ink-soft">Needs a person</p><p className="display mt-2 text-4xl">{s.reviewCount} of {s.intervals.length}</p><p className="mt-2 text-sm text-ink-soft">Intervals the system refused to decide alone.</p></GlowCard></StaggerItem>
          </Stagger>
          <Link href="/proof" className="mt-6 inline-block text-sm underline underline-offset-4">Read the full scorecard, including the misses</Link>
        </Chapter>

        <Chapter n="07" tag="For agents" title="Pay two cents, get one ruling.">
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">Any agent can ask for one interval to be ruled against a set of clauses over x402, in test USDC on Base Sepolia. The answer carries the clause, the verdict and the SERV request id.</p>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">Pricing is a hypothesis: an analyst who spends 2,520 to 4,200 hours a year on manual claim processing would pay a per-claim desk price well above the cost of a run.</p>
          <Link href="/agents" className="glass mt-6 inline-flex h-11 items-center rounded-[12px] px-5 text-sm font-medium">See the paid route</Link>
        </Chapter>

        <CtaBand />
      </main>
      <Footer />
    </>
  );
}

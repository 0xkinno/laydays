import Link from "next/link";
import { Page } from "@/components/shell/Page";
import { GlowCard } from "@/components/ui/GlowCard";
import { Dial } from "@/components/ui/Dial";
import { demoSummary, usd } from "@/lib/view";
import { DEMO } from "@/lib/serv/rulebooks.generated";

export default function Desk() {
  const s = demoSummary();
  const day = Math.floor((Date.now() / 1000 - Date.parse(DEMO.cp.completionOfDischarge) / 1000) / 86400);
  return (
    <Page tag="Meera's desk" title="Open claims" wide intro="Each card is a claim with a clock. The dial counts the 90 days from completion of discharge. Fictional analyst, fictional operator.">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/voyage/orla-jansen" className="block">
          <GlowCard className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="tag text-ink-soft">Houston · Antwerp</p>
                <h2 className="display text-3xl">MT Orla Jansen</h2>
                <p className="mt-2 font-mono text-lg">{usd(s.floorCents)}</p>
              </div>
              <Dial day={Math.max(0, day)} size={104} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-[8px] border border-dashed border-ink px-2 py-1">{s.reviewCount} in review</span>
              <span className="rounded-[8px] border hair px-2 py-1">documents 6 of 7</span>
              <span className="rounded-[8px] border hair px-2 py-1">{s.intervals.length} intervals ruled</span>
            </div>
          </GlowCard>
        </Link>
        <Link href="/voyage/new" className="block">
          <GlowCard className="flex h-full flex-col justify-between p-6">
            <div><p className="tag text-ink-soft">Try your own</p><h2 className="display mt-1 text-3xl">Rule a log you paste</h2><p className="mt-2 text-sm text-ink-soft">Paste a statement of facts. Nothing is stored unless you sign. Three live rulings an hour.</p></div>
            <p className="mt-6 text-sm underline underline-offset-4">Open</p>
          </GlowCard>
        </Link>
        <Link href="/register" className="block">
          <GlowCard className="flex h-full flex-col justify-between p-6">
            <div><p className="tag text-ink-soft">Register</p><h2 className="display mt-1 text-3xl">Every statement produced</h2><p className="mt-2 text-sm text-ink-soft">From real live runs only, newest first, with the cost of each run.</p></div>
            <p className="mt-6 text-sm underline underline-offset-4">Open</p>
          </GlowCard>
        </Link>
      </div>
    </Page>
  );
}

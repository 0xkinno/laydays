import Link from "next/link";
import { Page } from "@/components/shell/Page";

const STEPS: [string, string, string][] = [
  ["The finished claim", "/", "Open the landing page. The tide strip draws itself: every hour of the wait, ruled."],
  ["One ruling", "/voyage/orla-jansen", "Click an interval. Three rulebooks, one clause, one verdict. The dashed interval is the one the system refuses to decide alone."],
  ["The trace", "/trace/I02", "Open the trace: model, SERV request id, rulebook version, citation check."],
  ["Meera rules the open hour", "/voyage/orla-jansen", "Pick counts, excepted or half. Her ruling is recorded as hers and the clock moves."],
  ["The documents", "/voyage/orla-jansen#documents", "Six of seven. The bills of lading are in an email thread. Attach them."],
  ["Sign and present", "/voyage/orla-jansen#present", "Connect the owner wallet. The contract refuses a late claim or a missing document."],
  ["Break it", "/break", "Try the attacks: a planted instruction, an obedient model, a late claim, a missing page."],
  ["The proof", "/proof", "Court replay, Multipath on against off, both error directions, misses included."],
];

export default function Judge() {
  return (
    <Page tag="For judges" title="Sixty seconds, no login" intro="Every step opens with data already loaded. Labels on screen say which people are fictional and which runs are recorded.">
      <ol className="divide-y hair border-y hair">
        {STEPS.map(([t, href, d], k) => (
          <li key={t} className="flex gap-5 py-5">
            <span className="numeral w-10 text-3xl text-ink-soft">{String(k + 1).padStart(2, "0")}</span>
            <div><Link href={href} className="display text-2xl underline-offset-4 hover:underline">{t}</Link><p className="mt-1 text-sm text-ink-soft">{d}</p></div>
          </li>
        ))}
      </ol>
    </Page>
  );
}

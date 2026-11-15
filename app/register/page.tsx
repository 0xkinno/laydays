import Link from "next/link";
import { Page } from "@/components/shell/Page";
import reg from "@/data/register.json";
import { formatUsd } from "@/lib/laytime/money";

interface Row { id: string; voyage: string; date: string; intervals: number; observed: number; review: number; amountCents: string | null; reppo: string; onchain: string; costUsd: number | null; kind: string }

export default function Register() {
  const rows = reg.rows as Row[];
  return (
    <Page tag="Public claims register" title="Every statement, from a real run" wide intro="Newest first. The demo voyage opens its statement and trace. Generated voyages are labelled: their answers are set by code before any model sees them, and they carry no money, so they have no statement to open.">
      <div tabIndex={0} role="region" aria-label="Register, scrolls sideways on small screens" className="overflow-x-auto rounded-[14px] border hair">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-paper-deep text-xs"><tr>{["Voyage", "Kind", "Date", "Intervals", "Observed / review", "Amount", "Reppo", "Onchain", "Run cost"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y hair">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-paper-deep/60">
                <td className="px-3 py-3">{r.id === "orla-jansen" ? <Link className="underline underline-offset-4" href={`/voyage/${r.id}`}>{r.voyage}</Link> : r.voyage}</td>
                <td className="px-3 py-3 text-ink-soft">{r.kind}</td>
                <td className="px-3 py-3 font-mono text-xs">{r.date}</td>
                <td className="px-3 py-3 font-mono">{r.intervals}</td>
                <td className="px-3 py-3 font-mono">{r.observed} / {r.review}</td>
                <td className="px-3 py-3 font-mono">{r.amountCents ? formatUsd(BigInt(r.amountCents)) : "no money"}</td>
                <td className="px-3 py-3 text-ink-soft">{r.reppo}</td>
                <td className="px-3 py-3 text-ink-soft">{r.onchain}</td>
                <td className="px-3 py-3 font-mono">{r.costUsd === null ? "not logged" : `$${r.costUsd.toFixed(4)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-soft">{rows.length} rows, all from real runs: the demo voyage and the generated voyages of the rulebook loop (house rules v1 and v2).</p>
    </Page>
  );
}

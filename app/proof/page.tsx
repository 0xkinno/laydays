import Link from "next/link";
import { Page } from "@/components/shell/Page";
import { fact } from "@/lib/facts/read";
import { demoSummary, usd } from "@/lib/view";
import { OnchainRecord } from "@/components/OnchainRecord";
import { ProofTables } from "@/components/ProofTables";
import { latestOnchain } from "@/lib/onchain";
import { addrUrl } from "@/lib/chain/addresses";

const show = (k: string) => { const v = fact(k); return v === null ? "not yet run" : String(v); };

export default function Proof() {
  const s = demoSummary();
  const chain = latestOnchain();
  const ledger = process.env.NEXT_PUBLIC_LEDGER_ADDRESS ?? "";
  const wrong = s.spreadsheetCents - s.floorCents;
  const cards: [string, string, string][] = [
    ["Court replay", show("court_summary"), "Reported English judgments on laytime and time bars, external truth that we did not choose. Misses are listed with reasons."],
    ["Multipath on against off", show("ablation_summary"), "Same held-out cases with plain gpt-6-luna, Multipath, Kronos plus Multipath, and Shadow Agent added."],
    ["Both error directions", show("errors_summary"), "Hours wrongly excepted against wrongly counted. Documents wrongly flagged missing against wrongly passed."],
    ["Cost per claim", `$${s.costUsd.toFixed(4)}`, "From the recorded Orla Jansen run, summed over every SERV call."],
    ["Onchain record", show("onchain_summary"), "Presentation, the two refusals, funding, answer and settlement on Base Sepolia."],
    ["Rulebook loop", show("loop_summary"), "Version 1 against version 2 of the house rules on new seeded voyages, answers set by code."],
    ["End to end", show("e2e_summary"), "Two wallets, a browser, and every step a real transaction."],
    ["Unattended run", show("watch_summary"), "One time bar watch that nobody started, from the scheduler."],
  ];
  return (
    <Page tag="Proof" title="What was measured, and what was not" wide intro="Reality rung: Base Sepolia with test USDC. Every number below is read from docs/FACTS.json, which a script writes from real runs. A card that says not yet run has not been run.">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([t, v, d]) => (
          <div key={t} className="rounded-[18px] border hair bg-paper-deep p-6"><p className="tag text-ink-soft">{t}</p><p className="display mt-2 break-words text-3xl">{v}</p><p className="mt-3 text-sm text-ink-soft">{d}</p></div>
        ))}
      </div>
      <h2 id="onchain" className="display mt-14 text-3xl">Onchain record</h2>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">Base Sepolia, test USDC, at testnet scale of one cent of demurrage to one millionth of a USDC. Ledger {ledger ? <a className="break-all font-mono underline" href={addrUrl(ledger)} target="_blank" rel="noreferrer">{ledger}</a> : "not configured"}, source verified on Basescan. Recorded {chain?.at.slice(0, 10) ?? "not yet"}.</p>
      <div className="mt-4"><OnchainRecord run={chain} /></div>
      <ProofTables />
      <h2 className="display mt-14 text-3xl">Counterfactual on the demo voyage</h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-soft">The spreadsheet way counts every hour and does not check documents. Laydays rules the same log.</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div><dt className="tag text-ink-soft">Spreadsheet claim</dt><dd className="display text-4xl">{usd(s.spreadsheetCents)}</dd></div>
        <div><dt className="tag text-ink-soft">Ruled claim (floor)</dt><dd className="display text-4xl">{usd(s.floorCents)}</dd></div>
        <div><dt className="tag text-ink-soft">Overclaim avoided</dt><dd className="display text-4xl">{usd(wrong)}</dd></div>
      </dl>
      <p className="mt-3 text-sm text-ink-soft">The spreadsheet also presents with six of seven documents. The contract refuses that onchain, and a charterer can treat it as waived.</p>
      <p className="mt-10 text-sm text-ink-soft">Method and every miss: <Link className="underline" href="https://github.com/0xkinno/laydays/blob/main/PROOF.md">PROOF.md</Link>, <Link className="underline" href="https://github.com/0xkinno/laydays/blob/main/FINDINGS.md">FINDINGS.md</Link>.</p>
    </Page>
  );
}

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fmtWilson } from "@/lib/proof/wilson";

const read = <T,>(p: string): T | null => (existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null);
const Table = ({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) => (
  <div className="overflow-x-auto rounded-[14px] border hair">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="bg-paper-deep text-xs"><tr>{head.map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y hair">{rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k} className="px-3 py-3 align-top">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);
const H = ({ children }: { children: React.ReactNode }) => <h2 className="display mt-14 text-3xl">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{children}</p>;

type Case = { id: string; citation: string; url: string; courtAnswer: string; decided: string };
type Arm = { label: string; agree: number; abstain: number; wrongPassed: number; wrongFlagged: number; wrongOther: number; n: number; runs: number; runAgree: number; medianMs: number; tokenCostUsd: number; perCase: Record<string, string> };
type Cmp = { v1: { sha256: string; summary: Sum }; v2: { sha256: string; summary: Sum } };
type Sum = { n: number; agree: number; abstained: number; wronglyExcepted: number; wronglyCounted: number; otherWrong: number; byKind: Record<string, { agree: number; n: number }> };

export function ProofTables() {
  const dir = "proof/court-replay/cases";
  const cases = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as Case) : [];
  const facts = read<{ replay_arms: Record<string, Arm> }>("proof/runs/replay.facts.json");
  const loop1 = read<{ summary: Sum }>("proof/runs/loop-v1-dev.json");
  const cmp = read<Cmp>("proof/runs/loop-compare.json");
  const reppo = read<{ evaluations: { kind: string; route?: string; score?: number }[] }>("proof/runs/loop-reppo.json");
  const paid = read<{ status: number; settlement: { transaction?: string } | null; at: string; body?: { serv?: { costUsd: number } } }>("proof/runs/x402-paid-call.json");
  const c = facts?.replay_arms?.c;
  const stats = read<{ calls: number; successful: number; medianMs: number; p95Ms: number; byRole: Record<string, { calls: number; ok: number; medianMs: number; p95Ms: number; totalTokenCostUsd: number }>; note: string }>("proof/runs/runs-stats.json");
  const e2e = read<{ passed: boolean; at: string; steps: string[] }>("proof/runs/e2e-flow.json");

  return (
    <>
      {facts && c && (
        <>
          <H>Court replay</H>
          <P>Seven reported English judgments, opened on caselaw.nationalarchives.gov.uk to confirm the citation and the decision. Cases were committed before they were run. With seven verified cases there is no honest development split, no prompt was tuned on them, and a sample this small gives a wide interval: {fmtWilson(c.agree, c.n)}. Laydays configuration shown: Kronos plus Multipath.</P>
          <div className="mt-4"><Table head={["Case", "The court decided", "Laydays", "Result"]} rows={cases.map((k) => { const v = c.perCase[k.id] ?? "not run"; const ans = v.split(" ")[0]; return [<a key="a" className="underline underline-offset-4" href={k.url} target="_blank" rel="noreferrer">{k.citation}</a>, k.courtAnswer.replace("_", " "), ans.replace("_", " "), ans === k.courtAnswer ? "agreed" : ans === "abstained" ? "abstained, sent to a person" : "miss"]; })} /></div>
          <P>Three abstentions are the system doing what it should when a clause names no documents: the Time-bar Clerk returns an empty list and the claim goes to a person. The one miss is the one that matters, and it points the dangerous way: for the bills of lading case the Clerk did not infer that the bills were required, so it passed a document list that the court said was incomplete. We did not change the prompt to fix it, because that would be tuning on the test.</P>
          <H>Plain model against Multipath, same cases</H>
          <div className="mt-4"><Table head={["Arm", "Agreed (per case)", "Abstained", "Wrongly passed", "Wrongly flagged", "Median latency", "Token cost"]} rows={Object.entries(facts.replay_arms).map(([k, a]) => [`${k.toUpperCase()}: ${a.label}`, fmtWilson(a.agree, a.n), a.abstain, a.wrongPassed, a.wrongFlagged, `${(a.medianMs / 1000).toFixed(1)} s`, `$${a.tokenCostUsd.toFixed(4)}`])} /></div>
          <P>Arm A ran three times per case and is shown by majority; the others ran once. A difference of one or two cases out of seven is noise, not evidence that Multipath helps. The honest reading is that on this test nothing separates the arms, and that the visible differences between them are in how reliably the output passes our citation check, which the rulebook loop below measures with far more intervals.</P>
        </>
      )}
      {loop1 && (
        <>
          <H>House rulebook loop</H>
          <P>Generated voyages, answers set by code before any model sees them (`lib/laytime/generator.ts`). Version 1 on 12 development seeds: {fmtWilson(loop1.summary.agree, loop1.summary.n)} agreed, {loop1.summary.abstained} sent to a person by the checks, {loop1.summary.wronglyExcepted + loop1.summary.wronglyCounted + loop1.summary.otherWrong} wrong. The failures cluster on the once-on-demurrage traps. Outside evaluator Reppo was asked about {reppo?.evaluations.length ?? 0} of the failing rulings, de-identified: {reppo?.evaluations.map((e) => `${e.kind.replace(/_/g, " ")} ${e.route} (${e.score})`).join(", ") ?? "none"}. SERV drafted five corrective rules from those failures and critiques; the owner approved them before they were run.</P>
          {cmp ? (
            <div className="mt-4"><Table head={["", "Version 1", "Version 2"]} rows={[
              ["Rulebook SHA-256", <span key="1" className="break-all font-mono text-xs">{cmp.v1.sha256.slice(0, 16)}…</span>, <span key="2" className="break-all font-mono text-xs">{cmp.v2.sha256.slice(0, 16)}…</span>],
              ["Agreed on 12 new seeds", fmtWilson(cmp.v1.summary.agree, cmp.v1.summary.n), fmtWilson(cmp.v2.summary.agree, cmp.v2.summary.n)],
              ["Sent to a person", cmp.v1.summary.abstained, cmp.v2.summary.abstained],
              ["Wrongly counted", cmp.v1.summary.wronglyCounted, cmp.v2.summary.wronglyCounted],
              ["Wrongly excepted", cmp.v1.summary.wronglyExcepted, cmp.v2.summary.wronglyExcepted],
              ["Other wrong", cmp.v1.summary.otherWrong, cmp.v2.summary.otherWrong],
              ...Object.keys(cmp.v1.summary.byKind).map((k) => [k.replace(/_/g, " "), `${cmp.v1.summary.byKind[k].agree} of ${cmp.v1.summary.byKind[k].n}`, `${cmp.v2.summary.byKind[k].agree} of ${cmp.v2.summary.byKind[k].n}`]),
            ]} /></div>
          ) : <P>Version 2 has not finished running on new seeds.</P>}
          {cmp && <P>What this shows, plainly: version 2 gained {cmp.v2.summary.agree - cmp.v1.summary.agree} of {cmp.v1.summary.n} intervals, which is within noise, and the two failure kinds the new rules were written for did not move (0 of 12 under both). Fog closures, where the charter party and the port rules disagree, went from 7 to 12 of 12. In 24 of the {cmp.v1.summary.abstained} version 1 abstentions the model's effect was already the right one: it ruled that a rain or hose stoppage counts once the vessel is on demurrage, citing the once-on-demurrage clause, and our check held it for a person because it did not also name the rain or hose clause. That is the check being conservative, not the model being wrong. Changing the check after seeing these results would contaminate the comparison, so it is left as is and listed as the next fix.</P>}
        </>
      )}
      {stats && (
        <>
          <H>Latency and cost, from every logged SERV call</H>
          <P>{stats.successful} successful of {stats.calls} logged calls: median {(stats.medianMs / 1000).toFixed(1)} s, 95th percentile {(stats.p95Ms / 1000).toFixed(1)} s. The failed ones are the calls refused when the credit ran out, and they are kept in. {stats.note}</P>
          <div className="mt-4"><Table head={["Role", "Calls", "Succeeded", "Median", "95th percentile", "Token cost"]} rows={Object.entries(stats.byRole).map(([r, v]) => [r.split("_").join(" "), v.calls, v.ok, `${(v.medianMs / 1000).toFixed(1)} s`, `${(v.p95Ms / 1000).toFixed(1)} s`, `$${v.totalTokenCostUsd.toFixed(4)}`])} /></div>
        </>
      )}
      {paid && paid.status === 200 && (
        <>
          <H>Revenue surface</H>
          <P>One x402 payment settled on Base Sepolia for a paid ruling: <a className="font-mono underline" href={`https://sepolia.basescan.org/tx/${paid.settlement?.transaction}`} target="_blank" rel="noreferrer">{paid.settlement?.transaction?.slice(0, 18)}…</a>. Price 0.02 USD in test USDC. The model cost of that ruling was ${paid.body?.serv?.costUsd.toFixed(5)}. An earlier attempt the same day was refused at the facilitator's settlement step with an RPC parameter error, and the retry settled, so we record both.</P>
        </>
      )}
      {e2e && (
        <>
          <H>End-to-end, two wallets</H>
          <P>{e2e.passed ? "Passed" : "Failed"} on {e2e.at.slice(0, 10)} in Chromium with injected test wallets for the owner and the charterer, every step a real Base Sepolia transaction: {e2e.steps.join("; ")}.</P>
        </>
      )}
    </>
  );
}

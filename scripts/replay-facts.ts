import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fmtWilson } from "../lib/proof/wilson";

type R = { case: string; rep: number; court: string; answer: string; agree: boolean; latencyMs: number; costUsd: number; requestId: string | null };
const arms = ["a", "b", "c", "d"].filter((a) => existsSync(`proof/runs/replay-${a}.json`));
const summ: Record<string, { label: string; agree: number; abstain: number; wrongPassed: number; wrongFlagged: number; wrongOther: number; n: number; runs: number; runAgree: number; medianMs: number; tokenCostUsd: number; perCase: Record<string, string> }> = {};
for (const a of arms) {
  const j = JSON.parse(readFileSync(`proof/runs/replay-${a}.json`, "utf8")) as { label: string; results: R[] };
  const byCase = new Map<string, R[]>();
  for (const r of j.results) byCase.set(r.case, [...(byCase.get(r.case) ?? []), r]);
  const s = { label: j.label, agree: 0, abstain: 0, wrongPassed: 0, wrongFlagged: 0, wrongOther: 0, n: byCase.size, runs: j.results.length, runAgree: j.results.filter((r) => r.agree).length, medianMs: 0, tokenCostUsd: j.results.reduce((x, r) => x + r.costUsd, 0), perCase: {} as Record<string, string> };
  for (const [id, rs] of byCase) {
    const votes = new Map<string, number>();
    rs.forEach((r) => votes.set(r.answer, (votes.get(r.answer) ?? 0) + 1));
    const top = [...votes.entries()].sort((x, y) => y[1] - x[1])[0][0]; // majority answer per case
    const court = rs[0].court;
    s.perCase[id] = `${top} (court ${court})`;
    if (top === court) s.agree++;
    else if (top === "abstained") s.abstain++;
    else if (top === "not_barred" && court === "barred") s.wrongPassed++;
    else if (top === "barred" && court === "not_barred") s.wrongFlagged++;
    else s.wrongOther++;
  }
  const ms = j.results.map((r) => r.latencyMs).sort((x, y) => x - y); s.medianMs = ms[Math.floor(ms.length / 2)] ?? 0;
  summ[a] = s;
}
const c = summ.c ?? summ.a;
const facts: Record<string, unknown> = {
  court_agree: c.agree, court_total: c.n,
  court_summary: `${fmtWilson(c.agree, c.n)}; ${c.abstain} abstained, ${c.wrongPassed + c.wrongFlagged + c.wrongOther} wrong`,
  ablation_summary: arms.map((a) => `${a.toUpperCase()} ${summ[a].agree}/${summ[a].n}`).join(", "),
  errors_summary: `documents wrongly passed ${c.wrongPassed}, wrongly flagged ${c.wrongFlagged}, abstained ${c.abstain}`,
  replay_arms: summ,
};
writeFileSync("proof/runs/replay.facts.json", JSON.stringify(facts, null, 2));
console.log(JSON.stringify(facts, null, 1));

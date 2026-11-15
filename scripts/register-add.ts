import { readFileSync, writeFileSync } from "node:fs";
import { demoSummary } from "../lib/view";

// Rebuilds data/register.json from real run files only: the demo voyage and every generated voyage in the rulebook loop.
type Row = { seed: number; abstained: boolean; agree: boolean };
const s = demoSummary();
const cmp = JSON.parse(readFileSync("proof/runs/loop-compare.json", "utf8")) as { at: string; v1: { rows: Row[] }; v2: { rows: Row[] } };
const rows: Record<string, unknown>[] = [{
  id: "orla-jansen", voyage: "MT Orla Jansen (fictional)", date: "2026-11-15", intervals: s.intervals.length, observed: s.observed, review: s.reviewCount,
  amountCents: s.floorCents.toString(), reppo: "ship: ruling 98, statement 95", onchain: "presented, funded, answered, settled on Base Sepolia",
  costUsd: Number(s.costUsd.toFixed(4)), kind: "demo voyage, recorded live run",
}];
for (const [ver, set] of [["v2", cmp.v2], ["v1", cmp.v1]] as const) {
  for (const seed of [...new Set(set.rows.map((r) => r.seed))].sort()) {
    const rs = set.rows.filter((r) => r.seed === seed);
    rows.push({
      id: `gen-${ver}-${seed}`, voyage: `Generated voyage, seed ${seed}`, date: cmp.at.slice(0, 10), intervals: rs.length,
      observed: rs.filter((r) => !r.abstained).length, review: rs.filter((r) => r.abstained).length, amountCents: null,
      reppo: "not sent", onchain: "not presented, a test voyage", costUsd: null, kind: `generated, answers set by code, house rules ${ver}`,
    });
  }
}
writeFileSync("data/register.json", JSON.stringify({ note: "Rows are written by scripts from real live runs. Nothing here is a mock-up. Generated voyages have answers set by code before any model sees them and carry no money.", rows }, null, 2) + "\n");
console.log(rows.length, "rows");

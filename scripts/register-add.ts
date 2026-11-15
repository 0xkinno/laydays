import { readFileSync, writeFileSync } from "node:fs";
import { demoSummary } from "../lib/view";
// Adds the recorded Orla Jansen run to the register if it is not there yet.
const f = "data/register.json";
const reg = JSON.parse(readFileSync(f, "utf8")) as { rows: Record<string, unknown>[] };
const s = demoSummary();
if (!reg.rows.some((r) => r.id === "orla-jansen")) {
  reg.rows.unshift({
    id: "orla-jansen", voyage: "MT Orla Jansen (fictional)", date: "2026-11-15", intervals: s.intervals.length, observed: s.observed, review: s.reviewCount,
    amountCents: s.floorCents.toString(), reppo: "not sent yet", onchain: "not presented yet", costUsd: Number(s.costUsd.toFixed(4)), kind: "demo voyage",
  });
}
writeFileSync(f, JSON.stringify(reg, null, 2) + "\n");
console.log(reg.rows.length, "rows");

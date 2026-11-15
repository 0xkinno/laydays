import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { demoSummary } from "../lib/view";

// Writes docs/FACTS.json from real run files. Every headline number in the UI and README comes from here.
const s = demoSummary();
const facts: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  demo_intervals: s.intervals.length,
  demo_observed: s.observed,
  demo_review: s.reviewCount,
  demo_cost_usd: Number(s.costUsd.toFixed(4)),
  demo_spreadsheet_cents: s.spreadsheetCents.toString(),
  demo_ruled_floor_cents: s.floorCents.toString(),
  demo_ruled_ceiling_cents: s.ceilingCents.toString(),
  rulebook_version: s.rulebookVersion,
};
const dir = "proof/runs";
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".facts.json"))) Object.assign(facts, JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
}
if (existsSync("proof/runs/e2e-flow.json")) { const e = JSON.parse(readFileSync("proof/runs/e2e-flow.json", "utf8")); facts.e2e_summary = `${e.passed ? "passed" : "failed"}, ${e.steps.length} steps`; }
mkdirSync("docs", { recursive: true });
writeFileSync("docs/FACTS.json", JSON.stringify(facts, null, 2) + "\n");
console.log("FACTS written", Object.keys(facts).length, "keys");

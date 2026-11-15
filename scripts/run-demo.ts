import { writeFileSync } from "node:fs";
import { DEMO } from "../lib/serv/rulebooks.generated";
import { ruleVoyage, type CpData } from "../lib/pipeline";
import { formatUsd } from "../lib/laytime/money";
const t0 = Date.now();
const run = await ruleVoyage({ sofRaw: DEMO.sof, cp: DEMO.cp as unknown as CpData, calendar: DEMO.calendar as never, offsetMinutes: -300, progress: (s) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s.stage}: ${s.detail}`) });
for (const i of run.intervals) console.log(`${i.id} ${i.startLine}->${i.endLine} ${String(i.to - i.from).padStart(5)}m ${i.kind}/${i.cause} => ${i.finalEffect ?? "REVIEW"} ${i.ruling.decidedBy ?? "-"} [${i.ruling.clause_ids.join(",")}] ${i.ruling.problems.join("; ")}`);
console.log("review", run.reviewCount, "floor", formatUsd(run.floorCents), "ceiling", formatUsd(run.ceilingCents), "cost", run.totalCostUsd.toFixed(4), "expired", run.statement.expiredAt);
console.log(run.steps.map((s) => `${s.role} ${s.model} ${s.latencyMs}ms $${s.costUsd.toFixed(4)} ${s.note ?? ""}`).join("\n"));
const failed = run.steps.filter((s) => s.note && !/^refused/.test(s.note));
if (failed.length) { console.error("NOT RECORDED, steps failed:", failed.map((f) => f.role + ": " + f.note).join(" | ").slice(0, 400)); process.exit(1); }
writeFileSync("data/demo/recorded-run.json", JSON.stringify(run, (_, v) => (typeof v === "bigint" ? v.toString() : v), 1));

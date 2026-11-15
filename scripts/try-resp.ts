import { loadEnv } from "./chain-env";
import { servPost } from "../lib/serv/client";
import { CLAUSE_READER_SYSTEM } from "../lib/serv/crew/prompts";
import { clauseUser } from "../lib/serv/crew/crew";
import { DEMO } from "../lib/serv/rulebooks.generated";
import { demoSummary } from "../lib/view";
import { parseSof } from "../lib/laytime/intervals";
loadEnv();
const i = demoSummary().intervals.find((x) => x.id === "I02")!;
const user = clauseUser({ cp: DEMO.cp.clauses as never, port: DEMO.calendar.rules as never, lines: parseSof(DEMO.sof), intervals: [{ id: i.id, from: i.from, to: i.to, startLine: i.startLine, endLine: i.endLine, kind: "waiting", cause: "none", text: i.text }], offsetMinutes: -300 });
for (const [label, model, effort] of [["plain medium", "gpt-6-luna", "medium"], ["multipath medium", "gpt-6-luna-serv-kronos-multipath", "medium"]] as const) {
  const r = await servPost("/responses", { model, instructions: CLAUSE_READER_SYSTEM, input: user + "\n\nReturn the answer as JSON with an intervals array as described.", reasoning: { effort, summary: "auto" }, max_output_tokens: 6000 }, 280000);
  const j = r.json as { output?: { type: string; summary?: unknown[]; content?: unknown[] }[] } | null;
  console.log(label, r.status, r.requestId, (j?.output ?? []).map((o) => `${o.type}:${JSON.stringify(o.summary ?? "").slice(0, 160)}`));
}

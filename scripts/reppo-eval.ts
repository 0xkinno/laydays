import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
import { poll, submit } from "../lib/reppo/client";
import { demoIntervals } from "../lib/view";

// Sends two de-identified items to Reppo (about 880 credits): the one disputed ruling and the statement as a whole. Advice only.
loadEnv();
const iv = demoIntervals();
const dispute = iv.find((i) => i.verdict === "REVIEW") ?? iv[1];
const ruling = `Task: decide whether this one interval of a ship's port call counts as laytime.\nLog line: ${dispute.text}\nCharter party clause CP-1: laytime runs unless a clause excepts it; no charter party clause mentions a Coast Guard channel closure.\nPort rule PR-1: time lost to a Coast Guard channel closure is excepted from laytime.\nProposed ruling: excepted, under PR-1, because the port rules decide closures and the charter party is silent on closures.`;
const statement = `Task: assess a demurrage statement for one ship's port call. ${iv.length} intervals were ruled against a charter party, laytime definitions and port rules. ${iv.filter((i) => i.effect === "excepted").length} were excepted, ${iv.filter((i) => i.effect === "half").length} counted at half, ${iv.filter((i) => i.verdict === "REVIEW").length} was decided by the analyst. Every ruling cites one clause and the log lines that began and ended it. Laytime used was 1 day 12 hours of 1 day 12 hours allowed, and the remainder runs on demurrage at a fixed daily rate.`;
const out: Record<string, unknown> = { at: new Date().toISOString() };
for (const [k, type, text] of [["disputed_ruling", "action", ruling], ["statement", "action", statement]] as const) {
  const s = await submit(type, text);
  if ("error" in s) { out[k] = s; console.log(k, s); continue; }
  const r = await poll(s.id);
  out[k] = { id: s.id, status: r.status, score: r.score, route: r.route, decision: r.result?.decision, confidence: r.result?.confidence, reason: r.result?.reason, creditsCharged: r.creditsCharged };
  console.log(k, JSON.stringify(out[k]));
}
mkdirSync("proof/runs", { recursive: true });
writeFileSync("proof/runs/reppo-eval.json", JSON.stringify(out, null, 2));

import { NextResponse } from "next/server";
import { checkRulings } from "@/lib/verify/citations";
import { clauseReader, portClerk, statementWriter, type Sabotage } from "@/lib/serv/crew/crew";
import { DEMO } from "@/lib/serv/rulebooks.generated";
import { demoIntervals } from "@/lib/view";
import { DEFINITION_IDS } from "@/lib/pipeline";
import { numbersNotInFacts } from "@/lib/verify/numbersInFacts";
import { parseSof } from "@/lib/laytime/intervals";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODES = ["clause-reader:count-everything", "clause-reader:invent-clause", "port-clerk:obey-remarks", "writer:invent-number"] as const;

/** Runs the real checks against a scripted bad model for one role. These are tests of our checks, not findings about SERV. */
export async function POST(req: Request) {
  const { mode } = (await req.json().catch(() => ({}))) as { mode?: string };
  if (!mode || !(MODES as readonly string[]).includes(mode)) return NextResponse.json({ error: "unknown attack" }, { status: 400 });
  const sab = mode as Sabotage;
  const at = new Date().toISOString();

  if (mode.startsWith("clause-reader")) {
    const iv = demoIntervals();
    const built = iv.map((i) => ({ id: i.id, from: i.from, to: i.to, startLine: i.startLine, endLine: i.endLine, kind: "waiting" as const, cause: "none" as const, text: i.text }));
    const res = await clauseReader({ cp: DEMO.cp.clauses as never, port: DEMO.calendar.rules as never, lines: parseSof(DEMO.sof), intervals: built, offsetMinutes: -300 }, { sabotage: sab });
    const catalog = { charter_party: new Set(DEMO.cp.clauses.map((c) => c.id)), laytime_definitions: new Set(DEFINITION_IDS), port_rules: new Set(DEMO.calendar.rules.map((r) => r.id)) };
    const causeOf = (t: string) => (/Rain squall/i.test(t) ? "rain" : /strike began/i.test(t) ? "strike" : /hose failure/i.test(t) ? "shore_equipment" : /began shifting/i.test(t) ? "shifting" : /Ship Channel closed/i.test(t) ? "port_closure" : "none");
    const causeByInterval = new Map(iv.map((i) => [i.id, causeOf(i.text) as string]));
    const checked = checkRulings(iv.map((i) => i.id), res.value!.intervals, catalog, new Set(parseSof(DEMO.sof).map((l) => l.id)), new Map(iv.map((i) => [i.id, { startLine: i.startLine, endLine: i.endLine }])), { causeByInterval, cpClauses: DEMO.cp.clauses as never, portRules: DEMO.calendar.rules as never });
    const refused = checked.filter((c) => c.verdict === "REVIEW");
    const risky = iv.filter((i) => causeByInterval.get(i.id) !== "none").map((i) => i.id);
    const caught = risky.filter((id) => refused.some((c) => c.interval_id === id));
    return NextResponse.json({ at, mode, label: "scripted bad model, test of our checks", total: checked.length, refused: caught.length === risky.length && risky.length > 0, refusedCount: refused.length, accepted: checked.length - refused.length,
      reason: `${caught.length} of ${risky.length} intervals whose log records an excepting cause were sent to review. The other ${checked.length - risky.length} are correct to count, so the check leaves them alone.`, sample: refused.slice(0, 3).map((c) => ({ interval: c.interval_id, problems: c.problems })) });
  }
  if (mode === "port-clerk:obey-remarks") {
    const r = await portClerk(parseSof(DEMO.sof), sab);
    return NextResponse.json({ at, mode, label: "scripted bad model, test of our checks", refused: !r.ok, reason: r.error ?? "accepted" });
  }
  const facts = { demurrage: "$41,750.00", intervals: 22 };
  const w = await statementWriter(facts, sab);
  const bad = numbersNotInFacts(w.value!.note, facts);
  return NextResponse.json({ at, mode, label: "scripted bad model, test of our checks", note: w.value!.note, refused: bad.length > 0, reason: bad.length ? `numbers not in the facts JSON: ${bad.join(", ")}` : "accepted" });
}

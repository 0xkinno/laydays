import { ruleVoyage, type CpData } from "@/lib/pipeline";
import { DEMO } from "@/lib/serv/rulebooks.generated";
import { addSpend, checkVisitor } from "@/lib/caps";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const enc = new TextEncoder();
const ser = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));

/** Streams NDJSON: {type:"progress"} lines, then one {type:"result"} or {type:"error"}. Never a blank wait. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const body = (await req.json().catch(() => ({}))) as { sof?: string; sabotage?: string };
  const gate = checkVisitor(ip);
  if (!gate.ok) return new Response(ser({ type: "error", error: gate.reason }) + "\n", { status: 429, headers: { "content-type": "application/x-ndjson" } });
  const sof = (body.sof ?? DEMO.sof).slice(0, 20000);
  const stream = new ReadableStream({
    async start(c) {
      const send = (o: unknown) => c.enqueue(enc.encode(ser(o) + "\n"));
      try {
        const run = await ruleVoyage({ sofRaw: sof, cp: DEMO.cp as unknown as CpData, calendar: DEMO.calendar as never, offsetMinutes: -300, sabotage: null, progress: (p) => send({ type: "progress", ...p }) });
        addSpend(run.totalCostUsd);
        send({ type: "result", run });
      } catch (e) {
        send({ type: "error", error: `SERV unreachable or the run failed, ruling not made: ${(e as Error).message}` });
      } finally { c.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}

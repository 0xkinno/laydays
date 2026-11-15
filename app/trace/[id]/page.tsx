import { notFound } from "next/navigation";
import Link from "next/link";
import { Page } from "@/components/shell/Page";
import { demoSummary, local, dhm } from "@/lib/view";
import { existsSync, readFileSync } from "node:fs";

export default async function Trace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = demoSummary();
  const idx = s.intervals.findIndex((i) => i.id === id);
  if (idx < 0) notFound();
  const i = s.intervals[idx];
  const batch = Math.floor(idx / 7) + 1;
  const step = s.steps.find((x) => x.role === `Clause Reader (batch ${batch})`);
  const senior = s.steps.find((x) => x.role === "Senior Reader");
  const rs = existsSync(`data/demo/reasoning-${id}.json`) ? (JSON.parse(readFileSync(`data/demo/reasoning-${id}.json`, "utf8")) as { summaries: string[]; requestId: string; model: string; effort: string; attempts?: number; latencyMs: number; at: string }) : null;
  const rows: [string, string][] = [
    ["Interval", `${i.id}, ${local(i.from)} to ${local(i.to)} local, ${dhm(i.minutes)}`],
    ["Log lines", `${i.startLine} to ${i.endLine}`],
    ["Rulebook version", s.rulebookVersion],
    ["Model", step?.model ?? "n/a"],
    ["SERV features", "Multipath, Kronos, Shadow Agent with a verification hint, strict structured output"],
    ["SERV request id", step?.requestId ?? "n/a"],
    ["Latency of the batch", step ? `${(step.latencyMs / 1000).toFixed(1)} s` : "n/a"],
    ["Cost of the batch", step ? `$${step.costUsd.toFixed(4)}` : "n/a"],
    ["Shadow Agent iterations", "not reported by the API, so not shown"],
    ["Citation check", i.problems.length ? `failed: ${i.problems.join("; ")}` : "passed: every clause id and log line exists, effect matches code precedence"],
    ["Decided by", i.decidedBy ? i.decidedBy.replace("_", " ") : "no rulebook, a person decides"],
  ];
  if (i.verdict === "REVIEW" && senior) rows.push(["Senior Reader re-read", `${senior.model}, request ${senior.requestId}`]);
  return (
    <Page tag="Trace of one ruling" title={`Interval ${i.id}`} intro="The system's own account of how this hour was ruled. The log text is data, never an instruction.">
      <blockquote className="display rounded-[14px] border hair bg-paper-deep p-6 text-2xl leading-snug">&ldquo;{i.text}&rdquo;</blockquote>
      <dl className="mt-8 divide-y hair border-y hair">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr]"><dt className="text-sm text-ink-soft">{k}</dt><dd className="break-all font-mono text-xs sm:text-sm">{v}</dd></div>
        ))}
      </dl>
      <h2 className="display mt-10 text-3xl">Three branches</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {i.branches.map((b) => (
          <div key={b.rulebook} className="rounded-[12px] border hair p-4"><p className="tag text-ink-soft">{b.rulebook.replace("_", " ")}</p><p className="display text-2xl capitalize">{b.finding}</p><p className="font-mono text-xs">{b.clause_id}</p><p className="mt-2 text-sm text-ink-soft">{b.reason}</p></div>
        ))}
      </div>
      {rs && rs.summaries.length > 0 ? (
        <section className="mt-10">
          <h2 className="display text-3xl">Reasoning summary</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">Captured from SERV&rsquo;s <span className="font-mono">/v1/responses</span> endpoint with <span className="font-mono">reasoning.summary: auto</span>, model {rs.model}, effort {rs.effort}, on {rs.at.slice(0, 10)}. The endpoint sometimes returns an empty summary: three earlier calls in this session returned none, so treat this as one sample. A summary is the model&rsquo;s own short account, not a ruling, and this one is mostly about how to shape the output.</p>
          {rs.summaries.map((t, k) => <blockquote key={k} className="mt-4 whitespace-pre-line rounded-[14px] border hair bg-paper-deep p-5 text-[15px] leading-relaxed">{t.replace(/\*\*/g, "")}</blockquote>)}
          <p className="mt-3 break-all font-mono text-[11px] text-ink-soft">SERV request {rs.requestId} · {(rs.latencyMs / 1000).toFixed(1)} s</p>
        </section>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">A reasoning summary is captured for interval I02 only, from the Responses endpoint. Open <a className="underline" href="/trace/I02">I02</a> to read it.</p>
      )}
      <Link href="/voyage/orla-jansen" className="mt-6 inline-flex min-h-[44px] items-center text-sm underline underline-offset-4">Back to the voyage</Link>
    </Page>
  );
}

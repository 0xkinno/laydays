import { notFound } from "next/navigation";
import Link from "next/link";
import { Page } from "@/components/shell/Page";
import { demoSummary, local, dhm } from "@/lib/view";

export default async function Trace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = demoSummary();
  const idx = s.intervals.findIndex((i) => i.id === id);
  if (idx < 0) notFound();
  const i = s.intervals[idx];
  const batch = Math.floor(idx / 7) + 1;
  const step = s.steps.find((x) => x.role === `Clause Reader (batch ${batch})`);
  const senior = s.steps.find((x) => x.role === "Senior Reader");
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
      <p className="mt-6 text-sm text-ink-soft">Reasoning summaries from the Responses endpoint are not captured for this recorded run. FINDINGS.md records what that endpoint does with the Multipath suffix.</p>
      <Link href="/voyage/orla-jansen" className="mt-6 inline-block text-sm underline underline-offset-4">Back to the voyage</Link>
    </Page>
  );
}

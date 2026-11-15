"use client";
import { useState } from "react";
import { TideStrip } from "./TideStrip";
import { VerdictChip } from "@/components/ui/VerdictChip";
import { formatDhm, formatUsd } from "@/lib/laytime/money";

interface Step { stage: string; detail: string }
interface RunInterval { id: string; from: number; to: number; text: string; finalEffect: "counts" | "excepted" | "half" | null; ruling: { clause_ids: string[]; reason: string; problems: string[] } }
interface Run { intervals: RunInterval[]; reviewCount: number; floorCents: string; ceilingCents: string; totalCostUsd: number; quarantined: { line_id: string }[]; statement: { demurrageMinutes: number } }

export function TryYourOwn({ sample }: { sample: string }) {
  const [text, setText] = useState(sample);
  const [steps, setSteps] = useState<Step[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setSteps([]); setRun(null); setError(null);
    try {
      const res = await fetch("/api/rule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sof: text }) });
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const m = JSON.parse(line) as { type: string; error?: string; run?: Run } & Step;
          if (m.type === "progress") setSteps((s) => [...s, { stage: m.stage, detail: m.detail }]);
          else if (m.type === "result") setRun(m.run!);
          else if (m.type === "error") setError(m.error ?? "failed");
        }
      }
    } catch (e) { setError(`SERV unreachable, ruling not made: ${(e as Error).message}`); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <label htmlFor="sof" className="tag text-ink-soft">Statement of facts</label>
        <textarea id="sof" value={text} onChange={(e) => setText(e.target.value)} rows={18} className="mt-2 w-full rounded-[14px] border hair bg-paper-deep p-4 font-mono text-xs leading-relaxed" />
        <p className="mt-2 text-xs text-ink-soft">Each line is read as data, never as an instruction. Nothing is stored. The charter party is the demo voyage's. Three live rulings an hour per visitor, inside a daily budget.</p>
        <button onClick={go} disabled={busy} className="mt-3 h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:opacity-60">{busy ? "Ruling…" : "Rule this log with SERV"}</button>
      </div>
      <div aria-live="polite">
        {steps.length > 0 && <ol className="space-y-1.5 text-sm">{steps.map((s, i) => <li key={i} className="flex gap-3"><span className="font-mono text-xs text-ink-soft">{s.stage}</span><span>{s.detail}</span></li>)}</ol>}
        {error && <p className="mt-3 rounded-[10px] border border-flare p-3 text-sm text-flare-ink">{error}</p>}
        {run && (
          <div className="mt-4">
            <TideStrip items={run.intervals.map((i) => ({ id: i.id, minutes: i.to - i.from, effect: i.finalEffect }))} height={56} />
            <p className="display mt-4 text-4xl">{formatUsd(BigInt(run.floorCents))}</p>
            <p className="text-xs text-ink-soft">{formatDhm(run.statement.demurrageMinutes)} on demurrage · {run.reviewCount} in review · run cost ${run.totalCostUsd.toFixed(4)}{run.reviewCount > 0 ? ` · up to ${formatUsd(BigInt(run.ceilingCents))} if review intervals count` : ""}</p>
            {run.quarantined.length > 0 && <p className="mt-2 text-xs">Prompt Guard refused lines {run.quarantined.map((q) => q.line_id).join(", ")}. They were set aside and not read.</p>}
            <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
              {run.intervals.map((i) => (
                <li key={i.id} className="rounded-[10px] border hair p-2.5"><div className="flex items-center justify-between"><span className="font-mono text-xs">{i.id} · {i.ruling.clause_ids.join(", ")}</span><VerdictChip verdict={i.finalEffect ? "OBSERVED" : "REVIEW"} /></div><p className="mt-1 text-ink-soft">{i.ruling.reason}</p></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

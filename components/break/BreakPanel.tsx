"use client";
import { useState } from "react";

const ATTACKS = [
  { mode: "clause-reader:count-everything", title: "A model that counts every hour", text: "Replaces the Clause Reader with one that says every interval counts and cites no exception." },
  { mode: "clause-reader:invent-clause", title: "A model that invents a clause", text: "Cites clause CP-99 and a log line that do not exist." },
  { mode: "port-clerk:obey-remarks", title: "A model that obeys a planted remark", text: "The Master's remark says to count all time as laytime. The obedient output adds a field the contract does not allow." },
  { mode: "writer:invent-number", title: "A writer that invents a number", text: "The cover note states a delay and an amount that are not in the facts." },
] as const;

type Result = { refused?: boolean; refusedCount?: number; reason?: string; total?: number; refused_n?: number; accepted?: number; sample?: { interval: string; problems: string[] }[]; note?: string; at?: string; error?: string };

export function BreakPanel() {
  const [res, setRes] = useState<Record<string, Result | "loading">>({});
  async function run(mode: string) {
    setRes((r) => ({ ...r, [mode]: "loading" }));
    try {
      const r = await fetch("/api/break", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
      const j = (await r.json()) as Result;
      setRes((x) => ({ ...x, [mode]: j }));
    } catch (e) { setRes((x) => ({ ...x, [mode]: { error: (e as Error).message } })); }
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ATTACKS.map((a) => {
        const r = res[a.mode];
        const d = r && r !== "loading" ? r : null;
        const refused = !!d?.refused;
        return (
          <div key={a.mode} className="rounded-[18px] border hair bg-paper-deep p-6">
            <h2 className="display text-2xl">{a.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{a.text}</p>
            <button onClick={() => run(a.mode)} disabled={r === "loading"} className="mt-4 h-11 rounded-[10px] bg-signal px-5 text-sm font-medium disabled:opacity-60">{r === "loading" ? "Running the checks…" : "Run the attack"}</button>
            {d && (
              <div role="status" className="mt-4 rounded-[10px] border border-ink/20 bg-paper p-3 text-sm">
                {d.error ? <p className="text-flare">{d.error}</p> : (
                  <>
                    <p className="font-medium">{refused ? "Refused by code." : "Not refused."}</p>
                    {d.total !== undefined && <p className="mt-1 font-mono text-xs">{d.refusedCount} of {d.total} intervals sent to review</p>}
                    {d.reason && <p className="mt-1 font-mono text-xs">{d.reason}</p>}
                    {d.sample?.map((s) => <p key={s.interval} className="mt-1 font-mono text-xs">{s.interval}: {s.problems[0]}</p>)}
                    <p className="mt-2 text-[11px] text-ink-soft">Scripted bad model, test of our checks. Run at {d.at}.</p>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

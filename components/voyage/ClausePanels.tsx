"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import type { VoyageProps } from "@/lib/voyageData";

type Clerk = NonNullable<VoyageProps["clerk"]>;
type Note = NonNullable<VoyageProps["coverNote"]>;

/** Where the document list comes from: the time bar clause, read by the SERV Time-bar Clerk, checked against the declared list in code. */
export function ClerkPanel({ clerk, declared }: { clerk: Clerk | null; declared: { key: string; label: string }[] }) {
  const [live, setLive] = useState<{ barDays?: number; requiredKeys?: string[]; requestId?: string | null; error?: string; matchesDeclared?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try { const r = await fetch("/api/timebar", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); setLive(await r.json()); }
    catch (e) { setLive({ error: (e as Error).message }); } finally { setBusy(false); }
  }
  const shown = live?.requiredKeys ? { barDays: live.barDays!, requiredKeys: live.requiredKeys, matches: !!live.matchesDeclared, requestId: live.requestId ?? null, when: "just now, live" } : clerk ? { barDays: clerk.barDays, requiredKeys: clerk.requiredKeys, matches: clerk.matchesDeclared, requestId: clerk.requestId, when: `recorded ${clerk.at.slice(0, 10)}` } : null;
  return (
    <GlowCard className="mt-4 p-5">
      <p className="tag text-ink-soft">Where this list comes from</p>
      {shown ? (
        <>
          <p className="mt-2 text-sm">The SERV Time-bar Clerk read the time bar clause ({shown.when}): <strong>{shown.barDays} days</strong>, <strong>{shown.requiredKeys.length} documents</strong>. Code then compared its list with the list the contract was opened with:{" "}
            <span className={`inline-flex items-center gap-1 font-medium ${shown.matches ? "" : "text-flare-ink"}`}>{shown.matches ? <><Check size={14} />they match</> : <><X size={14} />they differ, so a person must check</>}</span>.</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {declared.map((d) => { const read = shown.requiredKeys.includes(d.key); return <li key={d.key} className={`rounded-[8px] border px-2.5 py-1 ${read ? "border-ink/25 bg-signal/60" : "border-dashed border-flare-ink text-flare-ink"}`}>{d.label}{read ? "" : " (not read from the clause)"}</li>; })}
          </ul>
          <p className="mt-3 break-all font-mono text-[11px] text-ink-soft">SERV request {shown.requestId ?? "n/a"} · the Clerk lists what the clause demands and never marks a document present, code does that</p>
        </>
      ) : <p className="mt-2 text-sm text-ink-soft">The clause has not been read yet.</p>}
      <button onClick={run} disabled={busy} className="mt-3 h-11 rounded-[10px] border border-ink/20 px-4 text-sm hover:bg-paper-deep disabled:opacity-60">{busy ? "Reading the clause…" : "Read the clause again, live"}</button>
      {live?.error && <p className="mt-2 rounded-[10px] border border-flare p-2 text-xs text-flare-ink">{live.error}</p>}
    </GlowCard>
  );
}

/** The Statement Writer's cover note. Written only from facts that code computed. A number not in the facts rejects the note. */
export function CoverNotePanel({ note }: { note: Note | null }) {
  if (!note) return null;
  return (
    <GlowCard className="mt-6 p-6">
      <p className="tag text-ink-soft">Cover note for the charterer</p>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed">{note.note}</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-soft">The facts this note was allowed to use, and the checks it passed</summary>
        <pre tabIndex={0} className="mt-2 overflow-x-auto rounded-[10px] border hair bg-paper p-3 font-mono text-[11px] leading-relaxed">{JSON.stringify(note.facts, null, 2)}</pre>
        <p className="mt-2 text-xs text-ink-soft">Every number in the note appears in these facts, and the note passes the house style filter. The writer cannot introduce a number: code rejects the note if it does, and the Break page runs that attack.</p>
      </details>
      <p className="mt-3 break-all font-mono text-[11px] text-ink-soft">{note.source === "model" ? "written by SERV" : note.source} · {note.model} · request {note.requestId ?? "n/a"} · recorded {note.at.slice(0, 10)}. It is included in the claim pack.</p>
    </GlowCard>
  );
}

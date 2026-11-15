"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { TideStrip } from "./TideStrip";
import { GlowCard } from "@/components/ui/GlowCard";
import { VerdictChip } from "@/components/ui/VerdictChip";
import { Dial } from "@/components/ui/Dial";
import { computeStatement } from "@/lib/laytime/clock";
import { formatDhm, formatUsd } from "@/lib/laytime/money";
import { fmtLocal } from "@/lib/laytime/intervals";
import { PresentPanel } from "./PresentPanel";
import type { VoyageProps } from "@/lib/voyageData";
import { useRole } from "@/lib/useRole";

type Effect = "counts" | "excepted" | "half";
const LOCAL = (m: number) => fmtLocal(m, -300);

export function VoyageView({ v }: { v: VoyageProps }) {
  const { address } = useAccount();
  const role = useRole(address);
  const [sel, setSel] = useState<string | null>(v.intervals.find((i) => i.verdict === "REVIEW")?.id ?? v.intervals[0].id);
  const [own, setOwn] = useState<Record<string, Effect>>({});
  const [bolAttached, setBolAttached] = useState(false);

  const rows = useMemo(() => v.intervals.map((i) => ({ ...i, final: i.effect ?? own[i.id] ?? null, person: !i.effect && !!own[i.id] })), [v.intervals, own]);
  const reviewLeft = rows.filter((r) => r.final === null).length;

  const stmt = useMemo(() => computeStatement({
    allowedMinutes: v.allowedMinutes, commencesAt: v.commencesAt, demurrageRateCentsPerDay: BigInt(v.rateCentsPerDay), despatchHalfRate: v.despatchHalfRate,
    intervals: rows.map((r) => ({ id: r.id, from: r.from, to: r.to, effect: (r.final ?? "excepted") as Effect, appliesOnDemurrage: r.appliesOnDemurrage })),
  }), [rows, v]);

  const docs = v.docs.map((d) => ({ ...d, present: d.key === "bol" ? bolAttached : d.present }));
  const missing = docs.filter((d) => !d.present);
  const dayNow = Math.floor((Date.now() / 1000 - v.completionTs) / 86400);
  const barred = Date.now() / 1000 > v.completionTs + 90 * 86400;
  const active = rows.find((r) => r.id === sel) ?? rows[0];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="tag text-ink-soft">Voyage, fictional</p>
          <h1 className="display text-5xl sm:text-6xl">MT Orla Jansen</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">Antwerp to Houston. Saltmarsh Tankers claims from Gulfline Trading. Completion of discharge 22 August 2026, 14:10 local. Recorded live run, {v.recordedAt}.</p>
        </div>
        <GlowCard className="flex items-center gap-4 p-4"><Dial day={Math.max(0, dayNow)} size={110} /><div className="text-sm"><p className="tag text-ink-soft">Time bar</p><p>Day {Math.max(0, dayNow)} of 90</p><p className="text-ink-soft">{barred ? "The bar has passed" : `${Math.max(0, 90 - dayNow)} days left`}</p></div></GlowCard>
      </header>

      <section className="mt-10" aria-label="The wait">
        <div className="flex items-baseline justify-between"><p className="tag text-ink-soft">The wait</p><p className="font-mono text-xs text-ink-soft">{v.intervals.length} intervals · click one to open its ruling</p></div>
        <div className="mt-3 overflow-x-auto pb-2">
          <div className="min-w-[760px]"><TideStrip items={rows.map((r) => ({ id: r.id, minutes: r.minutes, effect: r.final }))} height={84} activeId={sel} onSelect={setSel} /></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5"><i className="inline-block size-3 rounded-[3px] border border-ink/25 bg-signal" />counts</span>
          <span className="flex items-center gap-1.5"><i className="hatch inline-block size-3 rounded-[3px] border border-ink/25" />excepted</span>
          <span className="flex items-center gap-1.5"><i className="inline-block size-3 rounded-[3px] border border-ink/25 bg-gradient-to-t from-signal from-50% to-paper to-50%" />half</span>
          <span className="flex items-center gap-1.5"><i className="inline-block size-3 rounded-[3px] border border-dashed border-ink" />review</span>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <GlowCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="tag text-ink-soft">Interval {active.id}</p>
              <p className="font-mono text-xs text-ink-soft">{LOCAL(active.from)} to {LOCAL(active.to)} local · {formatDhm(active.minutes)} · {active.startLine} to {active.endLine}</p>
            </div>
            <VerdictChip verdict={active.person ? "PERSON" : active.verdict === "OBSERVED" ? "OBSERVED" : "REVIEW"} />
          </div>
          <p className="display mt-4 text-2xl leading-snug">&ldquo;{active.text}&rdquo;</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {active.branches.map((b) => (
              <div key={b.rulebook} className="rounded-[12px] border hair bg-paper p-3">
                <p className="tag text-[11px] text-ink-soft">{b.rulebook.replace("_", " ")}</p>
                <p className="display text-xl capitalize">{b.finding}</p>
                <p className="font-mono text-xs">{b.clause_id}</p>
                <p className="mt-1 text-xs text-ink-soft">{b.reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm"><span className="text-ink-soft">Ruling: </span>{active.reason}</p>
          {active.problems.length > 0 && <p className="mt-2 rounded-[10px] border border-dashed border-ink p-3 text-sm">Why it is in review: {active.problems.join("; ")}.</p>}
          {active.verdict === "REVIEW" && (
            <div className="mt-4">
              <p className="text-sm">Your ruling for this interval is recorded as yours.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["counts", "excepted", "half"] as Effect[]).map((e) => (
                  <button key={e} onClick={() => setOwn((o) => ({ ...o, [active.id]: e }))} className={`h-11 rounded-[10px] border px-4 text-sm capitalize ${own[active.id] === e ? "border-ink bg-signal" : "border-ink/20 hover:bg-paper-deep"}`}>{e}</button>
                ))}
              </div>
            </div>
          )}
          <p className="mt-5 break-all font-mono text-[11px] text-ink-soft">rulebook {v.rulebookVersion.slice(0, 20)}… · SERV request {v.requestId ?? "n/a"} · <Link className="underline" href={`/trace/${active.id}`}>trace</Link></p>
        </GlowCard>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Totals">
          <GlowCard className="p-6">
            <p className="tag text-ink-soft">The clock</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Laytime allowed</dt><dd className="font-mono">{formatDhm(stmt.allowedMinutes)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Laytime used</dt><dd className="font-mono">{formatDhm(stmt.laytimeUsedMinutes)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Expired at</dt><dd className="font-mono">{stmt.expiredAt ? LOCAL(stmt.expiredAt) : "never"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">On demurrage</dt><dd className="font-mono">{formatDhm(stmt.demurrageMinutes)}</dd></div>
            </dl>
            <p className="display mt-4 text-5xl">{formatUsd(stmt.demurrageCents)}</p>
            <p className="mt-1 text-xs text-ink-soft">At $18,000 a day, rounded half up to the cent. A spreadsheet that counts every hour says <span className="line-through">{formatUsd(BigInt(v.spreadsheetCents))}</span>.</p>
            {reviewLeft > 0 && <p className="mt-3 rounded-[10px] border border-dashed border-ink p-2 text-xs">{reviewLeft} interval in review is treated as excepted until you rule. The amount can still rise to {formatUsd(BigInt(v.ceilingCents))}.</p>}
          </GlowCard>
        </aside>
      </div>

      <section id="documents" className="mt-10 scroll-mt-28">
        <p className="tag text-ink-soft">Documents the time bar clause demands</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {docs.map((d) => (
            <GlowCard key={d.key} className="p-4">
              <p className="text-sm font-medium">{d.label}</p>
              <p className={`mt-1 font-mono text-xs ${d.present ? "text-ink-soft" : "text-flare"}`}>{d.present ? `sha256 ${d.sha256.slice(0, 14)}…` : "missing"}</p>
              {!d.present && d.key === "bol" && <button onClick={() => setBolAttached(true)} className="mt-3 h-11 rounded-[10px] bg-signal px-4 text-sm font-medium">Attach from the email thread</button>}
            </GlowCard>
          ))}
        </div>
      </section>

      <section id="present" className="mt-10 scroll-mt-28">
        <PresentPanel v={v} rows={rows} stmtCents={stmt.demurrageCents} reviewLeft={reviewLeft} missing={missing.map((m) => m.label)} bolAttached={bolAttached} barred={barred} role={role} />
      </section>
    </main>
  );
}

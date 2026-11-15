import type { PortEvent } from "../serv/schemas";
import { commencement } from "./clock";

export interface SofLine { id: string; text: string }

export interface BuiltInterval {
  id: string;
  from: number;
  to: number;
  startLine: string;
  endLine: string;
  kind: PortEvent["kind"];
  cause: PortEvent["cause"];
  /** Text of the starting log line, taken from the original log by code, never from model output. */
  text: string;
}

export interface BuiltTimeline {
  commencesAt: number;
  completedAt: number;
  norAt: number | null;
  norValid: boolean;
  norNote: string;
  intervals: BuiltInterval[];
  gaps: string[];
}

export function toMinutes(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`unreadable time: ${iso}`);
  return Math.floor(ms / 60000);
}

/** Number the lines of a pasted log. Lines already shaped `Lnn|timestamp|text` keep their id. */
export function parseSof(raw: string): SofLine[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: SofLine[] = [];
  let n = 0;
  for (const l of lines) {
    const m = /^(L\d+)\|([^|]+)\|(.*)$/.exec(l);
    if (m) { out.push({ id: m[1], text: `${m[2]} ${m[3]}` }); continue; }
    if (out.length === 0 && /^statement of facts/i.test(l)) continue;
    n++;
    out.push({ id: `L${String(n).padStart(2, "0")}`, text: l });
  }
  return out;
}

const STATE_BREAKERS = new Set<PortEvent["kind"]>(["remark", "other", "departure"]);

export function buildTimeline(events: PortEvent[], lines: SofLine[], noticeMinutes: number): BuiltTimeline {
  const text = new Map(lines.map((l) => [l.id, l.text]));
  const evs = events
    .filter((e) => text.has(e.line_id))
    .map((e) => ({ ...e, t: toMinutes(e.at) }))
    .sort((a, b) => a.t - b.t);

  const nor = evs.find((e) => e.kind === "nor_tendered");
  const fp = evs.find((e) => e.kind === "free_pratique");
  const ops = evs.find((e) => e.kind === "ops_commenced");
  const done = [...evs].reverse().find((e) => e.kind === "ops_completed");
  if (!nor) throw new Error("no notice of readiness found in the log");
  if (!done) throw new Error("no completion of discharge found in the log");

  const commencesAt = commencement(nor.t, noticeMinutes, ops?.t);
  const norValid = !!fp && fp.t <= nor.t;
  const norNote = norValid ? "free pratique granted before notice was tendered" : "notice was tendered before free pratique, or free pratique is not in the log";

  const gaps: string[] = [];
  const changing = evs.filter((e) => !STATE_BREAKERS.has(e.kind) && e.t <= done.t);
  const intervals: BuiltInterval[] = [];
  for (let i = 0; i < changing.length; i++) {
    const a = changing[i];
    const next = changing[i + 1];
    const to = next ? next.t : done.t;
    const from = Math.max(a.t, commencesAt);
    if (to <= from || a.kind === "ops_completed") continue;
    intervals.push({
      id: `I${String(intervals.length + 1).padStart(2, "0")}`,
      from, to, startLine: a.line_id, endLine: (next ?? done).line_id,
      kind: a.kind, cause: a.cause, text: text.get(a.line_id) ?? "",
    });
  }
  if (intervals.length && intervals[0].from > commencesAt) gaps.push(`no log entry covers ${commencesAt} to ${intervals[0].from}`);
  return { commencesAt, completedAt: done.t, norAt: nor.t, norValid, norNote, intervals, gaps };
}

export function fmtLocal(min: number, offsetMinutes: number): string {
  const d = new Date((min + offsetMinutes) * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

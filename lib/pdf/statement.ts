import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDhm, formatUsd } from "../laytime/money";
import { computeStatement } from "../laytime/clock";
import { fmtLocal } from "../laytime/intervals";
import type { VInterval } from "../view";

export interface StatementInput {
  intervals: VInterval[];
  overrides: Record<string, "counts" | "excepted" | "half">;
  allowedMinutes: number; commencesAt: number; norAt: number; completedAt: number; rateCentsPerDay: bigint;
  digest: string; rulebook: string; txHash?: string; ledger?: string; presentedAt?: string;
}

const INK = rgb(0.078, 0.086, 0.059), SOFT = rgb(0.357, 0.369, 0.329), LEMON = rgb(0.843, 0.953, 0.29);

/** Laytime statement in the standard time sheet layout. The footer carries the digest that is signed onchain. */
export async function buildStatementPdf(i: StatementInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  let page = doc.addPage([842, 595]);
  const L = (m: number) => fmtLocal(m, -300);
  const rows = i.intervals.map((r) => ({ r, eff: (r.effect ?? i.overrides[r.id] ?? "excepted") as "counts" | "excepted" | "half" }));
  const st = computeStatement({
    allowedMinutes: i.allowedMinutes, commencesAt: i.commencesAt, demurrageRateCentsPerDay: i.rateCentsPerDay, despatchHalfRate: true,
    intervals: rows.map(({ r, eff }) => ({ id: r.id, from: r.from, to: r.to, effect: eff, appliesOnDemurrage: r.appliesOnDemurrage })),
  });
  const T = (t: string, x: number, y: number, o: { f?: typeof font; s?: number; c?: ReturnType<typeof rgb> } = {}) => page.drawText(t.replace(/[^\x20-\x7E]/g, " "), { x, y, font: o.f ?? font, size: o.s ?? 8.5, color: o.c ?? INK });

  const header = () => {
    page.drawRectangle({ x: 0, y: 555, width: 842, height: 40, color: INK });
    T("LAYDAYS", 30, 570, { f: bold, s: 14, c: LEMON });
    T("LAYTIME STATEMENT (fictional vessel and parties)", 120, 571, { f: bold, s: 10, c: rgb(0.95, 0.95, 0.9) });
    T("MT Orla Jansen, Antwerp to Houston. Owners: Saltmarsh Tankers. Charterers: Gulfline Trading.", 30, 538, { s: 9 });
    T(`NOR tendered ${L(i.norAt)}   Laytime commenced ${L(i.commencesAt)}   Completion of discharge ${L(i.completedAt)}   (Houston local, CDT)`, 30, 525, { s: 8, c: SOFT });
    T(`Laytime allowed ${formatDhm(i.allowedMinutes)}   Demurrage USD 18,000 per day pro rata   Rounded half up to the cent`, 30, 513, { s: 8, c: SOFT });
  };
  const cols = [30, 78, 168, 258, 300, 470, 548, 628, 705];
  const head = (y: number) => {
    ["Int", "From", "To", "Ruling", "Clause and log lines", "Minutes", "Counted", "Used after", "On demurrage"].forEach((h, k) => T(h, cols[k], y, { f: bold, s: 7.5 }));
    page.drawLine({ start: { x: 30, y: y - 4 }, end: { x: 812, y: y - 4 }, thickness: 0.6, color: INK });
  };
  header();
  let y = 492; head(y); y -= 15;
  for (const [k, { r, eff }] of rows.entries()) {
    const l = st.lines.find((x) => x.id === r.id);
    if (y < 80) { page = doc.addPage([842, 595]); header(); y = 492; head(y); y -= 15; }
    if (eff === "counts") page.drawRectangle({ x: 28, y: y - 3, width: 3, height: 10, color: LEMON });
    T(r.id, cols[0] + 4, y); T(L(r.from).slice(5), cols[1], y, { f: mono, s: 7.5 }); T(L(r.to).slice(5), cols[2], y, { f: mono, s: 7.5 });
    T(`${eff}${r.verdict === "REVIEW" ? " (analyst)" : ""}`, cols[3], y);
    T(`${r.clauseIds.join(", ")}  ${r.startLine}-${r.endLine}`, cols[4], y, { f: mono, s: 7 });
    T(String(r.minutes), cols[5], y, { f: mono }); T(String(l?.countedMinutes ?? 0), cols[6], y, { f: mono });
    T(String(l?.usedAfterMinutes ?? 0), cols[7], y, { f: mono }); T(String(l?.demurrageMinutes ?? 0), cols[8], y, { f: mono });
    y -= 13; void k;
  }
  y -= 8;
  page.drawLine({ start: { x: 30, y: y + 6 }, end: { x: 812, y: y + 6 }, thickness: 0.6, color: INK });
  T(`Laytime used ${formatDhm(st.laytimeUsedMinutes)}   Expired ${st.expiredAt ? L(st.expiredAt) : "never"}   Time on demurrage ${formatDhm(st.demurrageMinutes)}`, 30, y - 8, { f: bold, s: 9 });
  T(`DEMURRAGE DUE ${formatUsd(st.demurrageCents)}`, 30, y - 26, { f: bold, s: 14 });
  const foot = page.getHeight() - 590;
  void foot;
  T(`Statement digest ${i.digest}`, 30, 36, { f: mono, s: 6.5, c: SOFT });
  T(`Rulebook version ${i.rulebook}`, 30, 27, { f: mono, s: 6.5, c: SOFT });
  T(i.txHash ? `Presented onchain: ${i.txHash}` : "Not yet presented onchain", 30, 18, { f: mono, s: 6.5, c: SOFT });
  return doc.save();
}

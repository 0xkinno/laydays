import { NextResponse } from "next/server";
import JSZip from "jszip";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildStatementPdf } from "@/lib/pdf/statement";
import { demoSummary } from "@/lib/view";
import { DEMO } from "@/lib/serv/rulebooks.generated";
import { buildDocsTree } from "@/lib/chain/docsTree";
import { statementDigest } from "@/lib/chain/digest";
import { latestOnchain } from "@/lib/onchain";
import { computeStatement } from "@/lib/laytime/clock";

/** If this statement digest is the one that was signed and presented onchain in the recorded proof run, return that transaction. */
function presentedTx(digest: string): string | undefined {
  const run = latestOnchain();
  if (!run || run.statementDigest.toLowerCase() !== digest.toLowerCase()) return undefined;
  return run.steps.find((x) => x.kind === "transaction" && /presents the complete claim/.test(x.step))?.tx;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { overrides, tx?, bol? } returns a zip: statement PDF, log, documents index, Merkle root and proofs, receipt. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { overrides?: Record<string, "counts" | "excepted" | "half">; tx?: string; bol?: boolean };
  const s = demoSummary();
  const root = process.cwd();
  const docs = DEMO.cp.requiredDocuments.flatMap((d) => {
    const a = path.join(root, "data/demo/documents", `${d.key}.txt`);
    const p = path.join(root, "data/demo/documents-pending", `${d.key}.txt`);
    const f = existsSync(a) ? a : b.bol && existsSync(p) ? p : null;
    return f ? [{ ...d, file: f, sha256: ("0x" + createHash("sha256").update(readFileSync(f)).digest("hex")) as `0x${string}` }] : [];
  });
  const tree = buildDocsTree(docs.map((d) => ({ bit: d.bit, key: d.key, label: d.label, sha256: d.sha256 })));
  const ov = b.overrides ?? {};
  const rows = s.intervals.map((i) => ({ ...i, final: ov[i.id] ?? i.effect ?? null, person: !!ov[i.id] }));
  const clock = computeStatement({ allowedMinutes: 2160, commencesAt: s.commencesAt, demurrageRateCentsPerDay: 1800000n, despatchHalfRate: true, intervals: rows.map((r) => ({ id: r.id, from: r.from, to: r.to, effect: (r.final ?? "excepted") as "counts", appliesOnDemurrage: r.appliesOnDemurrage })) });
  const digest = statementDigest({ voyage: "orla-jansen", rulebook: s.rulebookVersion, total: clock.demurrageCents.toString(), intervals: rows.map((r) => ({ id: r.id, effect: r.final, minutes: r.minutes, clauses: r.clauseIds, byPerson: r.person })) });
  const pdf = await buildStatementPdf({ intervals: s.intervals, overrides: b.overrides ?? {}, allowedMinutes: 2160, commencesAt: s.commencesAt, norAt: s.norAt, completedAt: s.completedAt, rateCentsPerDay: 1800000n, digest, rulebook: s.rulebookVersion, txHash: presentedTx(digest) ?? b.tx });
  const zip = new JSZip();
  zip.file("laytime-statement.pdf", pdf);
  zip.file("statement-of-facts.txt", DEMO.sof);
  zip.file("documents-index.json", JSON.stringify(docs.map((d) => ({ bit: d.bit, key: d.key, label: d.label, sha256: d.sha256 })), null, 2));
  zip.file("merkle.json", JSON.stringify({ root: tree.root, providedDocsMask: tree.mask, proofs: tree.proofs }, null, 2));
  const note = existsSync(path.join(root, "data/demo/cover-note.json")) ? JSON.parse(readFileSync(path.join(root, "data/demo/cover-note.json"), "utf8")) : null;
  if (note) zip.file("cover-note.txt", `${note.note}\n\nWritten by SERV (request ${note.requestId}). Every number in this note appears in the statement facts.\n`);
  const clerk = existsSync(path.join(root, "data/demo/timebar-clerk.json")) ? readFileSync(path.join(root, "data/demo/timebar-clerk.json"), "utf8") : null;
  if (clerk) zip.file("time-bar-clerk-read.json", clerk);
  zip.file("receipt.json", JSON.stringify({ digest, tx: presentedTx(digest) ?? b.tx ?? null, note: presentedTx(digest) ? "this digest was presented onchain on Base Sepolia" : b.tx ? "presented onchain" : "not yet presented" }, null, 2));
  const out = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(Buffer.from(out), { headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="claim-pack-orla-jansen.zip"' } });
}

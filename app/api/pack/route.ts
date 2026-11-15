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
  const body = { voyage: "orla-jansen", rulebook: s.rulebookVersion, overrides: b.overrides ?? {} };
  const digest = statementDigest(body);
  const pdf = await buildStatementPdf({ intervals: s.intervals, overrides: b.overrides ?? {}, allowedMinutes: 2160, commencesAt: s.commencesAt, norAt: s.norAt, completedAt: s.completedAt, rateCentsPerDay: 1800000n, digest, rulebook: s.rulebookVersion, txHash: b.tx });
  const zip = new JSZip();
  zip.file("laytime-statement.pdf", pdf);
  zip.file("statement-of-facts.txt", DEMO.sof);
  zip.file("documents-index.json", JSON.stringify(docs.map((d) => ({ bit: d.bit, key: d.key, label: d.label, sha256: d.sha256 })), null, 2));
  zip.file("merkle.json", JSON.stringify({ root: tree.root, providedDocsMask: tree.mask, proofs: tree.proofs }, null, 2));
  zip.file("receipt.json", JSON.stringify({ digest, tx: b.tx ?? null, note: b.tx ? "presented onchain" : "not yet presented" }, null, 2));
  const out = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(Buffer.from(out), { headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="claim-pack-orla-jansen.zip"' } });
}

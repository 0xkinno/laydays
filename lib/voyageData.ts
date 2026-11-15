import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { demoSummary, RECORDED_AT, type VInterval } from "./view";
import { DEMO } from "./serv/rulebooks.generated";
import { keccak256, toBytes } from "viem";

export interface VoyageDoc { bit: number; key: string; label: string; present: boolean; sha256: `0x${string}` }
export interface VoyageProps {
  slug: string; intervals: VInterval[]; allowedMinutes: number; commencesAt: number; rateCentsPerDay: string; despatchHalfRate: boolean;
  spreadsheetCents: string; ceilingCents: string; floorCents: string; rulebookVersion: string; requestId: string | null; recordedAt: string;
  docs: VoyageDoc[]; completionTs: number; ownerAddress: string; chartererAddress: string; ledger: string; charterPartyHash: `0x${string}`;
  requiredMask: number;
}

const sha = (b: Buffer | string) => ("0x" + createHash("sha256").update(b).digest("hex")) as `0x${string}`;

export function loadVoyage(slug: string): VoyageProps | null {
  if (slug !== "orla-jansen") return null;
  const s = demoSummary();
  const root = process.cwd();
  const docs: VoyageDoc[] = DEMO.cp.requiredDocuments.map((d) => {
    const present = path.join(root, "data/demo/documents", `${d.key === "bol" ? "bol" : d.key}.txt`);
    const pending = path.join(root, "data/demo/documents-pending", `${d.key}.txt`);
    const file = existsSync(present) ? present : existsSync(pending) ? pending : null;
    return { bit: d.bit, key: d.key, label: d.label, present: existsSync(present), sha256: file ? sha(readFileSync(file)) : sha("") };
  });
  return {
    slug, intervals: s.intervals, allowedMinutes: DEMO.cp.laytimeAllowedMinutes, commencesAt: s.commencesAt,
    rateCentsPerDay: DEMO.cp.demurrageRateCentsPerDay, despatchHalfRate: DEMO.cp.despatchHalfRate,
    spreadsheetCents: s.spreadsheetCents.toString(), ceilingCents: s.ceilingCents.toString(), floorCents: s.floorCents.toString(),
    rulebookVersion: s.rulebookVersion, requestId: s.steps.find((x) => x.role.startsWith("Clause"))?.requestId ?? null, recordedAt: RECORDED_AT,
    docs, completionTs: Math.floor(Date.parse(DEMO.cp.completionOfDischarge) / 1000),
    ownerAddress: process.env.NEXT_PUBLIC_OWNER_ADDRESS ?? "", chartererAddress: process.env.NEXT_PUBLIC_CHARTERER_ADDRESS ?? "",
    ledger: process.env.NEXT_PUBLIC_LEDGER_ADDRESS ?? "", charterPartyHash: keccak256(toBytes(JSON.stringify(DEMO.cp))),
    requiredMask: DEMO.cp.requiredDocuments.reduce((m, d) => m | (1 << d.bit), 0),
  };
}

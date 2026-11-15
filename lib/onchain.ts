import { readdirSync, readFileSync, existsSync } from "node:fs";

export interface OnchainStep { step: string; kind: string; tx?: string; url?: string; status?: string; gasUsed?: string; signer?: string; decoded?: string }
export interface OnchainRun { at: string; ledger: string; claimUnits: string; acceptedUnits: string; disputedUnits: string; statementDigest: string; docsRoot: string; finalStage: number; paidToOwner: string; refunded: string; steps: OnchainStep[] }

/** Latest recorded onchain proof run, written by scripts/record-onchain.ts. */
export function latestOnchain(): OnchainRun | null {
  const dir = "proof/runs";
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).filter((x) => /^onchain-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().pop();
  return f ? (JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as OnchainRun) : null;
}

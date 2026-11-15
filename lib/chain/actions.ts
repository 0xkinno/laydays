import { encodeFunctionData, type Address, type Hex } from "viem";
import { ledgerAbi } from "./abi";
import { decodeRevert } from "./relayer";

export type ReadResult = { stage: number; owner: Address; charterer: Address; claimAmount: bigint; funded: bigint; accepted: bigint; paidToOwner: bigint; refunded: bigint; presentedAt: bigint; docsMask: number } | null;

export const encode = (functionName: string, args: unknown[]): Hex =>
  encodeFunctionData({ abi: ledgerAbi, functionName: functionName as never, args: args as never });

/** Send an already-signed ledger call through the relayer. The relayer pays gas and nothing else. */
export async function viaRelayer(data: Hex): Promise<{ ok: boolean; hash?: string; error?: string; gasUsed?: string }> {
  try {
    const r = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data }) });
    return (await r.json()) as { ok: boolean; hash?: string; error?: string; gasUsed?: string };
  } catch (e) {
    return { ok: false, error: `relayer down: ${(e as Error).message}. Use "Send it from my wallet".` };
  }
}

export function explainError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; cause?: { data?: Hex }; data?: Hex };
  const data = err?.cause?.data ?? err?.data;
  if (data) return decodeRevert(data);
  const m = err?.shortMessage ?? err?.message ?? String(e);
  if (/user rejected|denied/i.test(m)) return "Signature rejected in the wallet. Nothing was sent.";
  return m.slice(0, 220);
}

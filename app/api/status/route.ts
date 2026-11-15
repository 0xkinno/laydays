import { NextResponse } from "next/server";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every field here is a probe made in this process at request time. Nothing is hard-coded. */
export async function GET() {
  const at = new Date().toISOString();
  const probe = async <T,>(fn: () => Promise<T>) => {
    const t0 = Date.now();
    try { const v = await fn(); return { ok: true, ms: Date.now() - t0, value: v as unknown }; }
    catch (e) { return { ok: false, ms: Date.now() - t0, error: (e as Error).message.slice(0, 160) }; }
  };
  const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
  const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });

  const serv = await probe(async () => {
    const r = await fetch("https://inference-api.openserv.ai/v1/models", { headers: { authorization: `Bearer ${process.env.SERV_API_KEY ?? ""}` }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { items: { modelId: string }[] };
    return { models: j.items.length, hasLuna: j.items.some((m) => m.modelId === "gpt-6-luna"), hasSol: j.items.some((m) => m.modelId === "gpt-6.1-sol") };
  });
  const chain = await probe(async () => ({ block: String(await client.getBlockNumber()), chainId: await client.getChainId() }));
  const ledger = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}` | undefined;
  const contract = ledger
    ? await probe(async () => { const code = await client.getCode({ address: ledger }); return { address: ledger, deployed: !!code && code !== "0x" }; })
    : { ok: false, ms: 0, error: "ledger address not configured in this environment" };
  const relayerAddr = process.env.RELAYER_ADDRESS as `0x${string}` | undefined;
  const relayer = relayerAddr ? await probe(async () => ({ address: relayerAddr, eth: formatEther(await client.getBalance({ address: relayerAddr })) })) : { ok: false, ms: 0, error: "relayer not configured" };
  const reppo = await probe(async () => {
    const r = await fetch("https://eval.reppo.xyz/agents.md", { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { reachable: true };
  });
  return NextResponse.json({ at, live: process.env.LAYDAYS_LIVE !== "0", serv, chain, contract, relayer, reppo }, { headers: { "cache-control": "no-store" } });
}

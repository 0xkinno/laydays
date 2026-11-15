import { createPublicClient, createWalletClient, decodeErrorResult, decodeFunctionData, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import { ledgerAbi } from "./abi";

export const ALLOWED = new Set(["open", "present", "fundWithAuthorization", "answer", "settle", "reclaim"]);

export function decodeRevert(data?: Hex): string {
  if (!data || data === "0x") return "reverted with no reason";
  try {
    const d = decodeErrorResult({ abi: ledgerAbi, data });
    return `${d.errorName}(${(d.args ?? []).map((a) => String(a)).join(", ")})`;
  } catch { return `reverted: ${data.slice(0, 74)}`; }
}

const hits = new Map<string, { day: string; n: number }>();
function capOk(ip: string, perDay = 40): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip);
  if (!h || h.day !== day) { hits.set(ip, { day, n: 1 }); return true; }
  h.n++;
  return h.n <= perDay;
}

export async function relay(args: { data: Hex; ip: string }) {
  const ledger = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as Hex | undefined;
  const pk = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!ledger || !pk) return { ok: false as const, status: 503, error: "relayer is not configured, send it from your wallet" };
  if (!capOk(args.ip)) return { ok: false as const, status: 429, error: "daily relay cap reached, send it from your wallet" };

  let fn: string;
  try { fn = decodeFunctionData({ abi: ledgerAbi, data: args.data }).functionName; } catch { return { ok: false as const, status: 400, error: "not a ledger call" }; }
  if (!ALLOWED.has(fn)) return { ok: false as const, status: 400, error: `${fn} is not relayable` };

  const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
  const chain = process.env.LAYDAYS_REAL_MONEY === "1" ? base : baseSepolia;
  const pub = createPublicClient({ chain, transport: http(rpc) });
  if ((await pub.getChainId()) !== 84532 && process.env.LAYDAYS_REAL_MONEY !== "1") return { ok: false as const, status: 500, error: "relayer refuses to run off Base Sepolia" };
  const account = privateKeyToAccount(pk);
  try {
    await pub.call({ account, to: ledger, data: args.data });
  } catch (e) {
    const raw = (e as { cause?: { data?: Hex }; data?: Hex }).cause?.data ?? (e as { data?: Hex }).data;
    return { ok: false as const, status: 422, error: decodeRevert(raw), reverted: true };
  }
  const wallet = createWalletClient({ account, chain, transport: http(rpc) });
  const hash = await wallet.sendTransaction({ to: ledger, data: args.data });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  return { ok: true as const, hash, gasUsed: receipt.gasUsed.toString(), status: receipt.status };
}

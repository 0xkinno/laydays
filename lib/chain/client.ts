import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
});
export const LEDGER = (process.env.NEXT_PUBLIC_LEDGER_ADDRESS ?? "") as `0x${string}`;

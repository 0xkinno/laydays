import { createPublicClient, formatEther, formatUnits, http } from "viem";
import { baseSepolia } from "viem/chains";
import { loadEnv } from "./chain-env";
import { usdcAbi } from "../lib/chain/abi";
import { BASE_SEPOLIA_USDC } from "../lib/chain/addresses";
loadEnv();
const c = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL) });
for (const [n, a] of [["relayer/deployer", process.env.RELAYER_ADDRESS], ["owner", process.env.OWNER_ADDRESS], ["charterer", process.env.CHARTERER_ADDRESS]] as const) {
  const eth = await c.getBalance({ address: a as `0x${string}` });
  const usdc = await c.readContract({ address: BASE_SEPOLIA_USDC, abi: usdcAbi, functionName: "balanceOf", args: [a as `0x${string}`] });
  console.log(n.padEnd(17), a, "ETH", formatEther(eth), "USDC", formatUnits(usdc as bigint, 6));
}
console.log("block", await c.getBlockNumber());

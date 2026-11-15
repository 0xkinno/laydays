import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { loadEnv } from "./chain-env";

loadEnv();
const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex;
const rpc = process.env.BASE_SEPOLIA_RPC_URL;
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(rpc) });

const art = JSON.parse(readFileSync("artifacts/contracts/src/LaydaysLedger.sol/LaydaysLedger.json", "utf8"));
const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode as Hex });
const rc = await pub.waitForTransactionReceipt({ hash });
const address = rc.contractAddress!;
console.log("deployed", address, hash, "gas", rc.gasUsed.toString());

mkdirSync("contracts/deployments", { recursive: true });
const out = { network: "base-sepolia", chainId: 84532, contract: "LaydaysLedger", address, deployTx: hash, deployer: account.address, block: rc.blockNumber.toString(), gasUsed: rc.gasUsed.toString(), compiler: "0.8.28+commit.7893614a", usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", deployedAt: new Date().toISOString() };
writeFileSync("contracts/deployments/base-sepolia.json", JSON.stringify(out, null, 2) + "\n");

// Verify source on Basescan through the Etherscan v2 API.
const bi = JSON.parse(readFileSync(readdirBuildInfo(), "utf8"));
function readdirBuildInfo() {
  const fs = require("node:fs") as typeof import("node:fs");
  const f = fs.readdirSync("artifacts/build-info").find((x: string) => x.endsWith(".json") && !x.includes("output"))!;
  return `artifacts/build-info/${f}`;
}
await new Promise((r) => setTimeout(r, 15000));
const body = new URLSearchParams({
  codeformat: "solidity-standard-json-input", sourceCode: JSON.stringify(bi.input), contractaddress: address,
  contractname: Object.keys(bi.input.sources).find((s) => s.endsWith("LaydaysLedger.sol"))! + ":LaydaysLedger",
  compilerversion: "v0.8.28+commit.7893614a", constructorArguements: "",
});
const res = await fetch(`https://api.etherscan.io/v2/api?chainid=84532&module=contract&action=verifysourcecode&apikey=${process.env.ETHERSCAN_API_KEY}`, { method: "POST", body });
const j = (await res.json()) as { status: string; result: string; message: string };
console.log("verify submit", j);
if (j.status === "1") {
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    const s = await (await fetch(`https://api.etherscan.io/v2/api?chainid=84532&module=contract&action=checkverifystatus&guid=${j.result}&apikey=${process.env.ETHERSCAN_API_KEY}`)).json();
    console.log("status", s);
    if (!/Pending|queue/i.test(String(s.result))) { writeFileSync("contracts/deployments/base-sepolia.json", JSON.stringify({ ...out, verification: s.result, verifiedAt: new Date().toISOString() }, null, 2) + "\n"); break; }
  }
}

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./chain-env";
loadEnv();
const dep = JSON.parse(readFileSync("contracts/deployments/base-sepolia.json", "utf8"));
const f = readdirSync("artifacts/build-info").find((x) => x.endsWith(".json") && !x.includes("output"))!;
const bi = JSON.parse(readFileSync(`artifacts/build-info/${f}`, "utf8"));
const name = Object.keys(bi.input.sources).find((s) => s.endsWith("LaydaysLedger.sol"))!;
const key = process.env.ETHERSCAN_API_KEY;
const body = new URLSearchParams({ codeformat: "solidity-standard-json-input", sourceCode: JSON.stringify(bi.input), contractaddress: dep.address, contractname: `${name}:LaydaysLedger`, compilerversion: "v0.8.28+commit.7893614a", constructorArguements: "" });
const r = (await (await fetch(`https://api.etherscan.io/v2/api?chainid=84532&module=contract&action=verifysourcecode&apikey=${key}`, { method: "POST", body })).json()) as { status: string; result: string; message: string };
console.log("submit", r);
if (r.status === "1") {
  for (let i = 0; i < 15; i++) {
    await new Promise((x) => setTimeout(x, 8000));
    const s = (await (await fetch(`https://api.etherscan.io/v2/api?chainid=84532&module=contract&action=checkverifystatus&guid=${r.result}&apikey=${key}`)).json()) as { result: string };
    console.log("status", s.result);
    if (!/Pending|queue/i.test(s.result)) { writeFileSync("contracts/deployments/base-sepolia.json", JSON.stringify({ ...dep, verification: s.result, verifiedAt: new Date().toISOString() }, null, 2) + "\n"); break; }
  }
}

import { writeFileSync, mkdirSync } from "node:fs";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { loadEnv } from "./chain-env";

// Buys one ruling over x402 with the charterer test wallet as buyer, on Base Sepolia. Costs 0.02 test USDC and one SERV ruling.
loadEnv();
const url = process.env.PAID_URL ?? "https://laydays.vercel.app/api/x402/ruling";
const buyer = privateKeyToAccount(process.env.E2E_CHARTERER_KEY as `0x${string}`);
const pay = wrapFetchWithPaymentFromConfig(fetch, { schemes: [{ network: "eip155:84532", client: new ExactEvmScheme(buyer) }] });
const body = { interval: { id: "I09", from: 29785000, to: 29785270, text: "Rain squall, terminal stopped discharge on its own instruction." },
  clauses: [{ id: "CP-1", title: "Laytime", text: "Laytime for discharge is 36 running hours. Saturday after 12:00, Sundays and port holidays are excepted unless used." }, { id: "CP-4", title: "Weather", text: "Time lost to rain that stops discharge is excepted from laytime." }] };
const res = await pay(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const settle = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
const out = { at: new Date().toISOString(), url, status: res.status, buyer: buyer.address, settlement: settle ? decodePaymentResponseHeader(settle) : null, body: await res.json().catch(() => null) };
mkdirSync("proof/runs", { recursive: true });
writeFileSync("proof/runs/x402-paid-call.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2).slice(0, 1800));

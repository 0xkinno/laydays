import { Page } from "@/components/shell/Page";
import { existsSync, readFileSync } from "node:fs";

const REAL_402 = `{
  "x402Version": 2,
  "error": "Payment required",
  "resource": { "url": "https://laydays.vercel.app/api/x402/ruling", "mimeType": "application/json" },
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:84532",
    "amount": "20000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "payTo": "0x17EFfC7B32C7A7b61C0A40E3692Dd60Ac3CCd5bF",
    "maxTimeoutSeconds": 300,
    "extra": { "name": "USDC", "version": "2" }
  }]
}`;

const CURL = `curl -i -X POST https://laydays.vercel.app/api/x402/ruling \\
  -H 'content-type: application/json' \\
  -d '{
    "interval": { "id": "I09", "from": 29785000, "to": 29785270,
      "text": "Rain squall, terminal stopped discharge on its own instruction." },
    "clauses": [
      { "id": "CP-4", "title": "Weather", "text": "Time lost to rain that stops discharge is excepted from laytime." }
    ]
  }'`;

export default function Agents() {
  const paid = existsSync("proof/runs/x402-paid-call.json") ? (JSON.parse(readFileSync("proof/runs/x402-paid-call.json", "utf8")) as { status: number; settlement: { transaction?: string } | null; at: string; body: unknown }) : null;
  return (
    <Page tag="For agents" title="Pay two cents, get one ruling" intro="One interval of a ship's wait ruled against a clause set you send. The answer carries the effect, the clause ids, the verdict and the SERV request id. Priced at 0.02 USD in test USDC on Base Sepolia, settled over x402 only after a successful answer.">
      <h2 className="display text-3xl">1. Ask. You get a 402.</h2>
      <pre tabIndex={0} className="mt-3 overflow-x-auto rounded-[14px] border hair bg-paper-deep p-4 font-mono text-xs leading-relaxed">{CURL}</pre>
      <p className="mt-4 text-sm text-ink-soft">The response is HTTP 402 with a `payment-required` header. Its decoded body, captured from this route:</p>
      <pre tabIndex={0} className="mt-3 overflow-x-auto rounded-[14px] border hair bg-paper-deep p-4 font-mono text-xs leading-relaxed">{REAL_402}</pre>
      <h2 className="display mt-12 text-3xl">2. Pay. Retry with the payment header.</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">Any x402 client does this for you. `scripts/paid-call.ts` uses `@x402/fetch` with a test wallet: it signs an EIP-3009 transfer authorization for 0.02 USDC, the facilitator settles it, and the ruling comes back.</p>
      <h2 className="display mt-12 text-3xl">3. The settled payment</h2>
      {paid && paid.status === 200 ? (
        <p className="mt-3 text-sm">Recorded {paid.at.slice(0, 10)}. Settlement transaction: {paid.settlement?.transaction ? <a className="font-mono underline" href={`https://sepolia.basescan.org/tx/${paid.settlement.transaction}`} target="_blank" rel="noreferrer">{paid.settlement.transaction}</a> : "see proof/runs/x402-paid-call.json"}.</p>
      ) : (
        <p className="mt-3 max-w-2xl rounded-[12px] border border-dashed border-ink p-4 text-sm">No settled payment is recorded yet. The route returns a real 402 today. A paid call also spends one SERV ruling, and the SERV credit for it has not been topped up, so this section stays empty until it is run. It will show the transaction hash when it is.</p>
      )}
      <h2 className="display mt-12 text-3xl">Pricing is a hypothesis</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">An analyst who spends 2,520 to 4,200 hours a year on manual claim processing (<a className="underline" href="https://www.voyagerportal.com/resources/manual-paperwork-in-shipping/">Voyager</a>) would pay a per-claim desk price far above the cost of a run, and an agent that needs one ruling can pay per ruling. Neither price has been tested with a buyer.</p>
    </Page>
  );
}

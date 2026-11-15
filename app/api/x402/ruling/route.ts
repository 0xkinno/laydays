import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { z } from "zod";
import { ruleOneInterval } from "@/lib/serv/ruleOne";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const NETWORK = "eip155:84532" as const;
const PAY_TO = (process.env.X402_PAY_TO ?? process.env.NEXT_PUBLIC_OWNER_ADDRESS ?? "") as `0x${string}`;

const server = new x402ResourceServer(new HTTPFacilitatorClient({ url: process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator" })).register(NETWORK, new ExactEvmScheme());

const clauseZ = z.object({ id: z.string().min(1).max(20), title: z.string().max(80), text: z.string().max(1200) });
const bodyZ = z.object({
  interval: z.object({ id: z.string().max(12).default("I01"), from: z.number().int(), to: z.number().int(), text: z.string().min(3).max(500) }),
  clauses: z.array(clauseZ).min(1).max(20),
  portRules: z.array(clauseZ).max(10).default([]),
});

/** One interval ruled against a clause set. Price: 0.02 USD in test USDC on Base Sepolia. Settles only after a successful answer. */
const handler = async (req: NextRequest): Promise<NextResponse> => {
  const parsed = bodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request", issues: parsed.error.issues.slice(0, 3) }, { status: 400 });
  const r = await ruleOneInterval(parsed.data);
  if (!r.ok) return NextResponse.json({ error: r.error, refusedBy: r.refusedBy, requestId: r.requestId }, { status: 502 });
  return NextResponse.json(r.body);
};

export const POST = withX402(handler, {
  accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
  description: "Laydays: one interval of a ship's wait ruled against a clause set, with clause, verdict and SERV request id",
  mimeType: "application/json",
}, server);

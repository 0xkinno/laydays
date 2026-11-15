import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { z } from "zod";
import { clauseReader } from "@/lib/serv/crew/crew";
import { checkRulings } from "@/lib/verify/citations";
import { DEFINITION_IDS } from "@/lib/pipeline";
import { RULEBOOK_VERSION_SHA } from "@/lib/serv/crew/prompts";

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
  const { interval, clauses, portRules } = parsed.data;
  const lineId = "L01";
  const built = [{ id: interval.id, from: interval.from, to: interval.to, startLine: lineId, endLine: lineId, kind: "waiting" as const, cause: "none" as const, text: interval.text }];
  // The paid route defaults to a plain model: a Multipath cache miss is slow and billed beyond the visible tokens, which would cost more than the 0.02 price. X402_MODEL overrides it.
  const res = await clauseReader({ cp: clauses, port: portRules, lines: [{ id: lineId, text: interval.text }], intervals: built, offsetMinutes: 0 }, { model: process.env.X402_MODEL ?? "gpt-6-luna", plain: !/multipath|kronos/.test(process.env.X402_MODEL ?? "") });
  if (!res.ok) return NextResponse.json({ error: `ruling not made: ${res.error}`, refusedBy: res.refusedBy ?? null, requestId: res.requestId }, { status: 502 });
  const catalog = { charter_party: new Set(clauses.map((c) => c.id)), laytime_definitions: new Set(DEFINITION_IDS), port_rules: new Set(portRules.map((c) => c.id)) };
  const [checked] = checkRulings([interval.id], res.value!.intervals, catalog, new Set([lineId]), new Map([[interval.id, { startLine: lineId, endLine: lineId }]]));
  return NextResponse.json({
    interval: interval.id, effect: checked.resolvedEffect, verdict: checked.verdict, clauses: checked.clause_ids, reason: checked.reason, branches: checked.branches, problems: checked.problems,
    rulebookVersion: RULEBOOK_VERSION_SHA, serv: { model: res.model, requestId: res.requestId, latencyMs: res.latencyMs, costUsd: res.costUsd },
  });
};

export const POST = withX402(handler, {
  accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
  description: "Laydays: one interval of a ship's wait ruled against a clause set, with clause, verdict and SERV request id",
  mimeType: "application/json",
}, server);

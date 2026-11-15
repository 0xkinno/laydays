import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ledgerAbi, STAGES } from "@/lib/chain/abi";
import { voyageIdOf } from "@/lib/chain/eip712";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Claims the desk watches. A claim is flagged when it is still Open and inside 10 days of its bar.
const WATCHED = ["orla-jansen", "late-demo"];

/** Time-bar Watch. Pure code on a schedule: it reads the ledger and signs nothing. Vercel sends the CRON_SECRET as a bearer token. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ledger = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}`;
  const pub = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org") });
  const now = Math.floor(Date.now() / 1000);
  const claims = [];
  for (const slug of WATCHED) {
    try {
      const c = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "getClaim", args: [voyageIdOf(slug)] })) as unknown as { stage: number; terms: { completionOfDischarge: bigint; timeBarDays: number } };
      const deadline = Number(c.terms.completionOfDischarge) + c.terms.timeBarDays * 86400;
      const daysLeft = Math.floor((deadline - now) / 86400);
      const stage = STAGES[Number(c.stage)];
      claims.push({ claim: slug, stage, daysLeft, flagged: stage === "Open" && daysLeft >= 0 && daysLeft <= 10, barred: stage === "Open" && daysLeft < 0 });
    } catch (e) { claims.push({ claim: slug, error: (e as Error).message.slice(0, 120) }); }
  }
  const record = { run: "time-bar-watch", at: new Date().toISOString(), startedBy: req.headers.get("user-agent") ?? "unknown", claims };
  console.log(JSON.stringify(record)); // the dated run record, readable in the deployment's runtime logs
  return NextResponse.json(record);
}

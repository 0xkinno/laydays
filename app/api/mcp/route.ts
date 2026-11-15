import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ruleOneInterval } from "@/lib/serv/ruleOne";
import { timeBarClerk } from "@/lib/serv/crew/crew";
import { addSpend, checkVisitor } from "@/lib/caps";
import { ledgerAbi, STAGES } from "@/lib/chain/abi";
import { voyageIdOf } from "@/lib/chain/eip712";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Laydays as an MCP server over Streamable HTTP (stateless, JSON responses). Three tools:
 *  laydays_rule_interval, laydays_check_time_bar, laydays_get_claim. The two that use a model are capped per visitor and per day. */

const PROTOCOL = "2025-03-26";
const clauseZ = z.object({ id: z.string().min(1).max(20), title: z.string().max(80), text: z.string().max(1200) });
const ruleArgs = z.object({
  interval_text: z.string().min(3).max(500).describe("The log text for the interval, treated as data"),
  minutes: z.number().int().min(1).max(100000).default(60),
  clauses: z.array(clauseZ).min(1).max(20),
  port_rules: z.array(clauseZ).max(10).default([]),
});
const barArgs = z.object({
  clause_text: z.string().min(10).max(3000),
  documents_presented: z.array(z.enum(["nor", "sof", "bol", "pumping", "manifest", "statement", "notices", "port_log", "time_sheet", "protest", "charter_party", "invoice", "survey", "other"])).max(14),
});
const claimArgs = z.object({ claim: z.string().min(1).max(60).default("orla-jansen") });

const TOOLS = [
  { name: "laydays_rule_interval", description: "Rule one interval of a ship's wait against numbered charter party clauses (and optional port rules). Returns the effect (counts, excepted, half or ambiguous), the clause ids, the verdict (OBSERVED, or REVIEW when a code check fails) and the SERV request id. Code checks every clause id and resolves precedence. Capped per visitor.", inputSchema: { type: "object", additionalProperties: false, required: ["interval_text", "clauses"], properties: { interval_text: { type: "string" }, minutes: { type: "integer" }, clauses: { type: "array", items: { type: "object", required: ["id", "title", "text"], properties: { id: { type: "string" }, title: { type: "string" }, text: { type: "string" } } } }, port_rules: { type: "array", items: { type: "object", required: ["id", "title", "text"], properties: { id: { type: "string" }, title: { type: "string" }, text: { type: "string" } } } } } } },
  { name: "laydays_check_time_bar", description: "Read a charter party time bar clause with the SERV Time-bar Clerk into a day count and a required document list, then compare it in code with the documents already presented. Returns complete, incomplete (with the missing documents) or abstained when the clause names no documents. Capped per visitor.", inputSchema: { type: "object", additionalProperties: false, required: ["clause_text", "documents_presented"], properties: { clause_text: { type: "string" }, documents_presented: { type: "array", items: { type: "string", enum: ["nor", "sof", "bol", "pumping", "manifest", "statement", "notices", "port_log", "time_sheet", "protest", "charter_party", "invoice", "survey", "other"] } } } } },
  { name: "laydays_get_claim", description: "Read a claim's state from the LaydaysLedger contract on Base Sepolia: stage, amounts claimed, funded, paid and refunded, and the time bar deadline. No model is used.", inputSchema: { type: "object", additionalProperties: false, properties: { claim: { type: "string", description: "Claim slug, for example orla-jansen" } } } },
];

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const text = (t: unknown, isError = false) => ({ content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }], isError });

async function callTool(name: string, args: unknown, ip: string) {
  if (name === "laydays_get_claim") {
    const a = claimArgs.safeParse(args ?? {});
    if (!a.success) return text(`bad arguments: ${a.error.issues[0]?.message}`, true);
    const ledger = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as `0x${string}` | undefined;
    if (!ledger) return text("the ledger is not configured on this server", true);
    const pub = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org") });
    const c = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "getClaim", args: [voyageIdOf(a.data.claim)] })) as unknown as { stage: number; claimAmount: bigint; funded: bigint; accepted: bigint; paidToOwner: bigint; refunded: bigint; terms: { completionOfDischarge: bigint; timeBarDays: number } };
    const deadline = Number(c.terms.completionOfDischarge) + c.terms.timeBarDays * 86400;
    return text({ claim: a.data.claim, ledger, stage: STAGES[Number(c.stage)], claimUnits: c.claimAmount.toString(), fundedUnits: c.funded.toString(), acceptedUnits: c.accepted.toString(), paidToOwnerUnits: c.paidToOwner.toString(), refundedUnits: c.refunded.toString(), timeBarDeadline: c.terms.completionOfDischarge > 0n ? new Date(deadline * 1000).toISOString() : null, note: "Testnet scale: one cent is one millionth of a test USDC." });
  }
  const gate = checkVisitor(ip);
  if (!gate.ok) return text(gate.reason ?? "rate limited", true);
  if (name === "laydays_rule_interval") {
    const a = ruleArgs.safeParse(args);
    if (!a.success) return text(`bad arguments: ${a.error.issues[0]?.path.join(".")} ${a.error.issues[0]?.message}`, true);
    const r = await ruleOneInterval({ interval: { id: "I01", from: 0, to: a.data.minutes, text: a.data.interval_text }, clauses: a.data.clauses, portRules: a.data.port_rules });
    addSpend(r.costUsd);
    return r.ok ? text(r.body) : text(`${r.error}${r.refusedBy ? ` (refused by ${r.refusedBy})` : ""}. Nothing was ruled, so do not treat this as a ruling.`, true);
  }
  if (name === "laydays_check_time_bar") {
    const a = barArgs.safeParse(args);
    if (!a.success) return text(`bad arguments: ${a.error.issues[0]?.path.join(".")} ${a.error.issues[0]?.message}`, true);
    const r = await timeBarClerk(a.data.clause_text);
    addSpend(r.costUsd);
    if (!r.ok) return text(`SERV did not read the clause: ${r.error}`, true);
    const required = r.value!.required_keys.filter((k) => k !== "other");
    const missing = required.filter((k) => !a.data.documents_presented.includes(k as never));
    const verdict = required.length === 0 ? "abstained" : missing.length ? "incomplete" : "complete";
    return text({ verdict, barDays: r.value!.bar_days, required, presented: a.data.documents_presented, missing, note: verdict === "abstained" ? "The clause names no documents, so a person must decide what counts as supporting documents." : "The model lists what the clause demands. Code decides what is missing.", serv: { model: r.model, requestId: r.requestId, latencyMs: r.latencyMs, costUsd: r.costUsd } });
  }
  return text(`unknown tool ${name}`, true);
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization" };
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
export async function GET() { return NextResponse.json({ name: "laydays", note: "MCP over Streamable HTTP. POST JSON-RPC to this URL.", tools: TOOLS.map((t) => t.name), connect: "claude mcp add --transport http laydays https://laydays.vercel.app/api/mcp" }, { headers: { ...CORS, allow: "POST, OPTIONS" } }); }

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  let msg: Rpc | Rpc[];
  try { msg = (await req.json()) as Rpc | Rpc[]; } catch { return NextResponse.json(err(null, -32700, "parse error"), { status: 400, headers: CORS }); }
  const handle = async (m: Rpc) => {
    if (m.id === undefined && m.method?.startsWith("notifications/")) return null;
    switch (m.method) {
      case "initialize": return ok(m.id, { protocolVersion: PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "laydays", version: "1.0.0" }, instructions: "Laydays rules ship waiting time against charter party clauses and checks time bar document lists. Two tools use SERV and are capped. Fictional voyage data only unless you send your own." });
      case "ping": return ok(m.id, {});
      case "tools/list": return ok(m.id, { tools: TOOLS });
      case "tools/call": {
        const p = (m.params ?? {}) as { name?: string; arguments?: unknown };
        try { return ok(m.id, await callTool(String(p.name), p.arguments, ip)); } catch (e) { return ok(m.id, text(`tool failed: ${(e as Error).message.slice(0, 200)}`, true)); }
      }
      default: return err(m.id, -32601, `method not found: ${m.method}`);
    }
  };
  if (Array.isArray(msg)) {
    const out = (await Promise.all(msg.map(handle))).filter(Boolean);
    return out.length ? NextResponse.json(out, { headers: CORS }) : new NextResponse(null, { status: 202, headers: CORS });
  }
  const r = await handle(msg);
  return r ? NextResponse.json(r, { headers: CORS }) : new NextResponse(null, { status: 202, headers: CORS });
}

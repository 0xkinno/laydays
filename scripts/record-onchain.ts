import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createPublicClient, createWalletClient, decodeErrorResult, encodeFunctionData, http, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { loadEnv } from "./chain-env";
import { ledgerAbi, usdcAbi } from "../lib/chain/abi";
import { BASE_SEPOLIA_USDC, txUrl } from "../lib/chain/addresses";
import { answerTyped, openTyped, presentTyped, receiveAuthTyped, settleTyped, voyageIdOf } from "../lib/chain/eip712";
import { buildDocsTree } from "../lib/chain/docsTree";
import { statementDigest } from "../lib/chain/digest";
import { computeStatement } from "../lib/laytime/clock";
import { demoSummary } from "../lib/view";
import { DEMO } from "../lib/serv/rulebooks.generated";

loadEnv();
const rpc = process.env.BASE_SEPOLIA_RPC_URL;
const LEDGER = process.env.NEXT_PUBLIC_LEDGER_ADDRESS as Hex;
const pub = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as Hex);
const owner = privateKeyToAccount(process.env.E2E_OWNER_KEY as Hex);
const dan = privateKeyToAccount(process.env.E2E_CHARTERER_KEY as Hex);
const wallet = createWalletClient({ account: relayer, chain: baseSepolia, transport: http(rpc) });

const log: { step: string; kind: string; tx?: string; url?: string; status?: string; gasUsed?: string; signer?: string; decoded?: string; note?: string }[] = [];
const decode = (e: unknown): string => {
  const d = (e as { cause?: { data?: Hex }; data?: Hex }).cause?.data ?? (e as { data?: Hex }).data ?? ((e as { walk?: (f: (x: unknown) => boolean) => unknown }).walk?.((x) => !!(x as { data?: Hex }).data) as { data?: Hex } | undefined)?.data;
  try { const r = decodeErrorResult({ abi: ledgerAbi, data: d! }); return `${r.errorName}(${(r.args ?? []).join(", ")})`; } catch { return String((e as Error).message).slice(0, 160); }
};
const call = (fn: string, args: unknown[]) => encodeFunctionData({ abi: ledgerAbi, functionName: fn as never, args: args as never });

/** Simulate first (decoded revert), then optionally land a real tx. A reverted tx is sent with a fixed gas limit so it is mined and visible. */
async function run(step: string, kind: "tx" | "refusal", fn: string, args: unknown[], signer: string, opts: { land?: boolean } = {}) {
  const data = call(fn, args);
  let decoded: string | undefined;
  try { await pub.call({ account: relayer, to: LEDGER, data }); } catch (e) { decoded = decode(e); }
  if (kind === "refusal" && !decoded) throw new Error(`${step}: expected a refusal but the simulation passed`);
  if (kind === "tx" && decoded) throw new Error(`${step}: unexpected revert ${decoded}`);
  if (kind === "refusal" && !opts.land) { log.push({ step, kind: "refusal (simulated)", decoded, signer }); console.log(step, "->", decoded); return; }
  const hash = await wallet.sendTransaction({ to: LEDGER, data, gas: kind === "refusal" ? 400000n : undefined });
  const rc = await pub.waitForTransactionReceipt({ hash });
  log.push({ step, kind: kind === "refusal" ? "refusal (reverted onchain)" : "transaction", tx: hash, url: txUrl(hash), status: rc.status, gasUsed: rc.gasUsed.toString(), signer, decoded });
  console.log(step, rc.status, hash, decoded ?? "");
  if (kind === "tx" && rc.status !== "success") throw new Error(`${step} failed`);
}
const nonceOf = async (a: Hex) => (await pub.readContract({ address: LEDGER, abi: ledgerAbi, functionName: "nonces", args: [a] })) as bigint;
const sha = (p: string) => ("0x" + createHash("sha256").update(readFileSync(p)).digest("hex")) as Hex;

async function openVoyage(slug: string, completion: bigint) {
  const id = voyageIdOf(slug);
  const dl = BigInt(Math.floor(Date.now() / 1000) + 3 * 86400);
  const terms = { owner: owner.address, charterer: dan.address, token: BASE_SEPOLIA_USDC, completionOfDischarge: completion, timeBarDays: 90, requiredDocsMask: 0x7f, charterPartyHash: keccak256(toBytes(JSON.stringify(DEMO.cp))), rulebookHash: ("0x" + demoSummary().rulebookVersion) as Hex };
  const os = await owner.signTypedData(openTyped(LEDGER, id, terms, await nonceOf(owner.address), dl));
  const cs = await dan.signTypedData(openTyped(LEDGER, id, terms, await nonceOf(dan.address), dl));
  await run(`${slug}: both parties sign the terms, claim opened`, "tx", "open", [id, terms, dl, os, cs], "owner and charterer");
  return id;
}

async function main() {
  const s = demoSummary();
  const root = process.cwd();
  const docsDir = path.join(root, "data/demo/documents");
  const reqDocs = DEMO.cp.requiredDocuments;
  const have = reqDocs.filter((d) => existsSync(path.join(docsDir, `${d.key}.txt`))).map((d) => ({ bit: d.bit, key: d.key, label: d.label, sha256: sha(path.join(docsDir, `${d.key}.txt`)) }));
  const withBol = [...have, { bit: 2, key: "bol", label: "Bills of lading", sha256: sha(path.join(root, "data/demo/documents-pending/bol.txt")) }];
  const treeMissing = buildDocsTree(have), treeFull = buildDocsTree(withBol);

  // Meera rules the one interval left in REVIEW herself: excepted under the port rule PR-1.
  const own: Record<string, "excepted"> = {};
  for (const i of s.intervals) if (i.verdict === "REVIEW") own[i.id] = "excepted";
  const rows = s.intervals.map((i) => ({ ...i, final: own[i.id] ?? i.effect, person: !!own[i.id] }));
  const st = computeStatement({ allowedMinutes: 2160, commencesAt: s.commencesAt, demurrageRateCentsPerDay: 1800000n, despatchHalfRate: true, intervals: rows.map((r) => ({ id: r.id, from: r.from, to: r.to, effect: r.final as "counts", appliesOnDemurrage: r.appliesOnDemurrage })) });
  const amount = st.demurrageCents; // testnet scale: 1 cent = 1 base unit of test USDC
  const body = { voyage: "orla-jansen", rulebook: s.rulebookVersion, total: amount.toString(), intervals: rows.map((r) => ({ id: r.id, effect: r.final, minutes: r.minutes, clauses: r.clauseIds, byPerson: r.person })) };
  const digest = statementDigest(body);
  console.log("claim", amount.toString(), "digest", digest);

  const completion = BigInt(Math.floor(Date.parse(DEMO.cp.completionOfDischarge) / 1000));
  const id = await openVoyage("orla-jansen", completion);
  const dl = () => BigInt(Math.floor(Date.now() / 1000) + 3600);
  const present = async (a: bigint, d: Hex, root_: Hex, mask: number, sigBy = owner, nonce?: bigint, deadline = dl()) =>
    ({ args: [id, a, d, root_, mask, deadline, await sigBy.signTypedData(presentTyped(LEDGER, { voyageId: id, amount: a, statementDigest: d, docsRoot: root_, providedDocsMask: mask, nonce: nonce ?? (await nonceOf(owner.address)), deadline }))], deadline });

  // Refusals.
  const miss = await present(amount, digest, treeMissing.root, treeMissing.mask);
  await run("orla-jansen: presented without the bills of lading", "refusal", "present", miss.args, "owner", { land: true });
  const wrongSigner = await present(amount, digest, treeFull.root, treeFull.mask, dan);
  await run("orla-jansen: signed by the wrong wallet", "refusal", "present", wrongSigner.args, "charterer (not the owner)");
  const dl2 = dl();
  const goodSig = await owner.signTypedData(presentTyped(LEDGER, { voyageId: id, amount, statementDigest: digest, docsRoot: treeFull.root, providedDocsMask: treeFull.mask, nonce: await nonceOf(owner.address), deadline: dl2 }));
  const tampered = keccak256(toBytes("tampered statement"));
  await run("orla-jansen: statement digest changed after signing", "refusal", "present", [id, amount, tampered, treeFull.root, treeFull.mask, dl2, goodSig], "owner");

  // Happy path.
  await run("orla-jansen: owner presents the complete claim before day 90", "tx", "present", [id, amount, digest, treeFull.root, treeFull.mask, dl2, goodSig], "owner");
  await run("orla-jansen: the same signature replayed", "refusal", "present", [id, amount, digest, treeFull.root, treeFull.mask, dl2, goodSig], "owner");

  // Dan funds with a USDC authorization, answers line by line, then both sign a settlement.
  const uname = (await pub.readContract({ address: BASE_SEPOLIA_USDC, abi: usdcAbi, functionName: "name" })) as string;
  const uver = (await pub.readContract({ address: BASE_SEPOLIA_USDC, abi: usdcAbi, functionName: "version" })) as string;
  const an = keccak256(toBytes(`fund-${Date.now()}`));
  const vb = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const asig = await dan.signTypedData(receiveAuthTyped(BASE_SEPOLIA_USDC, uname, uver, { from: dan.address, to: LEDGER, value: amount, validAfter: 0n, validBefore: vb, nonce: an }));
  const r = ("0x" + asig.slice(2, 66)) as Hex, ss = ("0x" + asig.slice(66, 130)) as Hex, v = parseInt(asig.slice(130, 132), 16);
  await run("orla-jansen: charterer funds the claim with a USDC authorization (no gas paid by Dan)", "tx", "fundWithAuthorization", [id, amount, 0n, vb, an, v, r, ss], "charterer");

  const lines = st.lines.filter((l) => l.demurrageMinutes > 0);
  const disputedIds = lines.slice(-2).map((l) => l.id);
  const disputedCents = lines.filter((l) => disputedIds.includes(l.id)).reduce((a, l) => a + (1800000n * BigInt(Math.round(l.demurrageMinutes * 2)) + 1440n) / 2880n, 0n);
  const accepted = amount - disputedCents;
  const dd = keccak256(toBytes(JSON.stringify({ voyage: "orla-jansen", disputed: disputedIds })));
  const adl = dl();
  const answerSig = await dan.signTypedData(answerTyped(LEDGER, { voyageId: id, accepted, disputeDigest: dd, nonce: await nonceOf(dan.address), deadline: adl }));
  await run(`orla-jansen: charterer accepts ${accepted} units and disputes ${disputedIds.join(", ")}; the accepted part is paid at once`, "tx", "answer", [id, accepted, dd, adl, answerSig], "charterer");

  const toOwner = disputedCents / 2n;
  const sdl = dl();
  const so = await owner.signTypedData(settleTyped(LEDGER, { voyageId: id, toOwner, nonce: await nonceOf(owner.address), deadline: sdl }));
  const sc = await dan.signTypedData(settleTyped(LEDGER, { voyageId: id, toOwner, nonce: await nonceOf(dan.address), deadline: sdl }));
  await run("orla-jansen: both sign a settlement, held funds split", "tx", "settle", [id, toOwner, sdl, so, sc], "owner and charterer");

  // Late presentation on a second, older claim.
  const lateCompletion = BigInt(Math.floor(Date.parse("2026-06-20T12:00:00Z") / 1000));
  const lateId = await openVoyage("late-demo", lateCompletion);
  const ldl = dl();
  const lsig = await owner.signTypedData(presentTyped(LEDGER, { voyageId: lateId, amount: 1000000n, statementDigest: digest, docsRoot: treeFull.root, providedDocsMask: treeFull.mask, nonce: await nonceOf(owner.address), deadline: ldl }));
  await run("late-demo: presented on day 148 of 90 (completion 20 Jun 2026)", "refusal", "present", [lateId, 1000000n, digest, treeFull.root, treeFull.mask, ldl, lsig], "owner", { land: true });

  const final = (await pub.readContract({ address: LEDGER, abi: ledgerAbi, functionName: "getClaim", args: [id] })) as { stage: number; paidToOwner: bigint; refunded: bigint };
  const summary = `${log.filter((l) => l.kind === "transaction").length} transactions, ${log.filter((l) => l.kind.startsWith("refusal")).length} refusals`;
  mkdirSync("proof/runs", { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  writeFileSync(`proof/runs/onchain-${stamp}.json`, JSON.stringify({ at: new Date().toISOString(), ledger: LEDGER, claimUnits: amount.toString(), acceptedUnits: accepted.toString(), disputedUnits: disputedCents.toString(), statementDigest: digest, docsRoot: treeFull.root, finalStage: Number(final.stage), paidToOwner: final.paidToOwner.toString(), refunded: final.refunded.toString(), steps: log }, null, 2));
  writeFileSync("proof/runs/onchain.facts.json", JSON.stringify({ onchain_summary: summary, onchain_transactions: log.filter((l) => l.kind === "transaction").length, onchain_refusals: log.filter((l) => l.kind.startsWith("refusal")).length }, null, 2));
  console.log("done:", summary);
}
main().catch((e) => { console.error("FAILED", e); writeFileSync("proof/runs/onchain-partial.json", JSON.stringify(log, null, 2)); process.exit(1); });

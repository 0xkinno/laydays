"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useSignTypedData, useSwitchChain, useWriteContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import type { Hex } from "viem";
import { GlowCard } from "@/components/ui/GlowCard";
import { ledgerAbi, STAGES } from "@/lib/chain/abi";
import { BASE_SEPOLIA_USDC, txUrl } from "@/lib/chain/addresses";
import { buildDocsTree } from "@/lib/chain/docsTree";
import { statementDigest } from "@/lib/chain/digest";
import { openTyped, presentTyped } from "@/lib/chain/eip712";
import { newClaimQuery, useClaimKey } from "@/lib/claimKey";
import { encode, explainError, viaRelayer } from "@/lib/chain/actions";
import type { VoyageProps } from "@/lib/voyageData";
import { formatUsd } from "@/lib/laytime/money";

interface Row { id: string; minutes: number; final: "counts" | "excepted" | "half" | null; clauseIds: string[]; person: boolean }

export function PresentPanel({ v, rows, stmtCents, reviewLeft, missing, bolAttached, barred, role }: {
  v: VoyageProps; rows: Row[]; stmtCents: bigint; reviewLeft: number; missing: string[]; bolAttached: boolean; barred: boolean; role: "Owner" | "Charterer" | null;
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const pub = usePublicClient({ chainId: baseSepolia.id });
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const [stage, setStage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; hash?: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const ledger = (v.ledger || "") as `0x${string}`;
  const ck = useClaimKey(v.slug, v.completionTs);
  const voyageId = ck.voyageId;

  const refresh = useCallback(async () => {
    if (!ledger || !pub) return;
    try {
      const c = await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "getClaim", args: [voyageId] });
      setStage(Number((c as { stage: number }).stage));
    } catch { setStage(null); }
  }, [ledger, pub, voyageId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const reasons: string[] = [];
  if (!ledger) reasons.push("The ledger is not deployed in this environment yet");
  if (!isConnected) reasons.push("Connect the owner wallet");
  else if (role !== "Owner") reasons.push("Connect the owner wallet (Meera)");
  if (reviewLeft > 0) reasons.push(`${reviewLeft} interval still in review, rule it yourself`);
  if (missing.length) reasons.push(`${missing.join(", ")} missing`);
  if (barred && !ck.fresh) reasons.push("The time bar has passed. The contract will refuse it");
  const ready = reasons.length === 0;

  const body = useMemo(() => ({
    voyage: v.slug, rulebook: v.rulebookVersion, total: stmtCents.toString(),
    intervals: rows.map((r) => ({ id: r.id, effect: r.final, minutes: r.minutes, clauses: r.clauseIds, byPerson: r.person })),
  }), [v, rows, stmtCents]);

  async function openTerms() {
    setBusy(true); setMsg(null);
    try {
      if (!ledger || !pub || !address) throw new Error("wallet or ledger missing");
      if (chainId !== baseSepolia.id) { switchChain({ chainId: baseSepolia.id }); throw new Error("Switching to Base Sepolia. Try again."); }
      const nonce = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "nonces", args: [address] })) as bigint;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3 * 86400);
      const terms = { owner: v.ownerAddress as `0x${string}`, charterer: v.chartererAddress as `0x${string}`, token: BASE_SEPOLIA_USDC, completionOfDischarge: BigInt(ck.completionTs), timeBarDays: 90, requiredDocsMask: v.requiredMask, charterPartyHash: v.charterPartyHash, rulebookHash: ("0x" + v.rulebookVersion) as Hex };
      const sig = await signTypedDataAsync(openTyped(ledger, voyageId, terms, nonce, deadline));
      setLink(`${location.origin}/voyage/${v.slug}/charterer?${ck.query ? ck.query + "&" : ""}ownerSig=${sig}&deadline=${deadline}`);
      setMsg({ kind: "ok", text: "Terms signed by you. Send this link to Dan. He signs the same terms and opens the claim." });
    } catch (e) { setMsg({ kind: "err", text: explainError(e) }); } finally { setBusy(false); }
  }

  async function present(direct: boolean) {
    setBusy(true); setMsg(null);
    try {
      if (!ledger || !pub || !address) throw new Error("wallet or ledger missing");
      if (chainId !== baseSepolia.id) { switchChain({ chainId: baseSepolia.id }); throw new Error("Switching to Base Sepolia. Try again."); }
      const present = v.docs.filter((d) => d.present || (d.key === "bol" && bolAttached));
      const tree = buildDocsTree(present.map((d) => ({ bit: d.bit, key: d.key, label: d.label, sha256: d.sha256 })));
      const digest = statementDigest(body);
      const nonce = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "nonces", args: [address] })) as bigint;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const amount = stmtCents; // testnet scale: one cent of demurrage is one base unit (0.000001) of test USDC
      const sig = await signTypedDataAsync(presentTyped(ledger, { voyageId, amount, statementDigest: digest, docsRoot: tree.root, providedDocsMask: tree.mask, nonce, deadline }));
      const args = [voyageId, amount, digest, tree.root, tree.mask, deadline, sig];
      if (direct) {
        const hash = await writeContractAsync({ address: ledger, abi: ledgerAbi, functionName: "present", args: args as never, chainId: baseSepolia.id });
        await pub.waitForTransactionReceipt({ hash });
        setMsg({ kind: "ok", text: "Presented onchain from your wallet.", hash });
      } else {
        const r = await viaRelayer(encode("present", args));
        if (!r.ok) throw Object.assign(new Error(r.error ?? "relay failed"), { shortMessage: r.error });
        setMsg({ kind: "ok", text: "Presented onchain. The relayer paid the gas and nothing else.", hash: r.hash });
      }
      await refresh();
    } catch (e) { setMsg({ kind: "err", text: explainError(e) }); } finally { setBusy(false); }
  }

  const stageName = stage === null ? "not opened" : STAGES[stage];
  return (
    <GlowCard className="p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="tag text-ink-soft">Sign and present</p>
          <p className="display mt-1 text-3xl">Present {formatUsd(stmtCents)} before the bar</p>
        </div>
        <p className="font-mono text-xs text-ink-soft">ledger stage: {stageName}</p>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">You sign the claim with your own wallet. The contract refuses a late claim and a claim with a document missing. Testnet scale: one cent of demurrage is 0.000001 test USDC, so {formatUsd(stmtCents)} is {(Number(stmtCents) / 1e6).toFixed(6)} USDC.</p>

      {stage === 0 || stage === null ? (
        <div className="mt-5">
          <button disabled={!ready || busy || !ledger} onClick={openTerms} className="h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">Sign the terms first</button>
          <p className="mt-2 text-xs text-ink-soft">Both parties sign the terms once. Then you can present.</p>
        </div>
      ) : stage === 1 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={!ready || busy} onClick={() => present(false)} className="h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">Sign and present</button>
          <button disabled={!ready || busy} onClick={() => present(true)} className="h-12 rounded-[12px] border border-ink/20 px-6 font-medium hover:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-50">Send it from my wallet</button>
        </div>
      ) : (
        <p className="mt-5 rounded-[10px] border hair p-3 text-sm">This claim is {stageName.toLowerCase()}. Dan answers on <a className="underline" href={`/voyage/${v.slug}/charterer${ck.query ? "?" + ck.query : ""}`}>his page</a>.</p>
      )}

      {ck.fresh && <p className="mt-3 rounded-[10px] border border-dashed border-ink p-3 text-xs">Demo clock: this fresh claim restates completion of discharge as 83 days before it was opened, so the walkthrough is always on day 83. The statement keeps the real log dates.</p>}
      {(stage === 4 || stage === 3) && !ck.fresh && <a href={`?${newClaimQuery()}`} className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-ink px-5 text-sm font-medium text-paper">Start a fresh claim to try it yourself</a>}
      {reasons.length > 0 && <ul className="mt-4 space-y-1 text-sm text-ink-soft">{reasons.map((r) => <li key={r}>Waiting: {r}</li>)}</ul>}
      {busy && <p className="mt-4 text-sm" role="status">Waiting for your wallet or the chain…</p>}
      {link && <div className="mt-4 break-all rounded-[10px] border hair bg-paper p-3 font-mono text-xs">{link}</div>}
      {msg && (
        <div role="status" className={`mt-4 rounded-[10px] border p-3 text-sm ${msg.kind === "err" ? "border-flare text-flare" : "border-ink/20"}`}>
          {msg.text} {msg.hash && <a className="underline" href={txUrl(msg.hash)} target="_blank" rel="noreferrer">View on Basescan</a>}
        </div>
      )}
    </GlowCard>
  );
}

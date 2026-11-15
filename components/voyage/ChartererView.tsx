"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useSignTypedData, useSwitchChain, useWriteContract } from "wagmi";
import { useSearchParams } from "next/navigation";
import { baseSepolia } from "wagmi/chains";
import { keccak256, toBytes, type Hex } from "viem";
import { GlowCard } from "@/components/ui/GlowCard";
import { ledgerAbi, STAGES, usdcAbi } from "@/lib/chain/abi";
import { BASE_SEPOLIA_USDC, txUrl } from "@/lib/chain/addresses";
import { answerTyped, openTyped, receiveAuthTyped } from "@/lib/chain/eip712";
import { useClaimKey } from "@/lib/claimKey";
import { encode, explainError, viaRelayer } from "@/lib/chain/actions";
import { computeStatement } from "@/lib/laytime/clock";
import { formatUsd } from "@/lib/laytime/money";
import { fmtLocal } from "@/lib/laytime/intervals";
import { useRole } from "@/lib/useRole";
import type { VoyageProps } from "@/lib/voyageData";

type Claim = { stage: number; claimAmount: bigint; funded: bigint; accepted: bigint; paidToOwner: bigint; refunded: bigint };

export function ChartererView({ v }: { v: VoyageProps }) {
  const { address, isConnected } = useAccount();
  const role = useRole(address);
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const pub = usePublicClient({ chainId: baseSepolia.id });
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const qs = useSearchParams();
  const ownerSig = qs.get("ownerSig") as Hex | null;
  const sigDeadline = qs.get("deadline");
  const ledger = v.ledger as `0x${string}`;
  const ck = useClaimKey(v.slug, v.completionTs);
  const voyageId = ck.voyageId;
  const [claim, setClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; hash?: string } | null>(null);
  const [disputed, setDisputed] = useState<Record<string, boolean>>({});

  const stmt = useMemo(() => computeStatement({
    allowedMinutes: v.allowedMinutes, commencesAt: v.commencesAt, demurrageRateCentsPerDay: BigInt(v.rateCentsPerDay), despatchHalfRate: v.despatchHalfRate,
    intervals: v.intervals.map((i) => ({ id: i.id, from: i.from, to: i.to, effect: (i.effect ?? "excepted") as "counts" | "excepted" | "half", appliesOnDemurrage: i.appliesOnDemurrage })),
  }), [v]);
  const lines = stmt.lines.filter((l) => l.demurrageMinutes > 0);
  const lineCents = (mins: number) => (BigInt(v.rateCentsPerDay) * BigInt(Math.round(mins * 2)) + 1440n) / 2880n;
  const disputedCents = lines.filter((l) => disputed[l.id]).reduce((a, l) => a + lineCents(l.demurrageMinutes), 0n);

  const refresh = useCallback(async () => {
    if (!pub || !ledger) return;
    try {
      const c = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "getClaim", args: [voyageId] })) as unknown as Claim;
      setClaim({ stage: Number(c.stage), claimAmount: c.claimAmount, funded: c.funded, accepted: c.accepted, paidToOwner: c.paidToOwner, refunded: c.refunded });
    } catch { setClaim(null); }
  }, [pub, ledger, voyageId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const stage = claim?.stage ?? 0;
  const isDan = role === "Charterer";
  const guard = async () => {
    if (!pub || !address || !ledger) throw new Error("wallet or ledger missing");
    if (chainId !== baseSepolia.id) { switchChain({ chainId: baseSepolia.id }); throw new Error("Switching to Base Sepolia. Try again."); }
  };
  const send = async (fn: string, args: unknown[], ok: string) => {
    const r = await viaRelayer(encode(fn, args));
    if (!r.ok) throw Object.assign(new Error(r.error), { shortMessage: r.error });
    setMsg({ kind: "ok", text: ok, hash: r.hash });
    await refresh();
  };

  async function openClaim() {
    setBusy(true); setMsg(null);
    try {
      await guard();
      if (!ownerSig || !sigDeadline) throw new Error("Open the link Meera sent you. It carries her signature on the terms.");
      const deadline = BigInt(sigDeadline);
      const nonce = (await pub!.readContract({ address: ledger, abi: ledgerAbi, functionName: "nonces", args: [address!] })) as bigint;
      const terms = { owner: v.ownerAddress as `0x${string}`, charterer: v.chartererAddress as `0x${string}`, token: BASE_SEPOLIA_USDC, completionOfDischarge: BigInt(ck.completionTs), timeBarDays: 90, requiredDocsMask: v.requiredMask, charterPartyHash: v.charterPartyHash, rulebookHash: ("0x" + v.rulebookVersion) as Hex };
      const sig = await signTypedDataAsync(openTyped(ledger, voyageId, terms, nonce, deadline));
      await send("open", [voyageId, terms, deadline, ownerSig, sig], "Terms signed by both parties. The claim is open.");
    } catch (e) { setMsg({ kind: "err", text: explainError(e) }); } finally { setBusy(false); }
  }

  async function fund() {
    setBusy(true); setMsg(null);
    try {
      await guard();
      const value = claim!.claimAmount - claim!.funded;
      const name = (await pub!.readContract({ address: BASE_SEPOLIA_USDC, abi: usdcAbi, functionName: "name" })) as string;
      const ver = (await pub!.readContract({ address: BASE_SEPOLIA_USDC, abi: usdcAbi, functionName: "version" })) as string;
      const nonce = keccak256(toBytes(`${v.slug}-${Date.now()}-${address}`));
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const sig = await signTypedDataAsync(receiveAuthTyped(BASE_SEPOLIA_USDC, name, ver, { from: address!, to: ledger, value, validAfter: 0n, validBefore, nonce }));
      const r = BigInt("0x" + sig.slice(2, 66)), s = BigInt("0x" + sig.slice(66, 130)), vv = parseInt(sig.slice(130, 132), 16);
      await send("fundWithAuthorization", [voyageId, value, 0n, validBefore, nonce, vv, ("0x" + r.toString(16).padStart(64, "0")) as Hex, ("0x" + s.toString(16).padStart(64, "0")) as Hex], "Funded with a USDC authorization. You paid no gas.");
    } catch (e) { setMsg({ kind: "err", text: explainError(e) }); } finally { setBusy(false); }
  }

  async function answer(direct: boolean) {
    setBusy(true); setMsg(null);
    try {
      await guard();
      const accepted = claim!.claimAmount - disputedCents;
      const disputeIds = lines.filter((l) => disputed[l.id]).map((l) => l.id);
      const digest = keccak256(toBytes(JSON.stringify({ voyage: v.slug, disputed: disputeIds })));
      const nonce = (await pub!.readContract({ address: ledger, abi: ledgerAbi, functionName: "nonces", args: [address!] })) as bigint;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const sig = await signTypedDataAsync(answerTyped(ledger, { voyageId, accepted, disputeDigest: digest, nonce, deadline }));
      const args = [voyageId, accepted, digest, deadline, sig];
      if (direct) {
        const hash = await writeContractAsync({ address: ledger, abi: ledgerAbi, functionName: "answer", args: args as never, chainId: baseSepolia.id });
        await pub!.waitForTransactionReceipt({ hash });
        setMsg({ kind: "ok", text: "Answered from your wallet. The accepted amount was paid to the owner.", hash });
        await refresh();
      } else {
        await send("answer", args, `Answered. ${formatUsd(accepted)} accepted and paid to the owner now; ${formatUsd(disputedCents)} held until both sign a settlement.`);
      }
    } catch (e) { setMsg({ kind: "err", text: explainError(e) }); } finally { setBusy(false); }
  }

  const scale = (c: bigint) => `${formatUsd(c)} (${(Number(c) / 1e6).toFixed(6)} test USDC)`;
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      <p className="tag text-ink-soft">The charterer, fictional</p>
      <h1 className="display text-5xl sm:text-6xl">Dan Reyes, Gulfline Trading</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">Fund the claim, accept it line by line, and the accepted amount pays Meera the same day. Disputed hours stay held until you both sign a settlement. Ledger stage: <span className="font-mono">{claim ? STAGES[stage] : "not opened"}</span>.</p>
      {!isDan && <p className="mt-4 rounded-[10px] border border-dashed border-ink p-3 text-sm">Connect the charterer wallet to act on this page. You are {role ?? "not a party to this claim"}.</p>}

      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_320px]">
        <GlowCard className="p-6">
          <p className="tag text-ink-soft">Line by line</p>
          <ul className="mt-3 divide-y hair">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div><span className="font-mono text-xs">{l.id}</span> <span className="text-ink-soft">{fmtLocal(l.from, -300).slice(5)} to {fmtLocal(l.to, -300).slice(5)} · {l.demurrageMinutes} min</span></div>
                <div className="flex items-center gap-3"><span className="font-mono text-xs">{formatUsd(lineCents(l.demurrageMinutes))}</span>
                  <button aria-pressed={!!disputed[l.id]} disabled={stage !== 2} onClick={() => setDisputed((d) => ({ ...d, [l.id]: !d[l.id] }))} className={`h-11 min-w-[96px] rounded-[8px] border px-3 text-xs ${disputed[l.id] ? "border-flare text-flare-ink" : "border-ink/20 bg-signal"} disabled:opacity-50`}>{disputed[l.id] ? "Disputed" : "Accepted"}</button></div>
              </li>
            ))}
          </ul>
        </GlowCard>
        <GlowCard className="p-6">
          <p className="tag text-ink-soft">The claim onchain</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Claimed</dt><dd className="font-mono text-xs">{claim ? scale(claim.claimAmount) : "none yet"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Funded</dt><dd className="font-mono text-xs">{claim ? scale(claim.funded) : "0"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Paid to owner</dt><dd className="font-mono text-xs">{claim ? scale(claim.paidToOwner) : "0"}</dd></div>
          </dl>
          <p className="mt-4 text-sm">Disputed in your answer: <span className="font-mono">{formatUsd(disputedCents)}</span></p>
        </GlowCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {(!claim || stage === 0) && <button disabled={!isDan || busy || !ledger} onClick={openClaim} className="h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:opacity-50 disabled:shadow-none">Sign the terms and open</button>}
        {stage === 2 && claim && claim.funded < claim.claimAmount && <button disabled={!isDan || busy} onClick={fund} className="h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:opacity-50">Fund the claim</button>}
        {stage === 2 && claim && claim.funded >= claim.claimAmount && (<><button disabled={!isDan || busy} onClick={() => answer(false)} className="h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:opacity-50">Answer and pay the accepted part</button><button disabled={!isDan || busy} onClick={() => answer(true)} className="h-12 rounded-[12px] border border-ink/20 px-6 font-medium disabled:opacity-50">Send it from my wallet</button></>)}
        {stage === 3 && <a href={`/dispute/${v.slug}${ck.query ? "?" + ck.query : ""}`} className="inline-flex h-12 items-center rounded-[12px] bg-ink px-6 font-medium text-paper">Go to the dispute room</a>}
      </div>
      {busy && <p className="mt-4 text-sm" role="status">Waiting for your wallet or the chain…</p>}
      {msg && <div role="status" className={`mt-4 rounded-[10px] border p-3 text-sm ${msg.kind === "err" ? "border-flare text-flare-ink" : "border-ink/20"}`}>{msg.text} {msg.hash && <a className="underline" href={txUrl(msg.hash)} target="_blank" rel="noreferrer">View on Basescan</a>}</div>}
    </main>
  );
}

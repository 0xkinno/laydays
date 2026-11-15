"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useSignTypedData, useSwitchChain } from "wagmi";
import { useSearchParams } from "next/navigation";
import { baseSepolia } from "wagmi/chains";
import type { Hex } from "viem";
import { GlowCard } from "@/components/ui/GlowCard";
import { ledgerAbi, STAGES } from "@/lib/chain/abi";
import { txUrl } from "@/lib/chain/addresses";
import { settleTyped } from "@/lib/chain/eip712";
import { encode, explainError, viaRelayer } from "@/lib/chain/actions";
import { useClaimKey } from "@/lib/claimKey";
import { formatUsd } from "@/lib/laytime/money";
import { useRole } from "@/lib/useRole";
import type { VoyageProps } from "@/lib/voyageData";

interface Objection { interval_id: string; stance: string; their_reason: string }

export interface ReppoCard { id: string; score: number | null; route: string | null; decision?: string; confidence?: string; reason?: string }
export function DisputeView({ v, reppo }: { v: VoyageProps; reppo: ReppoCard | null }) {
  const { address } = useAccount();
  const role = useRole(address);
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const pub = usePublicClient({ chainId: baseSepolia.id });
  const { signTypedDataAsync } = useSignTypedData();
  const qs = useSearchParams();
  const ck = useClaimKey(v.slug, v.completionTs);
  const ledger = v.ledger as `0x${string}`;
  const [claim, setClaim] = useState<{ stage: number; funded: bigint; paid: bigint; refunded: bigint; amount: bigint } | null>(null);
  const [toOwner, setToOwner] = useState(0);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; hash?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("We accept most of this claim. Lines I21 and I22 are waiting for the surveyor's paperwork and we dispute those hours.");
  const [obj, setObj] = useState<{ objections?: Objection[]; instructionsFound?: string[]; error?: string } | null>(null);
  const pending = qs.get("sig"); const pendingBy = qs.get("by"); const pendingAmt = qs.get("amt"); const pendingDl = qs.get("dl");

  const refresh = useCallback(async () => {
    if (!pub || !ledger) return;
    try {
      const c = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "getClaim", args: [ck.voyageId] })) as unknown as { stage: number; funded: bigint; paidToOwner: bigint; refunded: bigint; claimAmount: bigint };
      setClaim({ stage: Number(c.stage), funded: c.funded, paid: c.paidToOwner, refunded: c.refunded, amount: c.claimAmount });
    } catch { setClaim(null); }
  }, [pub, ledger, ck.voyageId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const held = useMemo(() => (claim ? claim.funded - claim.paid - claim.refunded : 0n), [claim]);
  useEffect(() => { if (pendingAmt) setToOwner(Number(pendingAmt)); else setToOwner(Number(held / 2n)); }, [held, pendingAmt]);

  async function sign() {
    setBusy(true); setMsg(null);
    try {
      if (!pub || !address) throw new Error("Connect a wallet first");
      if (chainId !== baseSepolia.id) { switchChain({ chainId: baseSepolia.id }); throw new Error("Switching to Base Sepolia. Try again."); }
      const amt = pendingAmt ? BigInt(pendingAmt) : BigInt(toOwner);
      const deadline = pendingDl ? BigInt(pendingDl) : BigInt(Math.floor(Date.now() / 1000) + 3 * 86400);
      const nonce = (await pub.readContract({ address: ledger, abi: ledgerAbi, functionName: "nonces", args: [address] })) as bigint;
      const sig = await signTypedDataAsync(settleTyped(ledger, { voyageId: ck.voyageId, toOwner: amt, nonce, deadline }));
      if (!pending) {
        const me = role === "Owner" ? "owner" : "charterer";
        setMsg({ kind: "ok", text: `Signed as ${me}. Send this link to the other party.` });
        setLink(`${location.origin}/dispute/${v.slug}?${ck.query ? ck.query + "&" : ""}by=${me}&amt=${amt}&dl=${deadline}&sig=${sig}`);
      } else {
        const ownerSig = pendingBy === "owner" ? (pending as Hex) : sig;
        const chartSig = pendingBy === "owner" ? sig : (pending as Hex);
        const r = await viaRelayer(encode("settle", [ck.voyageId, amt, deadline, ownerSig, chartSig]));
        if (!r.ok) throw Object.assign(new Error(r.error), { shortMessage: r.error });
        setMsg({ kind: "ok", text: "Both signatures verified. The held funds moved as signed.", hash: r.hash });
        await refresh();
      }
    } catch (e) { setMsg({ kind: "err", text: explainError(e) }); } finally { setBusy(false); }
  }
  const [link, setLink] = useState<string | null>(null);

  async function readReply() {
    setObj(null);
    const r = await fetch("/api/counter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    setObj(await r.json());
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      <p className="tag text-ink-soft">The dispute room</p>
      <h1 className="display text-5xl sm:text-6xl">Held hours, two signatures</h1>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">The accepted part of the claim has already been paid. What is held moves only when both parties sign the same split. Ledger stage: <span className="font-mono">{claim ? STAGES[claim.stage] : "not opened"}</span>.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <GlowCard className="p-6">
          <p className="tag text-ink-soft">Held now</p>
          <p className="display mt-1 text-4xl">{formatUsd(held)}</p>
          <p className="text-xs text-ink-soft">{(Number(held) / 1e6).toFixed(6)} test USDC at testnet scale</p>
          <label htmlFor="split" className="mt-5 block text-sm">To the owner: <span className="font-mono">{formatUsd(BigInt(toOwner))}</span>, back to the charterer: <span className="font-mono">{formatUsd(held - BigInt(toOwner))}</span></label>
          <input id="split" type="range" min={0} max={Number(held)} step={1} value={toOwner} disabled={!!pendingAmt || held === 0n} onChange={(e) => setToOwner(Number(e.target.value))} className="mt-2 h-11 w-full accent-[#14160F]" />
          <button disabled={busy || !claim || claim.stage !== 3 || (role === null)} onClick={sign} className="mt-4 h-12 rounded-[12px] bg-signal px-6 font-medium shadow-[var(--glow)] disabled:opacity-50 disabled:shadow-none">{pending ? "Co-sign and settle" : "Sign this split"}</button>
          {claim && claim.stage !== 3 && <p className="mt-2 text-xs text-ink-soft">Nothing is held on this claim right now.</p>}
          {role === null && <p className="mt-2 text-xs text-ink-soft">Connect the owner or charterer wallet.</p>}
        </GlowCard>
        <GlowCard className="p-6">
          <p className="tag text-ink-soft">Counter Reader</p>
          <p className="mt-1 text-sm text-ink-soft">Paste the charterer's reply. SERV maps each objection to an interval. It never changes a ruling, and Prompt Guard stands in front of it.</p>
          <textarea value={email} onChange={(e) => setEmail(e.target.value)} rows={5} className="mt-3 w-full rounded-[12px] border hair bg-paper p-3 text-sm" />
          <button onClick={readReply} className="mt-2 h-11 rounded-[10px] border border-ink/20 px-4 text-sm">Read the reply</button>
          {obj?.error && <p className="mt-3 rounded-[10px] border border-flare p-2 text-xs text-flare-ink">{obj.error}</p>}
          {obj?.objections && <ul className="mt-3 space-y-1.5 text-sm">{obj.objections.map((o) => <li key={o.interval_id}><span className="font-mono text-xs">{o.interval_id}</span> {o.stance}: {o.their_reason}</li>)}</ul>}
        </GlowCard>
      </div>
      {link && <div className="mt-4 break-all rounded-[10px] border hair bg-paper p-3 font-mono text-xs">{link}</div>}
      {msg && <div role="status" className={`mt-4 rounded-[10px] border p-3 text-sm ${msg.kind === "err" ? "border-flare text-flare-ink" : "border-ink/20"}`}>{msg.text} {msg.hash && <a className="underline" href={txUrl(msg.hash)} target="_blank" rel="noreferrer">View on Basescan</a>}</div>}
      {reppo ? (
        <GlowCard className="mt-5 p-6">
          <p className="tag text-ink-soft">Reppo, an outside evaluator, advice only</p>
          <p className="display mt-1 text-3xl">Disputed ruling I02: {reppo.route} <span className="text-ink-soft">· score {reppo.score}</span></p>
          <p className="mt-2 text-sm text-ink-soft">{reppo.reason}</p>
          <p className="mt-2 font-mono text-[11px] text-ink-soft">evaluation {reppo.id} · de-identified before sending, because Reppo evaluations are public · the route never decides anything</p>
        </GlowCard>
      ) : <p className="mt-6 text-xs text-ink-soft">No Reppo evaluation has been recorded yet.</p>}
    </main>
  );
}

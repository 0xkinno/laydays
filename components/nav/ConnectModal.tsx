"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConnect, type Connector } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { ChevronRight, Loader2, ShieldCheck, X } from "lucide-react";

/** A wallet picker in the style of the familiar wallet kits: detected wallets with their own name and icon, then other ways to connect,
 *  a clear connecting state, and plain-language errors. Wallets are found through EIP-6963, so each one announces its own icon. */

function CoinbaseGlyph() {
  return (<svg viewBox="0 0 40 40" className="size-full" aria-hidden><rect width="40" height="40" rx="11" fill="#1652F0" /><circle cx="20" cy="20" r="9" fill="none" stroke="#fff" strokeWidth="3" /><rect x="16.5" y="16.5" width="7" height="7" rx="1.6" fill="#fff" /></svg>);
}
function WalletConnectGlyph() {
  return (<svg viewBox="0 0 40 40" className="size-full" aria-hidden><rect width="40" height="40" rx="11" fill="#3B99FC" /><path d="M11 17.2c5-4.9 13-4.9 18 0M14.6 20.8c3-2.9 7.8-2.9 10.8 0M18.2 24.4c1-1 2.6-1 3.6 0" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" /></svg>);
}
function BrowserGlyph() {
  return (<svg viewBox="0 0 40 40" className="size-full" aria-hidden><rect width="40" height="40" rx="11" fill="#14160F" /><rect x="9" y="12" width="22" height="16" rx="3" fill="none" stroke="#D7F34A" strokeWidth="2.2" /><path d="M9 17h22" stroke="#D7F34A" strokeWidth="2.2" /><circle cx="13" cy="14.5" r="1" fill="#D7F34A" /></svg>);
}

function friendly(e: unknown): string {
  const m = (e as Error)?.message ?? String(e);
  if (/reject|denied|cancel/i.test(m)) return "The request was closed in the wallet, so nothing was connected. Try again when you are ready.";
  if (/already pending|-32002/i.test(m)) return "The wallet already has a request open. Open it and confirm, or close it and try again.";
  if (/not found|provider|unsupported/i.test(m)) return "That wallet is not available in this browser. Pick another, or use WalletConnect with a phone wallet.";
  return `Could not connect: ${m.slice(0, 120)}`;
}

interface Row { key: string; connector: Connector; name: string; note: string; icon: React.ReactNode }

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connectAsync, isPending, variables, reset } = useConnect();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  const { installed, others } = useMemo(() => {
    const isNamed = (c: Connector) => !["injected", "coinbaseWalletSDK", "walletConnect"].includes(c.id) && !!c.name;
    const installed: Row[] = connectors.filter(isNamed).map((c) => ({
      key: c.uid, connector: c, name: c.name, note: "Detected in this browser",
      icon: c.icon ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.icon} alt="" className="size-full rounded-[11px] object-cover" /> : <BrowserGlyph />,
    }));
    const generic = connectors.find((c) => c.id === "injected");
    if (installed.length === 0 && generic) installed.push({ key: generic.uid, connector: generic, name: "Browser wallet", note: "Use the wallet extension in this browser", icon: <BrowserGlyph /> });
    const others: Row[] = [];
    const cb = connectors.find((c) => c.id === "coinbaseWalletSDK");
    if (cb) others.push({ key: cb.uid, connector: cb, name: "Coinbase Wallet", note: "App or browser extension", icon: <CoinbaseGlyph /> });
    const wc = connectors.find((c) => c.id === "walletConnect");
    if (wc) others.push({ key: wc.uid, connector: wc, name: "WalletConnect", note: "Scan a QR code with a phone wallet", icon: <WalletConnectGlyph /> });
    return { installed, others };
  }, [connectors]);

  useEffect(() => {
    if (!open) { setError(null); reset(); return; }
    const t = setTimeout(() => first.current?.focus(), 60);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open, onClose, reset]);

  async function pick(r: Row) {
    setError(null);
    try { await connectAsync({ connector: r.connector, chainId: baseSepolia.id }); onClose(); }
    catch (e) { setError(friendly(e)); }
  }
  const connectingUid = isPending ? (variables?.connector as Connector | undefined)?.uid : undefined;

  const list = (rows: Row[], firstRow = false) => rows.map((r, i) => {
    const busy = connectingUid === r.connector.uid;
    return (
      <li key={r.key}>
        <button ref={firstRow && i === 0 ? first : undefined} onClick={() => pick(r)} disabled={isPending} aria-label={`Connect ${r.name}`}
          className="group flex min-h-[64px] w-full items-center gap-3.5 rounded-[16px] border border-ink/10 bg-white/70 px-3.5 py-2.5 text-left transition hover:-translate-y-px hover:border-ink/25 hover:bg-white hover:shadow-[0_10px_30px_-16px_rgba(15,58,52,.5)] disabled:opacity-60">
          <span className="size-11 shrink-0 overflow-hidden rounded-[11px] shadow-sm ring-1 ring-ink/10">{r.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{r.name}</span>
            <span className="block truncate text-xs text-ink-soft">{busy ? "Confirm the request in your wallet" : r.note}</span>
          </span>
          {busy ? <Loader2 size={18} className="animate-spin text-ink-soft" /> : <ChevronRight size={18} className="text-ink-soft transition group-hover:translate-x-0.5" />}
        </button>
      </li>
    );
  });

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-ink/45 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div role="dialog" aria-modal="true" aria-label="Connect a wallet"
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[440px] overflow-hidden rounded-[26px] border border-ink/10 bg-paper shadow-[0_40px_120px_-30px_rgba(20,22,15,.55)]">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-72 rounded-full bg-signal/50 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4 px-6 pb-3 pt-6">
              <div>
                <p className="tag text-[11px] text-ink-soft">Laydays</p>
                <h2 className="display mt-0.5 text-[30px] leading-tight">Connect a wallet</h2>
                <p className="mt-1 max-w-[320px] text-[13px] leading-relaxed text-ink-soft">Your wallet signs every claim, so only you can move your money. Network: Base Sepolia, test funds.</p>
              </div>
              <button aria-label="Close" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-ink/10 bg-white/70 hover:bg-white"><X size={16} /></button>
            </div>
            <div className="relative max-h-[60vh] overflow-y-auto px-6 pb-2">
              <p className="tag mb-2 mt-2 text-[11px] text-ink-soft">{installed.length ? "Installed" : "Wallets"}</p>
              <ul className="space-y-2">{installed.length ? list(installed, true) : <li className="rounded-[14px] border border-dashed border-ink/20 p-3 text-sm text-ink-soft">No wallet extension was detected in this browser. Use one of the options below.</li>}</ul>
              <p className="tag mb-2 mt-5 text-[11px] text-ink-soft">Other ways to connect</p>
              <ul className="space-y-2">{list(others, installed.length === 0)}</ul>
              <AnimatePresence>{error && <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden rounded-[12px] border border-flare/50 bg-flare/10 px-3 py-2.5 text-[13px] text-flare-ink">{error}</motion.p>}</AnimatePresence>
            </div>
            <div className="relative mt-3 flex items-start gap-2.5 border-t border-ink/10 bg-paper-deep/70 px-6 py-4 text-xs leading-relaxed text-ink-soft">
              <ShieldCheck size={16} className="mt-px shrink-0 text-harbour" />
              <p>New to wallets? A wallet is an app that holds your keys and asks you to approve each signature. Laydays never sees your keys, and the relayer only pays gas.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

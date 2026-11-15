"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { Menu, Power, X } from "lucide-react";
import { useRole } from "@/lib/useRole";

const LINKS = [
  { href: "/desk", label: "Desk" },
  { href: "/proof", label: "Proof" },
  { href: "/break", label: "Break it" },
  { href: "/agents", label: "For agents" },
  { href: "/?tour=1&s=0", label: "Guided tour" },
];

export function CapsuleNav() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors, connect, isPending, error } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const role = useRole(address);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const wrong = isConnected && chainId !== baseSepolia.id;

  const connectBtn = (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-10 min-w-[44px] rounded-[10px] bg-signal px-4 text-sm font-medium text-ink shadow-[var(--glow)] hover:brightness-95">
        Connect wallet
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-64 rounded-[14px] border border-ink/10 bg-paper p-2 shadow-xl">
          {connectors.map((c) => (
            <button key={c.uid} role="menuitem" disabled={isPending} onClick={() => { connect({ connector: c, chainId: baseSepolia.id }); setOpen(false); }}
              className="flex h-11 w-full items-center rounded-[10px] px-3 text-left text-sm hover:bg-paper-deep">
              {c.name}
            </button>
          ))}
          {error && <p className="px-3 py-2 text-xs text-flare-ink">{error.message.slice(0, 120)}</p>}
        </div>
      )}
    </div>
  );

  return (
    <>
      <motion.nav
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="fixed left-1/2 top-4 z-50 flex h-14 w-[min(1120px,calc(100%-24px))] -translate-x-1/2 items-center justify-between rounded-[14px] border border-ink/10 bg-paper/70 px-3 backdrop-blur-xl"
        aria-label="Primary"
      >
        <Link href="/" className="flex min-h-[44px] items-center gap-2" aria-label="Laydays home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/mark.svg" alt="" width={30} height={30} />
          <span className="display text-xl">Laydays</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-[44px] items-center rounded-[10px] px-3 text-sm text-ink-soft hover:bg-paper-deep hover:text-ink">{l.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-[10px] border border-ink/10 px-2.5 py-1.5 font-mono text-xs text-ink-soft sm:inline">Base Sepolia</span>
          {wrong && (
            <button onClick={() => switchChain({ chainId: baseSepolia.id })} className="h-10 rounded-[10px] bg-flare px-3 text-sm font-medium text-paper">Switch network</button>
          )}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="rounded-[10px] border border-ink/10 px-3 py-1.5 font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}{role ? ` · ${role}` : ""}
              </span>
              <button aria-label="Disconnect wallet" onClick={() => disconnect()} className="grid size-10 place-items-center rounded-[10px] border border-ink/10 hover:shadow-[0_0_24px_rgba(215,243,74,.6)]">
                <Power size={16} />
              </button>
            </div>
          ) : connectBtn}
          <button aria-label="Open menu" onClick={() => setMenu(true)} className="grid size-10 place-items-center rounded-[10px] border border-ink/10 md:hidden"><Menu size={18} /></button>
        </div>
      </motion.nav>
      {menu && (
        <div className="fixed inset-0 z-[60] bg-paper p-6 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Close menu" onClick={() => setMenu(false)} className="absolute right-5 top-5 grid size-11 place-items-center rounded-[10px] border border-ink/10"><X size={18} /></button>
          <ul className="mt-20 space-y-2">
            {LINKS.map((l) => (
              <li key={l.href}><Link onClick={() => setMenu(false)} href={l.href} className="display block py-3 text-4xl">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

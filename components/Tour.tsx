"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

interface Step { route: string; sel: string; title: string; text: string }
const STEPS: Step[] = [
  { route: "/", sel: "#hero-card", title: "The moment", text: "Day 83 of 90. Meera's spreadsheet says $61,250. Laydays rules every hour of the wait and lands on $41,750, with a person deciding what it could not." },
  { route: "/voyage/orla-jansen", sel: "#tide", title: "The tide strip", text: "Every hour of the ship's wait. Filled counts, hatched is excepted, half-filled counts at half, dashed is the one the system refused to decide alone." },
  { route: "/voyage/orla-jansen", sel: "#ruling", title: "One ruling and its clause", text: "Three rulebooks, one clause, one verdict. Two rulebooks disagree about a fog closure, so code does not pick a winner." },
  { route: "/trace/I02", sel: "dl", title: "The trace", text: "The system's own account of the ruling: model, SERV request id, rulebook version, citation check." },
  { route: "/voyage/orla-jansen", sel: "#documents", title: "The documents and the dial", text: "Seven documents the time bar clause demands. The bills of lading are still in an email thread." },
  { route: "/voyage/orla-jansen", sel: "#present", title: "Sign and present", text: "Meera signs with her own wallet. The contract refuses a late claim and a claim with a document missing." },
  { route: "/proof", sel: "#onchain", title: "The undisputed part is paid", text: "Dan funded with a USDC authorization, accepted most of the claim, and the accepted part reached Meera at once. Every step is a Base Sepolia transaction." },
];

export function Tour() {
  const qs = useSearchParams();
  const router = useRouter();
  const on = qs.get("tour") === "1";
  const render = qs.get("render") === "1";
  const s = Math.min(STEPS.length - 1, Math.max(0, Number(qs.get("s") ?? 0)));
  const [rect, setRect] = useState<DOMRect | null>(null);

  const go = useCallback((n: number) => {
    const t = STEPS[Math.min(STEPS.length - 1, Math.max(0, n))];
    router.push(`${t.route}?tour=1&s=${n}${render ? "&render=1" : ""}`, { scroll: false });
  }, [router, render]);
  const close = useCallback(() => router.push(STEPS[s].route, { scroll: false }), [router, s]);

  useEffect(() => {
    if (!on) return;
    let tries = 0;
    const find = () => {
      const el = document.querySelector(STEPS[s].sel);
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => setRect(el.getBoundingClientRect()), 600); }
      else if (tries++ < 20) setTimeout(find, 250);
    };
    setRect(null);
    find();
    const re = () => { const el = document.querySelector(STEPS[s].sel); if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener("resize", re);
    return () => window.removeEventListener("resize", re);
  }, [on, s]);

  useEffect(() => {
    if (!on) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); if (s < STEPS.length - 1) go(s + 1); }
      if (e.key === "ArrowLeft") go(s - 1);
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [on, s, go, close]);

  useEffect(() => {
    if (!on || !render) return;
    if (s >= STEPS.length - 1) return;
    const t = setTimeout(() => go(s + 1), 7000);
    return () => clearTimeout(t);
  }, [on, render, s, go]);

  if (!on) return null;
  const pad = 14;
  const box = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="dialog" aria-label="Guided tour">
      {box && <div className="absolute rounded-[22px] border-2 border-signal transition-all duration-500" style={{ ...box, boxShadow: "0 0 0 9999px rgba(20,22,15,.62), 0 0 40px 4px rgba(215,243,74,.5)" }} />}
      {!box && <div className="absolute inset-0 bg-ink/60" />}
      <div className="pointer-events-auto absolute inset-x-4 bottom-6 mx-auto max-w-xl rounded-[20px] border border-paper/20 bg-ink p-5 text-paper shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="tag text-[11px] text-signal">Step {s + 1} of {STEPS.length}</span>
          {!render && <button aria-label="Close the tour" onClick={close} className="grid size-9 place-items-center rounded-[10px] border border-paper/20"><X size={15} /></button>}
        </div>
        <h2 className="display mt-1 text-3xl">{STEPS[s].title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-paper/80">{STEPS[s].text}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>{STEPS.map((_, i) => <span key={i} className={`h-1 w-7 rounded-full ${i <= s ? "bg-signal" : "bg-paper/25"}`} />)}</div>
          {!render && (
            <div className="flex gap-2">
              <button onClick={() => go(s - 1)} disabled={s === 0} aria-label="Previous step" className="grid size-11 place-items-center rounded-[12px] border border-paper/25 disabled:opacity-40"><ArrowLeft size={16} /></button>
              {s < STEPS.length - 1 ? <button onClick={() => go(s + 1)} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-signal px-4 text-sm font-medium text-ink">Next<ArrowRight size={15} /></button> : <button onClick={close} className="h-11 rounded-[12px] bg-signal px-4 text-sm font-medium text-ink">Done</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

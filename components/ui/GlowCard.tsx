"use client";
import { useRef } from "react";

export function GlowCard({ children, className = "", as: _as }: { children: React.ReactNode; className?: string; as?: string }) {
  void _as;
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty("--x", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={`group relative overflow-hidden rounded-[18px] border border-ink/10 bg-paper-deep transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--x) var(--y), rgba(215,243,74,.35), transparent 60%)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

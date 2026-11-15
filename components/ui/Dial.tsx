/** 90-tick dial. `day` ticks are filled in ink, the last seven ticks (84 to 90) are flare. */
export function Dial({ day, size = 120, label = true }: { day: number; size?: number; label?: boolean }) {
  const cx = 60, cy = 60;
  const ticks = Array.from({ length: 90 }, (_, i) => {
    const n = i + 1;
    const a = (-90 + ((n - 1) * 360) / 90) * (Math.PI / 180);
    const major = n % 10 === 0;
    const r1 = 46, r2 = major ? 57 : 53;
    const used = n <= day;
    const flare = n >= 84;
    return (
      <line
        key={n}
        x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}
        stroke={flare ? "var(--color-flare)" : "var(--color-ink)"}
        strokeOpacity={used || flare ? (flare && !used ? 0.5 : 1) : 0.18}
        strokeWidth={flare ? 1.6 : 1.1} strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
    );
  });
  const left = Math.max(0, 90 - day);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Day ${day} of 90, ${left} days left`}>
      {ticks}
      {label && (
        <>
          <text x="60" y="64" textAnchor="middle" className="display" style={{ fontSize: 30 }} fill={left <= 10 ? "var(--color-flare)" : "var(--color-ink)"}>{left}</text>
          <text x="60" y="80" textAnchor="middle" style={{ fontSize: 7, letterSpacing: "0.14em" }} fill="var(--color-ink-soft)">DAYS LEFT</text>
        </>
      )}
    </svg>
  );
}

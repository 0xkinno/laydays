/** Round half up: floor((2n + d) / (2d)) for non-negative n, positive d. */
export function divRoundHalfUp(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new Error("divisor must be positive");
  if (n < 0n) throw new Error("negative amounts are not supported");
  return (2n * n + d) / (2n * d);
}

/** cents = rate_cents_per_day * minutes / 1440, rounded half up to the cent. Works on half minutes. */
export function centsForHalfMinutes(rateCentsPerDay: bigint, halfMinutes: number): bigint {
  return divRoundHalfUp(rateCentsPerDay * BigInt(halfMinutes), 2880n);
}

export function formatUsd(cents: bigint): string {
  const neg = cents < 0n;
  const v = neg ? -cents : cents;
  const whole = (v / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (v % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

export function formatDhm(minutes: number): string {
  const m = Math.round(minutes);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(mm).padStart(2, "0")}m`;
}

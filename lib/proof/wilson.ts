/** Wilson score interval for a proportion, z = 1.96 (95%). Returns fractions in [0, 1]. */
export function wilson(k: number, n: number, z = 1.959964): { lo: number; hi: number; p: number } {
  if (n === 0) return { lo: 0, hi: 1, p: 0 };
  const p = k / n, z2 = z * z, d = 1 + z2 / n;
  const c = (p + z2 / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / d;
  return { lo: Math.max(0, c - h), hi: Math.min(1, c + h), p };
}
export const fmtWilson = (k: number, n: number) => { const w = wilson(k, n); return `${k} of ${n}, interval ${Math.round(w.lo * 100)}% to ${Math.round(w.hi * 100)}%`; };

/** Public lock (Part 8.6). In-memory per instance: a best-effort cap, with the global kill switch and daily dollar budget. */
const perIp = new Map<string, number[]>();
let spend = { day: "", usd: 0 };

export function liveEnabled() { return process.env.LAYDAYS_LIVE !== "0"; }

export function checkVisitor(ip: string, perHour = 3): { ok: boolean; reason?: string } {
  if (!liveEnabled()) return { ok: false, reason: "Live runs are switched off right now. The recorded run is still available." };
  const day = new Date().toISOString().slice(0, 10);
  if (spend.day !== day) spend = { day, usd: 0 };
  const budget = Number(process.env.LAYDAYS_DAILY_SERV_USD ?? "2");
  if (spend.usd >= budget) return { ok: false, reason: "Today's SERV budget is used up. The recorded run is still available." };
  const now = Date.now();
  const hits = (perIp.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (hits.length >= perHour) return { ok: false, reason: `Limit of ${perHour} live rulings an hour reached.` };
  hits.push(now);
  perIp.set(ip, hits);
  return { ok: true };
}
export function addSpend(usd: number) { spend.usd += usd; }

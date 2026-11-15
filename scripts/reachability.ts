import { mkdirSync, writeFileSync } from "node:fs";
// Curls every public route of a deployment and records the status. Usage: BASE=https://laydays.vercel.app npx tsx scripts/reachability.ts
const base = process.env.BASE ?? "https://laydays.vercel.app";
const routes = ["/", "/desk", "/voyage/orla-jansen", "/voyage/orla-jansen/charterer", "/voyage/new", "/dispute/orla-jansen", "/trace/I02", "/proof", "/break", "/judge", "/register", "/agents", "/api/status", "/api/stats", "/art/hero-tanker.svg", "/art/mark.svg"];
const out: { route: string; status: number; ms: number }[] = [];
for (const r of routes) {
  const t0 = Date.now();
  const res = await fetch(base + r).catch(() => null);
  out.push({ route: r, status: res?.status ?? 0, ms: Date.now() - t0 });
}
const x402 = await fetch(`${base}/api/x402/ruling`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
out.push({ route: "POST /api/x402/ruling (expects 402)", status: x402.status, ms: 0 });
mkdirSync("proof/runs", { recursive: true });
writeFileSync("proof/runs/reachability.json", JSON.stringify({ at: new Date().toISOString(), base, results: out }, null, 2));
const bad = out.filter((o) => !(o.status === 200 || o.route.includes("402") && o.status === 402));
console.log(out.map((o) => `${o.status} ${o.route}`).join("\n"));
console.log(bad.length ? `${bad.length} unreachable` : "all routes reachable");
process.exit(bad.length ? 1 : 0);

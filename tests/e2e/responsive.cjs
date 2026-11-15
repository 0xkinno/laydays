// Responsive, console, overlap and accessibility sweep. Run: BASE=http://localhost:3100 node tests/e2e/responsive.cjs
const { chromium } = require("playwright");
const fs = require("node:fs");
const base = process.env.BASE || "http://localhost:3100";
const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const VIEWPORTS = [[360, 780], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
const ROUTES = ["/", "/desk", "/voyage/orla-jansen", "/voyage/orla-jansen/charterer", "/dispute/orla-jansen", "/trace/I02", "/proof", "/break", "/judge", "/register", "/agents", "/voyage/new"];
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const report = [];
  for (const [w, h] of VIEWPORTS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|404|WalletConnect|relay|CORS|net::/i.test(m.text())) errs.push(m.text().slice(0, 140)); });
    p.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
    for (const r of ROUTES) {
      await p.goto(base + r, { waitUntil: "load", timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(w === 1440 ? 1800 : 900);
      const m = await p.evaluate(() => {
        const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
        const small = [...document.querySelectorAll("a,button,input,select,textarea,[role=button]")].filter((e) => {
          const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          const inline = e.tagName === "A" && e.closest("p,li,td,dd,dt,h1,h2,h3,blockquote,footer,span");
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && (r.height < 40 || r.width < 40) && !e.closest("[aria-hidden=true]") && !inline;
        }).length;
        return { overflow: sw - cw, small };
      });
      report.push({ w, route: r, ...m });
    }
    report.push({ w, route: "console", errors: errs.slice(0, 5) });
    await ctx.close();
  }
  const axeOut = [];
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    for (const r of ["/", "/voyage/orla-jansen", "/proof", "/break", "/agents", "/desk"]) {
      await p.goto(base + r, { waitUntil: "load", timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(r === "/" ? 4000 : 1500);
      await p.addScriptTag({ content: axeSrc });
      const res = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0].target.join(" ").slice(0, 80) })));
      axeOut.push({ w, route: r, violations: res });
    }
  }
  fs.mkdirSync("proof/runs", { recursive: true });
  fs.writeFileSync("proof/runs/responsive-axe.json", JSON.stringify({ at: new Date().toISOString(), report, axe: axeOut }, null, 1));
  const overflow = report.filter((x) => x.overflow > 1);
  console.log("horizontal overflow:", overflow.length ? JSON.stringify(overflow.slice(0, 8)) : "none");
  console.log("console errors:", JSON.stringify(report.filter((x) => x.route === "console" && x.errors.length).slice(0, 3)));
  const small = report.filter((x) => x.small > 0);
  console.log("route/viewport pairs with small tap targets:", small.length, JSON.stringify(small.slice(0, 5)));
  for (const a of axeOut) if (a.violations.length) console.log("axe", a.w, a.route, JSON.stringify(a.violations));
  await b.close();
})();

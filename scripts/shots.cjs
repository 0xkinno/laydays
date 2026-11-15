const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:3100";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); }); p.on("pageerror", (e) => errs.push(String(e)));
  const go = async (path, name, wait = 2500, scroll = 0) => { await p.goto(base + path, { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(wait); if (scroll) { await p.evaluate((y) => window.scrollTo(0, y), scroll); await p.waitForTimeout(1500); } await p.screenshot({ path: `docs/screenshots/${name}.png` }); };
  await go("/", "landing", 4500);
  await go("/", "ruling", 1500, 3150);
  await go("/", "bento", 1500, 4250);
  await go("/voyage/orla-jansen", "voyage", 2500);
  await go("/trace/I02", "trace", 1500);
  await go("/proof", "proof", 2000);
  await go("/break", "break", 2000);
  await go("/desk", "desk", 1500);
  console.log("console errors:", errs.slice(0, 5));
  await b.close();
})();

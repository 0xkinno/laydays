// Records the guided tour in render mode as the base of the demo video. Run: BASE=https://laydays.vercel.app node scripts/record-tour.cjs
const { chromium } = require("playwright");
const fs = require("node:fs");
const base = process.env.BASE || "http://localhost:3100";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: "docs/video", size: { width: 1440, height: 900 } } });
  const p = await ctx.newPage();
  await p.goto(`${base}/`, { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(6000); // hero motion
  await p.goto(`${base}/?tour=1&s=0&render=1`, { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(7 * 7500 + 3000); // seven steps, seven seconds each
  const v = p.video();
  await ctx.close();
  const path = await v.path();
  fs.renameSync(path, "docs/video/tour.webm");
  await b.close();
  console.log("saved docs/video/tour.webm");
})();

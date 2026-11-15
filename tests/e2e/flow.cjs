// Two-wallet end-to-end flow in Chromium with injected test wallets (testnet keys from .env.local).
// Owner and charterer sign in their own browser contexts. Run: BASE=http://localhost:3100 node tests/e2e/flow.cjs
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const base = process.env.BASE || "http://localhost:3100";
const CHAIN = "0x14a34";

async function wallets() {
  const { privateKeyToAccount } = await import("viem/accounts");
  return { owner: privateKeyToAccount(process.env.E2E_OWNER_KEY), dan: privateKeyToAccount(process.env.E2E_CHARTERER_KEY) };
}

function coerce(types, typeName, value) {
  const out = {};
  for (const f of types[typeName]) {
    const v = value[f.name];
    if (types[f.type]) out[f.name] = coerce(types, f.type, v);
    else if (/^u?int/.test(f.type)) out[f.name] = BigInt(v);
    else out[f.name] = v;
  }
  return out;
}

async function newWalletPage(browser, account) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.exposeFunction("__e2e", async (method, params) => {
    if (method === "eth_requestAccounts" || method === "eth_accounts") return [account.address];
    if (method === "eth_chainId") return CHAIN;
    if (method === "net_version") return "84532";
    if (method === "wallet_switchEthereumChain") return null;
    if (method === "personal_sign") return account.signMessage({ message: { raw: params[0] } });
    if (method === "eth_signTypedData_v4") {
      const td = JSON.parse(params[1]);
      const { EIP712Domain, ...types } = td.types; void EIP712Domain;
      return account.signTypedData({ domain: td.domain, types, primaryType: td.primaryType, message: coerce(types, td.primaryType, td.message) });
    }
    throw new Error(`unsupported wallet method ${method}`);
  });
  await page.addInitScript(() => {
    const provider = { isMetaMask: false, request: ({ method, params }) => window.__e2e(method, params ?? []), on() {}, removeListener() {} };
    window.ethereum = provider;
    const icon = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#0F3A34"/><path d="M8 24q6-9 12 0t12 0" fill="none" stroke="#D7F34A" stroke-width="3" stroke-linecap="round"/></svg>');
    const info = { uuid: "7f1d3a52-laydays-test-wallet", name: "Laydays test wallet", icon, rdns: "app.laydays.testwallet" };
    const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
    window.addEventListener("eip6963:requestProvider", announce);
    announce();
  });
  return { ctx, page, errors };
}

async function connect(page) {
  const disc = page.getByRole("button", { name: "Disconnect wallet" });
  for (let i = 0; i < 4; i++) {
    if (await disc.isVisible().catch(() => false)) return;
    await page.waitForTimeout(1500); // let wagmi finish its own reconnect before clicking
    if (await disc.isVisible().catch(() => false)) return;
    await page.getByRole("button", { name: "Connect wallet" }).click({ timeout: 8000 }).catch(() => {});
    await page.getByRole("button", { name: /Connect Laydays test wallet|Connect Browser wallet/ }).first().click({ timeout: 8000 }).catch(() => {});
    await disc.waitFor({ timeout: 8000 }).catch(() => {});
  }
  await disc.waitFor({ timeout: 5000 });
}

const log = [];
const step = (s) => { log.push(s); console.log("ok:", s); };

(async () => {
  const { owner, dan } = await wallets();
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const now = Math.floor(Date.now() / 1000);
  const q = `c=${now}&t=${now - 83 * 86400}`;
  const A = await newWalletPage(browser, owner), B = await newWalletPage(browser, dan);
  try {
    // Meera: connect, rule the open interval herself, attach the bills of lading, sign the terms.
    await A.page.goto(`${base}/voyage/orla-jansen?${q}`, { waitUntil: "load" });
    await connect(A.page); step("owner connected, role shown");
    await A.page.getByRole("button", { name: /I02, .* review/ }).click();
    await A.page.getByRole("button", { name: "excepted", exact: true }).click();
    await A.page.getByRole("button", { name: "Attach from the email thread" }).click();
    step("owner ruled the open interval and attached the bills of lading");
    await A.page.getByRole("button", { name: "Sign the terms first" }).click();
    const linkBox = A.page.locator("div.break-all", { hasText: "/charterer?" });
    await linkBox.waitFor({ timeout: 30000 });
    const link = (await linkBox.textContent()).trim();
    step("owner signed the terms and produced the charterer link");

    // Dan: open the link, connect, sign, open the claim.
    await B.page.goto(link, { waitUntil: "load" });
    await connect(B.page);
    await B.page.getByRole("button", { name: "Sign the terms and open" }).click();
    await B.page.getByText("The claim is open.").waitFor({ timeout: 90000 });
    step("charterer signed the terms and the claim opened onchain");

    // Meera presents.
    await A.page.reload({ waitUntil: "load" });
    await connect(A.page);
    await A.page.getByRole("button", { name: /I02, .* review/ }).click();
    await A.page.getByRole("button", { name: "excepted", exact: true }).click();
    await A.page.getByRole("button", { name: "Attach from the email thread" }).click();
    await A.page.getByRole("button", { name: "Sign and present", exact: true }).click();
    await A.page.getByText("Presented onchain.").waitFor({ timeout: 90000 });
    step("owner presented the complete claim onchain through the relayer");

    // Dan funds and answers, disputing the last two lines.
    await B.page.goto(`${base}/voyage/orla-jansen/charterer?${q}`, { waitUntil: "load" });
    await connect(B.page);
    await B.page.getByRole("button", { name: "Fund the claim" }).click();
    await B.page.getByText("Funded with a USDC authorization").waitFor({ timeout: 90000 });
    step("charterer funded with a USDC authorization");
    const toggles = B.page.getByRole("button", { name: "Accepted", exact: true });
    const n = await toggles.count();
    await toggles.nth(n - 1).click(); await toggles.nth(n - 2).click();
    await B.page.getByRole("button", { name: "Answer and pay the accepted part" }).click();
    await B.page.getByText(/accepted and paid to the owner now/).waitFor({ timeout: 90000 });
    step("charterer answered, the accepted part was paid to the owner");

    // Settlement by two signatures.
    await A.page.goto(`${base}/dispute/orla-jansen?${q}`, { waitUntil: "load" });
    await connect(A.page);
    await A.page.getByRole("button", { name: "Sign this split" }).click();
    const sLink = A.page.locator("div.break-all", { hasText: "by=owner" });
    await sLink.waitFor({ timeout: 30000 });
    const slink = (await sLink.textContent()).trim();
    await B.page.goto(slink, { waitUntil: "load" });
    await connect(B.page);
    await B.page.getByRole("button", { name: "Co-sign and settle" }).click();
    await B.page.getByText("Both signatures verified").waitFor({ timeout: 90000 });
    step("both parties signed the settlement and the held funds moved");
    console.log("E2E PASSED", log.length, "steps");
    fs.mkdirSync("proof/runs", { recursive: true });
    fs.writeFileSync("proof/runs/e2e-flow.json", JSON.stringify({ at: new Date().toISOString(), base, passed: true, steps: log, pageErrors: [...A.errors, ...B.errors] }, null, 2));
  } catch (e) {
    console.error("E2E FAILED after", log.length, "steps:", String(e).slice(0, 300));
    console.error("owner page reasons:", JSON.stringify(await A.page.locator("li", { hasText: "Waiting:" }).allTextContents().catch(() => [])), "charterer:", JSON.stringify(await B.page.locator("p", { hasText: "Connect the charterer" }).allTextContents().catch(() => [])));
    await A.page.screenshot({ path: "docs/screenshots/e2e-fail-owner.png" }).catch(() => {});
    await B.page.screenshot({ path: "docs/screenshots/e2e-fail-charterer.png" }).catch(() => {});
    fs.writeFileSync("proof/runs/e2e-flow.json", JSON.stringify({ at: new Date().toISOString(), base, passed: false, steps: log, error: String(e).slice(0, 400) }, null, 2));
    process.exitCode = 1;
  } finally { await browser.close(); }
})();

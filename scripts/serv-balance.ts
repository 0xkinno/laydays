import { loadEnv } from "./chain-env";
import { servPost } from "../lib/serv/client";
loadEnv();
/** Reads the remaining credit without spending it: a request that asks for a huge completion is refused, and the refusal names the balance. */
export async function balance(): Promise<number | null> {
  const r = await servPost("/chat/completions", { model: "gpt-6.1-sol", messages: [{ role: "system", content: "s" }, { role: "user", content: "x" }], max_completion_tokens: 120000 }, 30000);
  const m = /balance of \$([0-9.]+)/.exec(JSON.stringify(r.json ?? r.text));
  return m ? Number(m[1]) : null;
}
if (process.argv[1]?.endsWith("serv-balance.ts")) console.log("balance", await balance());

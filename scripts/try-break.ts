import { loadEnv } from "./chain-env";
loadEnv();
const { POST } = await import("../app/api/break/route");
for (const mode of ["clause-reader:count-everything", "clause-reader:invent-clause", "port-clerk:obey-remarks", "writer:invent-number"]) {
  const r = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode }) }));
  console.log(mode, JSON.stringify(await r.json()).slice(0, 500));
}

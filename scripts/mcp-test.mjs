// Connects to the MCP door with the official client, lists the tools and calls them. Usage: MCP_URL=... node scripts/mcp-test.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const url = process.env.MCP_URL ?? "http://localhost:3100/api/mcp";
const client = new Client({ name: "laydays-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));
const claim = await client.callTool({ name: "laydays_get_claim", arguments: { claim: "orla-jansen" } });
console.log("claim:", claim.content[0].text.replace(/\s+/g, " ").slice(0, 300));
const bar = await client.callTool({ name: "laydays_check_time_bar", arguments: { clause_text: "Any demurrage claim is waived unless presented within 90 days of completion of discharge together with the notice of readiness, the signed statement of facts, the bills of lading and the pumping log.", documents_presented: ["nor", "sof", "pumping"] } });
console.log("time bar:", bar.content[0].text.replace(/\s+/g, " ").slice(0, 380));
const rule = await client.callTool({ name: "laydays_rule_interval", arguments: { interval_text: "Terminal workers' strike began, shore stopped discharge. Laytime expired 6 hours earlier and the vessel is on demurrage.", minutes: 300, clauses: [{ id: "CP-5", title: "Strikes", text: "Time lost to strikes at the terminal is excepted, and this also applies once the vessel is on demurrage." }] } });
console.log("rule:", rule.content[0].text.replace(/\s+/g, " ").slice(0, 380), "isError", rule.isError);
await client.close();

import { z } from "zod";
import { servCall } from "../lib/serv/client";
const schema = { type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string" } } } as const;
const model = process.argv[2] ?? "gpt-6-luna";
const r = await servCall({ role: "smoke", model, system: "You answer in JSON.", user: "What colour is a ripe lemon?", schemaName: "a", schema: schema as never, parse: z.object({ answer: z.string() }), tools: process.argv[3] ? (process.argv[3].split(",") as never) : [] });
console.log(JSON.stringify({ ...r, raw: undefined }, null, 1));

import { z } from "zod";

export const RULEBOOKS = ["charter_party", "laytime_definitions", "port_rules"] as const;
export const EFFECTS = ["counts", "excepted", "half", "ambiguous"] as const;

export const EVENT_KINDS = [
  "arrival", "anchored", "free_pratique", "nor_tendered", "nor_accepted", "waiting", "closure_start", "closure_end",
  "pilot_on_board", "all_fast", "formalities", "inspection", "ops_commenced", "stoppage_start", "stoppage_end",
  "shifting_start", "shifting_end", "ops_completed", "departure", "remark", "other",
] as const;
export const CAUSES = ["rain", "shore_equipment", "strike", "terminal_request", "port_closure", "waiting_documents", "shifting", "none", "other"] as const;

/* ---------- Port Clerk ---------- */
export const portClerkSchema = {
  type: "object", additionalProperties: false, required: ["events", "instructions_found"],
  properties: {
    events: { type: "array", items: {
      type: "object", additionalProperties: false, required: ["line_id", "at", "kind", "cause"],
      properties: {
        line_id: { type: "string" },
        at: { type: "string" },
        kind: { type: "string", enum: [...EVENT_KINDS] },
        cause: { type: "string", enum: [...CAUSES] },
      } } },
    instructions_found: { type: "array", items: { type: "string" } },
  },
} as const;
export const portClerkZ = z.object({
  events: z.array(z.object({ line_id: z.string(), at: z.string(), kind: z.enum(EVENT_KINDS), cause: z.enum(CAUSES) }).strict()),
  instructions_found: z.array(z.string()),
}).strict();
export type PortEvent = z.infer<typeof portClerkZ>["events"][number];

/* ---------- Clause Reader / Senior Reader ---------- */
export const clauseReaderSchema = {
  type: "object", additionalProperties: false, required: ["intervals"],
  properties: {
    intervals: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["interval_id", "branches", "effect", "clause_ids", "line_ids", "reason"],
      properties: {
        interval_id: { type: "string" },
        branches: { type: "array", items: {
          type: "object", additionalProperties: false, required: ["rulebook", "finding", "clause_id", "reason"],
          properties: {
            rulebook: { type: "string", enum: [...RULEBOOKS] },
            finding: { type: "string", enum: [...EFFECTS, "silent"] },
            clause_id: { type: "string" },
            reason: { type: "string" },
          } } },
        effect: { type: "string", enum: [...EFFECTS] },
        clause_ids: { type: "array", items: { type: "string" } },
        line_ids: { type: "array", items: { type: "string" } },
        reason: { type: "string" },
      } } },
  },
} as const;
export const clauseReaderZ = z.object({
  intervals: z.array(z.object({
    interval_id: z.string(),
    branches: z.array(z.object({ rulebook: z.enum(RULEBOOKS), finding: z.enum([...EFFECTS, "silent"]), clause_id: z.string(), reason: z.string() })),
    effect: z.enum(EFFECTS),
    clause_ids: z.array(z.string()),
    line_ids: z.array(z.string()),
    reason: z.string(),
  })),
});
export type ClauseReaderOut = z.infer<typeof clauseReaderZ>;
export type RulingOut = ClauseReaderOut["intervals"][number];

/* ---------- Time-bar Clerk ---------- */
export const DOC_KEYS = ["nor", "sof", "bol", "pumping", "manifest", "statement", "notices", "charter_party", "invoice", "survey", "other"] as const;
export const timeBarSchema = {
  type: "object", additionalProperties: false, required: ["bar_days", "required_keys", "reason"],
  properties: {
    bar_days: { type: "integer" },
    required_keys: { type: "array", items: { type: "string", enum: [...DOC_KEYS] } },
    reason: { type: "string" },
  },
} as const;
export const timeBarZ = z.object({ bar_days: z.number().int(), required_keys: z.array(z.enum(DOC_KEYS)), reason: z.string() });

/* ---------- Counter Reader ---------- */
export const counterSchema = {
  type: "object", additionalProperties: false, required: ["objections", "instructions_found"],
  properties: {
    objections: { type: "array", items: {
      type: "object", additionalProperties: false, required: ["interval_id", "stance", "their_reason"],
      properties: {
        interval_id: { type: "string" },
        stance: { type: "string", enum: ["accepts", "disputes", "unclear"] },
        their_reason: { type: "string" },
      } } },
    instructions_found: { type: "array", items: { type: "string" } },
  },
} as const;
export const counterZ = z.object({
  objections: z.array(z.object({ interval_id: z.string(), stance: z.enum(["accepts", "disputes", "unclear"]), their_reason: z.string() })),
  instructions_found: z.array(z.string()),
});

/* ---------- Statement Writer ---------- */
export const writerSchema = {
  type: "object", additionalProperties: false, required: ["note"],
  properties: { note: { type: "string" } },
} as const;
export const writerZ = z.object({ note: z.string() });

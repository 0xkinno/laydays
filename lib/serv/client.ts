import { createHash } from "node:crypto";
import { z } from "zod";
import { costUsd } from "./models";
import { recordRun } from "../store/runs";

const BASE = process.env.SERV_BASE_URL ?? "https://inference-api.openserv.ai/v1";

export type ServTool = "prompt_guard" | "shadow_agent" | "disable_content_filter";

export interface ServCall<T> {
  role: string;
  model: string;
  /** Always present. Stable text so Multipath compiles one graph per rulebook version. */
  system: string;
  /** Per-voyage data. */
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  parse: z.ZodType<T>;
  tools?: ServTool[];
  shadowHint?: string;
  shadowMaxIterations?: number;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
}

export interface ServResult<T> {
  ok: boolean;
  value?: T;
  refusedBy?: "prompt_guard" | "content_filter" | "model";
  error?: string;
  httpStatus?: number;
  model: string;
  requestId: string | null;
  latencyMs: number;
  usage: { prompt: number; completion: number; cached?: number; reasoning?: number };
  costUsd: number;
  systemPromptSha256: string;
  finishReason?: string;
  raw?: unknown;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function toolsFor(c: Pick<ServCall<unknown>, "tools" | "shadowHint" | "shadowMaxIterations">) {
  const t: unknown[] = [];
  if (c.tools?.includes("prompt_guard")) t.push({ type: "function", function: { name: "serv_prompt_guard" } });
  if (c.tools?.includes("disable_content_filter")) t.push({ type: "function", function: { name: "serv_disable_content_filter" } });
  if (c.tools?.includes("shadow_agent")) {
    t.push({
      type: "function",
      function: {
        name: "serv_shadow_agent",
        parameters: {
          type: "object",
          properties: {
            hint: { type: "string", default: c.shadowHint ?? "" },
            max_iterations: { type: "integer", default: c.shadowMaxIterations ?? 2 },
          },
        },
      },
    });
  }
  return t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function apiKey(): string {
  const k = process.env.SERV_API_KEY;
  if (!k) throw new Error("SERV_API_KEY is not set");
  return k;
}

/** Low-level POST with the retry policy: 429 honours Retry-After, 5xx and network twice, 400 never, 401 halts. */
export async function servPost(path: string, body: unknown, timeoutMs: number) {
  let attempt = 0;
  for (;;) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey()}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      const requestId = res.headers.get("x-openserv-request-id");
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* keep text */ }
      if (res.status === 401) throw new Error("SERV rejected the API key (401). Halting.");
      if (res.status === 429 && attempt < 3) {
        const ra = Number(res.headers.get("retry-after") ?? "2");
        await sleep(Math.min(30, Math.max(1, ra)) * 1000);
        attempt++;
        continue;
      }
      if (res.status >= 500 && attempt < 2) {
        await sleep(1500 * (attempt + 1));
        attempt++;
        continue;
      }
      return { status: res.status, requestId, json, text };
    } catch (e) {
      if ((e as Error).message.includes("401")) throw e;
      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
        attempt++;
        continue;
      }
      return { status: 0, requestId: null as string | null, json: null, text: (e as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
}

interface Choice {
  finish_reason?: string;
  message?: { content?: string | null; refusal?: string | null };
}

export async function servCall<T>(c: ServCall<T>): Promise<ServResult<T>> {
  const t0 = Date.now();
  const systemPromptSha256 = sha256(c.system);
  const multi = /multipath|kronos/.test(c.model);
  const body: Record<string, unknown> = {
    model: c.model,
    messages: [
      { role: "system", content: c.system },
      { role: "user", content: c.user },
    ],
    response_format: { type: "json_schema", json_schema: { name: c.schemaName, strict: true, schema: c.schema } },
    max_completion_tokens: c.maxTokens ?? 4000,
  };
  if (c.effort) body.reasoning_effort = c.effort;
  const tools = toolsFor(c);
  if (tools.length) body.tools = tools;

  const r = await servPost("/chat/completions", body, c.timeoutMs ?? (multi ? 180_000 : 60_000));
  const j = r.json as { choices?: Choice[]; usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number }; completion_tokens_details?: { reasoning_tokens?: number } }; error?: { message?: string } } | null;
  const usage = {
    prompt: j?.usage?.prompt_tokens ?? 0,
    completion: j?.usage?.completion_tokens ?? 0,
    cached: j?.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    reasoning: j?.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
  };
  const base: ServResult<T> = {
    ok: false,
    model: c.model,
    requestId: r.requestId,
    latencyMs: Date.now() - t0,
    usage,
    costUsd: costUsd(c.model, usage.prompt, usage.completion),
    systemPromptSha256,
  };
  const finish = (res: ServResult<T>): ServResult<T> => {
    void recordRun({ role: c.role, model: res.model, features: c.tools ?? [], sha: res.systemPromptSha256, usage: res.usage, latencyMs: res.latencyMs, costUsd: res.costUsd, requestId: res.requestId, ok: res.ok, refusedBy: res.refusedBy ?? null, error: res.error ?? null });
    return res;
  };

  if (r.status !== 200 || !j) {
    return finish({ ...base, httpStatus: r.status, error: j?.error?.message ?? r.text.slice(0, 300) });
  }
  const ch = j.choices?.[0];
  base.finishReason = ch?.finish_reason;
  const noTokens = usage.prompt === 0 && usage.completion === 0;
  if (ch?.finish_reason === "content_filter" || (ch?.message?.refusal && noTokens)) {
    return finish({ ...base, httpStatus: 200, refusedBy: c.tools?.includes("prompt_guard") ? "prompt_guard" : "content_filter", error: ch?.message?.refusal ?? "content_filter" });
  }
  if (ch?.message?.refusal) return finish({ ...base, httpStatus: 200, refusedBy: "model", error: ch.message.refusal });
  const content = ch?.message?.content;
  if (!content) return finish({ ...base, httpStatus: 200, error: `empty content (finish_reason ${ch?.finish_reason})` });
  try {
    const value = c.parse.parse(JSON.parse(content));
    return finish({ ...base, ok: true, httpStatus: 200, value });
  } catch (e) {
    return finish({ ...base, httpStatus: 200, error: `schema validation failed: ${(e as Error).message.slice(0, 300)}` });
  }
}

export interface ResponsesResult {
  ok: boolean;
  text?: string;
  summaries: string[];
  requestId: string | null;
  latencyMs: number;
  usage: { prompt: number; completion: number };
  costUsd: number;
  error?: string;
  httpStatus: number;
}

/** POST /v1/responses with reasoning summaries, used for /trace. */
export async function servResponses(args: { model: string; system: string; user: string; effort?: "low" | "medium" | "high"; maxTokens?: number; schemaName?: string; schema?: Record<string, unknown>; timeoutMs?: number }): Promise<ResponsesResult> {
  const t0 = Date.now();
  const body: Record<string, unknown> = {
    model: args.model,
    instructions: args.system,
    input: args.user,
    reasoning: { effort: args.effort ?? "low", summary: "auto" },
    max_output_tokens: args.maxTokens ?? 4000,
  };
  if (args.schema) body.text = { format: { type: "json_schema", name: args.schemaName ?? "out", strict: true, schema: args.schema } };
  const r = await servPost("/responses", body, args.timeoutMs ?? 180_000);
  const j = r.json as { output?: Array<{ type: string; summary?: Array<{ text?: string }>; content?: Array<{ type: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number }; error?: { message?: string } } | null;
  const summaries: string[] = [];
  let text = "";
  for (const o of j?.output ?? []) {
    if (o.type === "reasoning") for (const s of o.summary ?? []) if (s.text) summaries.push(s.text);
    if (o.type === "message") for (const p of o.content ?? []) if (p.type === "output_text" && p.text) text += p.text;
  }
  const usage = { prompt: j?.usage?.input_tokens ?? 0, completion: j?.usage?.output_tokens ?? 0 };
  return {
    ok: r.status === 200 && !!j,
    text: text || undefined,
    summaries,
    requestId: r.requestId,
    latencyMs: Date.now() - t0,
    usage,
    costUsd: costUsd(args.model, usage.prompt, usage.completion),
    error: r.status === 200 ? undefined : (j?.error?.message ?? r.text.slice(0, 300)),
    httpStatus: r.status,
  };
}

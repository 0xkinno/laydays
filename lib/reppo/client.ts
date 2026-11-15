/** Reppo Evaluation API client. Evaluations are public, so only de-identified text is ever sent. */
const BASE = "https://eval.reppo.xyz/api/v1/agents";

export interface ReppoResult {
  id: string; status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"; score: number | null; route: "ship" | "review" | "block" | null; creditsCharged: number;
  result: { score: number; decision: string; confidence: string; route: string; reason: string; rubric_scores?: Record<string, number> } | null; error: string | null;
}

const headers = () => ({ authorization: `Bearer ${process.env.REPPO_API_KEY}`, "content-type": "application/json" });

/** Removes party names, vessel names, amounts and addresses before text leaves the app. */
export function deidentify(text: string): string {
  return text
    .replace(/Meera Pillai|Meera|Dan Reyes|Dan\b|Saltmarsh Tankers|Gulfline Trading|Orla Jansen|MT Orla/gi, "[party]")
    .replace(/\$\s?\d[\d,]*(\.\d+)?/g, "[amount]")
    .replace(/0x[a-fA-F0-9]{8,}/g, "[address]");
}

export async function submit(taskType: "claim" | "response" | "action", input: string): Promise<{ id: string } | { error: string; status: number }> {
  const r = await fetch(`${BASE}/evals`, { method: "POST", headers: headers(), body: JSON.stringify({ taskType, input: deidentify(input).slice(0, 49000) }) });
  const j = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
  return r.status === 201 && j.id ? { id: j.id } : { error: j.error ?? `HTTP ${r.status}`, status: r.status };
}

export async function poll(id: string, maxMs = 180_000): Promise<ReppoResult> {
  const t0 = Date.now();
  for (;;) {
    const r = await fetch(`${BASE}/evals/${id}`, { headers: headers() });
    const j = (await r.json()) as ReppoResult;
    if (j.status === "COMPLETED" || j.status === "FAILED" || Date.now() - t0 > maxMs) return j;
    await new Promise((x) => setTimeout(x, 5000));
  }
}

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface RunRow {
  role: string;
  model: string;
  features: string[];
  sha: string;
  usage: { prompt: number; completion: number; cached?: number; reasoning?: number };
  latencyMs: number;
  costUsd: number;
  requestId: string | null;
  ok: boolean;
  refusedBy: string | null;
  error: string | null;
}

/** Appends one JSON line per SERV call. On Vercel this is replaced by the database writer in lib/store/db.ts. */
export async function recordRun(row: RunRow): Promise<void> {
  const entry = { at: new Date().toISOString(), ...row };
  try {
    const hook = (globalThis as { __laydaysRunSink?: (e: unknown) => Promise<void> }).__laydaysRunSink;
    if (hook) return void (await hook(entry));
    if (process.env.VERCEL) return;
    const dir = path.join(process.cwd(), "proof", "runs");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "serv-calls.jsonl"), JSON.stringify(entry) + "\n");
  } catch {
    /* logging must never break a ruling */
  }
}

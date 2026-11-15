import { NextResponse } from "next/server";
import { relay } from "@/lib/chain/relayer";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  let body: { data?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 }); }
  if (!body.data || !/^0x[0-9a-fA-F]+$/.test(body.data)) return NextResponse.json({ ok: false, error: "data must be hex" }, { status: 400 });
  const r = await relay({ data: body.data as `0x${string}`, ip });
  return NextResponse.json(r, { status: r.ok ? 200 : r.status });
}

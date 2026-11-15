import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DisputeView } from "@/components/voyage/DisputeView";
import { Footer } from "@/components/Footer";
import { loadVoyage } from "@/lib/voyageData";
import { existsSync, readFileSync } from "node:fs";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = loadVoyage(id);
  if (!v) notFound();
  const reppo = existsSync("proof/runs/reppo-eval.json") ? (JSON.parse(readFileSync("proof/runs/reppo-eval.json", "utf8")).disputed_ruling ?? null) : null;
  return (<><Suspense><DisputeView v={v} reppo={reppo} /></Suspense><Footer /></>);
}

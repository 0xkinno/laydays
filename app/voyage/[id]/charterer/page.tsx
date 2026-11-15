import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChartererView } from "@/components/voyage/ChartererView";
import { Footer } from "@/components/Footer";
import { loadVoyage } from "@/lib/voyageData";

export default async function ChartererPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = loadVoyage(id);
  if (!v) notFound();
  return (<><Suspense><ChartererView v={v} /></Suspense><Footer /></>);
}

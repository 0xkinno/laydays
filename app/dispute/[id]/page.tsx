import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DisputeView } from "@/components/voyage/DisputeView";
import { Footer } from "@/components/Footer";
import { loadVoyage } from "@/lib/voyageData";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = loadVoyage(id);
  if (!v) notFound();
  return (<><Suspense><DisputeView v={v} /></Suspense><Footer /></>);
}

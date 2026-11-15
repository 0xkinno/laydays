import { notFound } from "next/navigation";
import { VoyageView } from "@/components/voyage/VoyageView";
import { Footer } from "@/components/Footer";
import { loadVoyage } from "@/lib/voyageData";

export default async function VoyagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = loadVoyage(id);
  if (!v) notFound();
  return (<><VoyageView v={v} /><Footer /></>);
}

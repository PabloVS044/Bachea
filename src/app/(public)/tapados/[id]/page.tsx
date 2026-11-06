import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeAfter } from "@/components/BeforeAfter";
import { ReportsMap } from "@/components/map/LazyMaps";
import { formatDate, placeLabel } from "@/lib/config";
import { getPublished } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPublished((await params).id);
  return { title: item ? `Bache tapado en ${placeLabel(item)}` : "Reparación no encontrada" };
}

export default async function TapadoPage({ params }: Props) {
  const item = await getPublished((await params).id);
  if (!item) notFound();
  const place = placeLabel(item);
  return (
    <main className="mx-auto max-w-3xl pb-8">
      <BeforeAfter before={item.before} after={item.after} alt={`bache en ${place}`} />
      <div className="px-5 pt-5 md:px-0">
        <Link href="/tapados" className="font-semibold underline underline-offset-4">Todos los baches tapados</Link>
        <h1 className="mt-3 text-5xl font-extrabold">{place}</h1>
        <p className="mt-1 text-gris">Reportado el {formatDate(item.created_at)}. Tapado el {formatDate(item.resolved_at)}.</p>
        {item.resolution_note && <p className="mt-4 max-w-prose text-lg">{item.resolution_note}</p>}
      </div>
      <div className="mt-6 h-72 overflow-hidden md:rounded-md">
        <ReportsMap points={[{ id: item.id, lat: item.lat, lng: item.lng, kind: "done", title: place }]} />
      </div>
    </main>
  );
}

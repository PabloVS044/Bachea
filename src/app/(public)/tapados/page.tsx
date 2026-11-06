import type { Metadata } from "next";
import Link from "next/link";
import { FeedCard } from "@/components/FeedCard";
import { ReportsMap } from "@/components/map/LazyMaps";
import { formatDate, placeLabel } from "@/lib/config";
import { FEED_PAGE_SIZE, getFeed, getPublishedPoints } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Baches tapados",
  description: "Reparaciones publicadas con su evidencia y mapa de baches resueltos en Ciudad de Guatemala.",
};
export const dynamic = "force-dynamic";

export default async function TapadosPage({ searchParams }: { searchParams: Promise<{ vista?: string; pagina?: string }> }) {
  const { vista, pagina } = await searchParams;
  const showMap = vista === "mapa";
  const page = Math.max(1, Math.floor(Number(pagina)) || 1);

  const tabClass = (active: boolean) =>
    `flex-1 rounded px-5 py-2 text-center font-semibold md:flex-none ${active ? "bg-bachea text-white" : "text-white"}`;

  return (
    <main>
      <div className="asphalt on-asphalt">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 pb-4 pt-6 md:flex-row md:items-end md:justify-between md:px-6">
          <h1 className="text-5xl font-extrabold">Baches tapados</h1>
          <nav aria-label="Vista" className="flex gap-1 rounded-md bg-noche p-1">
            <Link href="/tapados" aria-current={!showMap ? "page" : undefined} className={tabClass(!showMap)}>Evidencias</Link>
            <Link href="/tapados?vista=mapa" aria-current={showMap ? "page" : undefined} className={tabClass(showMap)}>Mapa</Link>
          </nav>
        </div>
      </div>
      {showMap ? <MapView /> : <FeedView page={page} />}
    </main>
  );
}

async function MapView() {
  const points = await getPublishedPoints();
  return (
    <div className="h-[calc(100dvh-14.5rem)] min-h-96 md:h-[calc(100dvh-11rem)]">
      <ReportsMap points={points.map((p) => ({
        id: p.id, lat: p.lat, lng: p.lng, kind: "done",
        title: placeLabel(p), subtitle: `Tapado el ${formatDate(p.resolved_at)}`, href: `/tapados/${p.id}`,
      }))} />
    </div>
  );
}

async function FeedView({ page }: { page: number }) {
  const { items, total } = await getFeed(page);
  const pages = Math.ceil(total / FEED_PAGE_SIZE);
  if (!total) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-6">
        <p className="max-w-prose text-lg">Todavía no hay reparaciones publicadas. Cuando se tape un bache, aquí aparecerá con sus fotos.</p>
        <Link href="/reportar" className="btn btn-primary mt-5">Reportar un bache</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-5 py-6 md:px-6">
      <p className="hint mb-4">Desliza sobre la foto para comparar antes y después.</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <FeedCard key={item.id} item={item} />)}
      </div>
      {pages > 1 && (
        <nav aria-label="Páginas" className="mt-8 flex items-center justify-between gap-4">
          {page > 1 ? <Link className="btn btn-ghost btn-sm" href={`/tapados?pagina=${page - 1}`}>Más recientes</Link> : <span />}
          <span className="hint">Página {page} de {pages}</span>
          {page < pages ? <Link className="btn btn-ghost btn-sm" href={`/tapados?pagina=${page + 1}`}>Anteriores</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

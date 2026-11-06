import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { TrackForm } from "@/components/TrackForm";
import { SeverityTag } from "@/components/Badges";
import { formatDateTime, placeLabel, type Status } from "@/lib/config";
import { getTracking } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seguimiento de reporte", robots: { index: false } };

const ROAD: { status: Status; title: string; text: string }[] = [
  { status: "recibido", title: "Recibido", text: "Tu reporte llegó a nuestro equipo." },
  { status: "verificado", title: "Verificado", text: "Revisamos la ubicación y las fotos." },
  { status: "programado", title: "Programado", text: "Ya está incluido en una jornada de trabajo." },
  { status: "tapado", title: "Tapado", text: "El bache quedó reparado." },
];

export default async function FolioPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params;
  const report = await getTracking(decodeURIComponent(folio));

  if (!report) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <h1 className="text-5xl font-extrabold">Seguimiento</h1>
        <TrackForm notFound />
      </main>
    );
  }

  const discarded = report.status === "descartado";
  const currentIndex = ROAD.findIndex((s) => s.status === report.status);
  const dateOf = (status: Status) => [...report.history].reverse().find((h) => h.status === status)?.created_at;

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="sr-only">Seguimiento del folio {report.folio}</h1>
      <p><span className="plate text-3xl">{report.folio}</span></p>
      <p className="mt-4 text-xl font-semibold">{placeLabel(report)}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <SeverityTag severity={report.severity} />
        {report.support_count > 0 && <span className="hint">{report.support_count + 1} personas lo reportaron</span>}
      </div>

      {discarded ? (
        <div className="mt-8 rounded-md bg-claro p-5">
          <h2 className="text-3xl">Reporte descartado</h2>
          <p className="mt-2">Nuestro equipo no pudo confirmarlo o ya estaba reportado. Si el bache sigue ahí, envía un reporte nuevo con otra foto.</p>
          <Link href="/reportar" className="btn btn-primary mt-4">Reportar un bache</Link>
        </div>
      ) : (
        <ol className="mt-8" aria-label="Avance del reporte">
          {ROAD.map((step, i) => {
            const reached = i <= currentIndex;
            const date = dateOf(step.status);
            const last = i === ROAD.length - 1;
            return (
              <li key={step.status} className="relative flex gap-4 pb-8 last:pb-0" aria-current={i === currentIndex ? "step" : undefined}>
                {!last && (
                  <span className={`absolute bottom-0 left-[15px] top-8 w-1 ${i < currentIndex ? "bg-[repeating-linear-gradient(to_bottom,var(--color-bachea)_0_12px,transparent_12px_20px)]" : "bg-[repeating-linear-gradient(to_bottom,var(--color-linea)_0_12px,transparent_12px_20px)]"}`} aria-hidden />
                )}
                <span className={`z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${reached ? (step.status === "tapado" ? "border-bachea-dark bg-bachea-dark text-white" : "border-noche bg-bachea text-white") : "border-linea bg-fondo"}`} aria-hidden>
                  {reached && <Check size={18} strokeWidth={3} />}
                </span>
                <div className={reached ? "" : "text-gris"}>
                  <h2 className="text-2xl">{step.title}</h2>
                  <p>{step.text}</p>
                  {reached && date && <p className="hint">{formatDateTime(date)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {report.published_at && <Link href={`/tapados/${report.id}`} className="btn btn-primary mt-8 w-full">Ver fotos de la reparación</Link>}
    </main>
  );
}

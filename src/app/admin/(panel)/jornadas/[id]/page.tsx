import { ArrowDown, ArrowUp, ExternalLink, MessageCircle, Plus, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addStop, deleteWorkDay, moveStop, removeStop, updateWorkDay } from "@/app/admin/actions";
import { Flash } from "@/components/admin/Flash";
import { SeverityTag, StatusTag } from "@/components/Badges";
import { ReportsMap } from "@/components/map/LazyMaps";
import { formatGtq, placeLabel, WORK_DAY_STATUSES } from "@/lib/config";
import { googleMapsRoutes, whatsappNumber } from "@/lib/route";
import { requireAdmin } from "@/lib/supabase/server";

const COLUMNS = "id, folio, lat, lng, zona, colonia, address, severity, status, support_count, route_order, cost_gtq";

export default async function WorkDayPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const flash = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: day } = await supabase.from("work_days").select("*").eq("id", id).maybeSingle();
  if (!day) notFound();

  const [{ data: stopRows }, { data: pending }, { data: crews }] = await Promise.all([
    supabase.from("reports").select(COLUMNS).eq("work_day_id", id).order("route_order").order("created_at"),
    supabase.from("reports").select(COLUMNS).is("work_day_id", null).in("status", ["recibido", "verificado"])
      .order("severity", { ascending: false }).order("support_count", { ascending: false }).limit(100),
    supabase.from("crews").select("id, name, phone, active").order("name"),
  ]);
  const stops = stopRows ?? [];
  const crew = (crews ?? []).find((c) => c.id === day.crew_id);
  const routes = googleMapsRoutes(stops.filter((s) => s.status !== "tapado" && s.status !== "descartado"));
  const totalCost = stops.reduce((sum, s) => sum + Number(s.cost_gtq ?? 0), 0);
  const patched = stops.filter((s) => s.status === "tapado").length;
  const crewWhatsapp = whatsappNumber(crew?.phone);
  const message = [`Jornada: ${day.title}`, ...routes.map((r, i) => `Ruta${routes.length > 1 ? ` ${i + 1}` : ""}: ${r}`)].join("\n");

  return (
    <main>
      <p><Link href="/admin/jornadas" className="font-semibold underline underline-offset-4">Todas las jornadas</Link></p>
      <h1 className="mb-4 mt-2 text-4xl font-extrabold">{day.title}</h1>
      <Flash {...flash} />

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] items-start gap-4">
        <div className="space-y-4">
          <section className="rounded-md bg-claro p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-2xl">Ruta ({stops.length} {stops.length === 1 ? "parada" : "paradas"})</h2>
              {routes.map((r, i) => (
                <a key={r} href={r} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm">
                  <ExternalLink size={15} aria-hidden /> {routes.length > 1 ? `Tramo ${i + 1} en Google Maps` : "Abrir en Google Maps"}
                </a>
              ))}
              {crewWhatsapp && routes.length > 0 && (
                <a href={`https://wa.me/${crewWhatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <MessageCircle size={15} aria-hidden /> Enviar a cuadrilla
                </a>
              )}
            </div>
            <p className="hint mt-1">Tapados: {patched} de {stops.length}. Costo registrado: {formatGtq(totalCost)}. La ruta omite los tapados y descartados.</p>
            {stops.length === 0 ? (
              <p className="mt-3 text-gris">Agrega baches pendientes desde la lista de abajo.</p>
            ) : (
              <ol className="mt-3 divide-y divide-linea/40">
                {stops.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-noche text-sm font-bold text-menta">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/reportes/${s.id}`} className="font-semibold underline underline-offset-3">{s.folio}</Link>
                      <span className="ml-2">{placeLabel(s)}</span>
                      {s.address && <div className="hint truncate">{s.address}</div>}
                    </div>
                    <SeverityTag severity={s.severity} />
                    <StatusTag status={s.status} />
                    <StopButton action={moveStop} day={id} report={s.id} direction="up" label="Subir parada" disabled={i === 0}><ArrowUp size={16} /></StopButton>
                    <StopButton action={moveStop} day={id} report={s.id} direction="down" label="Bajar parada" disabled={i === stops.length - 1}><ArrowDown size={16} /></StopButton>
                    <StopButton action={removeStop} day={id} report={s.id} label="Quitar de la jornada"><X size={16} /></StopButton>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-md bg-claro p-4">
            <h2 className="text-2xl">Baches pendientes</h2>
            <p className="hint">Sin jornada asignada, de mayor a menor prioridad.</p>
            {(pending ?? []).length === 0 ? <p className="mt-3 text-gris">No hay baches pendientes.</p> : (
              <ul className="mt-2 divide-y divide-linea/40">
                {(pending ?? []).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/reportes/${r.id}`} className="font-semibold underline underline-offset-3">{r.folio}</Link>
                      <span className="ml-2">{placeLabel(r)}</span>
                    </div>
                    <span className="hint whitespace-nowrap">{r.support_count + 1} {r.support_count === 0 ? "reporte" : "reportes"}</span>
                    <SeverityTag severity={r.severity} />
                    <form action={addStop}>
                      <input type="hidden" name="work_day_id" value={id} /><input type="hidden" name="report_id" value={r.id} />
                      <button className="btn btn-primary btn-sm"><Plus size={15} aria-hidden /> Agregar</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <div className="h-96 overflow-hidden rounded-md">
            <ReportsMap route points={[
              ...stops.map((s, i) => ({ id: s.id, lat: s.lat, lng: s.lng, kind: s.status === "tapado" ? "done" as const : "stop" as const, order: i + 1, title: `${i + 1}. ${s.folio}`, subtitle: placeLabel(s), href: `/admin/reportes/${s.id}` })),
              ...(pending ?? []).map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, kind: "open" as const, severity: r.severity, title: r.folio, subtitle: placeLabel(r), href: `/admin/reportes/${r.id}` })),
            ]} />
          </div>
          <form action={updateWorkDay} className="space-y-3 rounded-md bg-claro p-4">
            <h2 className="text-2xl">Datos de la jornada</h2>
            <input type="hidden" name="id" value={id} />
            <div><label className="label" htmlFor="title">Nombre</label><input id="title" name="title" required maxLength={120} defaultValue={day.title} className="field field-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="scheduled_on">Fecha</label><input id="scheduled_on" name="scheduled_on" type="date" required defaultValue={day.scheduled_on} className="field field-sm" /></div>
              <div><label className="label" htmlFor="status">Estado</label><select id="status" name="status" defaultValue={day.status} className="field field-sm">{WORK_DAY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            </div>
            <div><label className="label" htmlFor="crew_id">Cuadrilla</label>
              <select id="crew_id" name="crew_id" defaultValue={day.crew_id ?? ""} className="field field-sm"><option value="">Sin asignar</option>{(crews ?? []).filter((c) => c.active || c.id === day.crew_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              {crews?.length === 0 && <p className="hint mt-1">Primero <Link className="underline" href="/admin/cuadrillas">crea una cuadrilla</Link>.</p>}
            </div>
            <div><label className="label" htmlFor="notes">Notas</label><textarea id="notes" name="notes" rows={2} defaultValue={day.notes ?? ""} className="field" /></div>
            <button className="btn btn-dark btn-sm">Guardar jornada</button>
          </form>
          <form action={deleteWorkDay}>
            <input type="hidden" name="id" value={id} />
            <button className="btn btn-sm cursor-pointer text-danger underline">Eliminar jornada</button>
            <span className="hint">Los baches sin tapar vuelven a pendientes.</span>
          </form>
        </div>
      </div>
    </main>
  );
}

function StopButton({ action, day, report, direction, label, disabled, children }: {
  action: (form: FormData) => Promise<void>; day: string; report: string; direction?: string; label: string; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="work_day_id" value={day} />
      <input type="hidden" name="report_id" value={report} />
      {direction && <input type="hidden" name="direction" value={direction} />}
      <button aria-label={label} title={label} disabled={disabled} className="grid size-8 cursor-pointer place-items-center rounded hover:bg-menta/40 disabled:cursor-default disabled:opacity-30">{children}</button>
    </form>
  );
}

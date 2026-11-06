/* eslint-disable @next/next/no-img-element -- URLs firmadas de vida corta */
import { ExternalLink, MessageCircle, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assignFromReport, deletePhoto, publishReport, saveNotes, saveResolution, unpublishReport, updateStatus,
} from "@/app/admin/actions";
import { AfterPhotoUpload } from "@/components/admin/AfterPhotoUpload";
import { Flash } from "@/components/admin/Flash";
import { SeverityTag, StatusTag } from "@/components/Badges";
import { ReportsMap } from "@/components/map/LazyMaps";
import { formatDate, formatDateTime, STATUSES, statusLabel, ZONES } from "@/lib/config";
import { signPhotos } from "@/lib/images";
import { whatsappNumber } from "@/lib/route";
import { requireAdmin } from "@/lib/supabase/server";

type Photo = { id: string; storage_path: string; kind: "antes" | "despues"; is_public: boolean };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md bg-claro p-4">
      <h2 className="mb-3 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function ReportDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const flash = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: report } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (!report) notFound();

  const [{ data: photoRows }, { data: history }, { data: workDays }] = await Promise.all([
    supabase.from("report_photos").select("id, storage_path, kind, is_public").eq("report_id", id).order("created_at"),
    supabase.from("report_status_history").select("status, created_at").eq("report_id", id).order("created_at", { ascending: false }),
    supabase.from("work_days").select("id, title, scheduled_on").neq("status", "completada").order("scheduled_on"),
  ]);
  const photos = (photoRows ?? []) as Photo[];
  const urls = await signPhotos(photos.map((p) => p.storage_path));
  const before = photos.filter((p) => p.kind === "antes");
  const after = photos.filter((p) => p.kind === "despues");
  const whatsapp = whatsappNumber(report.reporter_phone);
  const isPublished = !!report.published_at;
  const canPublish = report.status === "tapado";

  return (
    <main>
      <p><Link href="/admin" className="font-semibold underline underline-offset-4">Todos los reportes</Link></p>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-4">
        <h1 className="plate text-3xl">{report.folio}</h1>
        <StatusTag status={report.status} />
        <SeverityTag severity={report.severity} />
        {isPublished && <Link href={`/tapados/${id}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-bachea-dark underline">Publicado <ExternalLink size={15} aria-hidden /></Link>}
        <span className="ml-auto text-gris">Recibido el {formatDateTime(report.created_at)}</span>
      </div>
      <Flash {...flash} />

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] items-start gap-4">
        <div className="space-y-4">
          <Panel title="Fotos del reporte">
            <div className="grid grid-cols-3 gap-2">
              {before.map((p) => (
                <a key={p.id} href={urls.get(p.storage_path)} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded bg-menta/30">
                  <img src={urls.get(p.storage_path)} alt="Foto enviada por quien reportó" className="size-full object-cover hover:opacity-90" />
                </a>
              ))}
            </div>
            {report.description && <p className="mt-3 whitespace-pre-wrap">{report.description}</p>}
            <p className="hint mt-2">{report.support_count + 1} {report.support_count === 0 ? "persona lo reportó" : "personas lo reportaron"}.</p>
          </Panel>

          <Panel title="Ubicación">
            <div className="h-72 overflow-hidden rounded">
              <ReportsMap points={[{ id, lat: report.lat, lng: report.lng, kind: "open", severity: report.severity, title: report.folio }]} />
            </div>
            <p className="hint mt-2">
              {report.location_source === "gps" ? `GPS${report.accuracy_m ? `, margen de ${Math.round(report.accuracy_m)} m` : ""}` : "Elegida en el mapa"}.{" "}
              <a className="font-semibold underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`}>Abrir en Google Maps</a>
            </p>
            <form action={saveNotes} className="mt-4 grid grid-cols-[7rem_1fr] gap-3">
              <input type="hidden" name="id" value={id} />
              <div><label className="label" htmlFor="zona">Zona</label>
                <select id="zona" name="zona" defaultValue={report.zona ?? ""} className="field field-sm"><option value="">Sin dato</option>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></div>
              <div><label className="label" htmlFor="colonia">Colonia</label><input id="colonia" name="colonia" maxLength={120} defaultValue={report.colonia ?? ""} className="field field-sm" /></div>
              <div className="col-span-2"><label className="label" htmlFor="address">Calle o referencia</label><input id="address" name="address" maxLength={240} defaultValue={report.address ?? ""} className="field field-sm" /></div>
              <div className="col-span-2"><label className="label" htmlFor="admin_notes">Notas internas</label><textarea id="admin_notes" name="admin_notes" rows={3} defaultValue={report.admin_notes ?? ""} className="field" /></div>
              <div className="col-span-2"><button className="btn btn-dark btn-sm">Guardar datos</button></div>
            </form>
          </Panel>

          <Panel title="Registrar reparación">
            <form action={saveResolution} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div><label className="label" htmlFor="resolution_note">Nota para el feed público</label>
                <textarea id="resolution_note" name="resolution_note" rows={2} maxLength={500} defaultValue={report.resolution_note ?? ""} className="field" placeholder="Ej.: Bacheo con mezcla asfáltica en frío, carril derecho." /></div>
              <div className="grid grid-cols-[1fr_10rem] gap-3">
                <div><label className="label" htmlFor="materials">Materiales <span className="font-normal text-gris">(interno)</span></label><input id="materials" name="materials" defaultValue={report.materials ?? ""} className="field field-sm" /></div>
                <div><label className="label" htmlFor="cost_gtq">Costo en Q <span className="font-normal text-gris">(interno)</span></label><input id="cost_gtq" name="cost_gtq" type="number" min="0" step="0.01" defaultValue={report.cost_gtq ?? ""} className="field field-sm" /></div>
              </div>
              <button className="btn btn-primary btn-sm">{report.status === "tapado" ? "Guardar reparación" : "Guardar y marcar como tapado"}</button>
            </form>
            <div className="mt-5 border-t border-linea/40 pt-4">
              <h3 className="mb-2 text-xl">Fotos de después</h3>
              {after.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {after.map((p) => (
                    <div key={p.id} className="relative aspect-[4/3] overflow-hidden rounded bg-menta/30">
                      <img src={urls.get(p.storage_path)} alt="Evidencia de la reparación" className="size-full object-cover" />
                      <form action={deletePhoto} className="absolute right-1 top-1">
                        <input type="hidden" name="id" value={id} /><input type="hidden" name="photo_id" value={p.id} />
                        <button aria-label="Eliminar esta foto" className="grid size-8 cursor-pointer place-items-center rounded-full bg-noche/85 text-white"><Trash2 size={15} /></button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <AfterPhotoUpload reportId={id} />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Estado">
            <form action={updateStatus} className="flex gap-2">
              <input type="hidden" name="id" value={id} />
              <select name="status" aria-label="Estado" defaultValue={report.status} className="field field-sm">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-dark btn-sm shrink-0">Cambiar estado</button>
            </form>
            <ol className="mt-4 space-y-1">
              {(history ?? []).map((h, i) => (
                <li key={i} className="flex justify-between gap-3 text-sm"><span className="font-medium">{statusLabel(h.status)}</span><span className="text-gris">{formatDateTime(h.created_at)}</span></li>
              ))}
            </ol>
          </Panel>

          <Panel title="Jornada">
            <form action={assignFromReport} className="flex gap-2">
              <input type="hidden" name="id" value={id} />
              <select name="work_day_id" aria-label="Jornada" defaultValue={report.work_day_id ?? ""} className="field field-sm">
                <option value="">Sin jornada</option>
                {(workDays ?? []).map((w) => <option key={w.id} value={w.id}>{w.title}, {formatDate(`${w.scheduled_on}T12:00:00Z`)}</option>)}
              </select>
              <button className="btn btn-dark btn-sm shrink-0">Asignar</button>
            </form>
            {report.work_day_id && <Link href={`/admin/jornadas/${report.work_day_id}`} className="mt-2 block font-semibold underline underline-offset-4">Abrir jornada</Link>}
          </Panel>

          <Panel title="Quien reportó">
            {report.reporter_name || report.reporter_phone ? (
              <>
                {report.reporter_name && <p className="font-semibold">{report.reporter_name}</p>}
                {report.reporter_phone && <p>{report.reporter_phone}</p>}
                <div className="mt-2 flex gap-2">
                  {report.reporter_phone && <a href={`tel:${report.reporter_phone.replace(/[^+\d]/g, "")}`} className="btn btn-ghost btn-sm"><Phone size={15} aria-hidden /> Llamar</a>}
                  {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><MessageCircle size={15} aria-hidden /> WhatsApp</a>}
                </div>
              </>
            ) : <p className="text-gris">Reporte anónimo, sin datos de contacto.</p>}
          </Panel>

          <Panel title="Publicación">
            {!canPublish ? (
              <p className="text-gris">Se puede publicar cuando el bache esté marcado como tapado.</p>
            ) : (
              <>
                <form action={publishReport}>
                  <input type="hidden" name="id" value={id} />
                  <p className="mb-2 text-sm">Elige qué fotos serán públicas. Revisa que no se vean rostros, placas ni datos personales.</p>
                  {photos.length === 0 && <p className="text-gris">Sube una foto de después para poder publicar.</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((p) => (
                      <label key={p.id} className="relative block cursor-pointer overflow-hidden rounded border-2 border-linea/40 has-[:checked]:border-bachea-dark">
                        <img src={urls.get(p.storage_path)} alt={p.kind === "antes" ? "Foto de antes" : "Foto de después"} className="aspect-[4/3] w-full object-cover" />
                        <span className="flex items-center gap-2 p-1.5 text-sm font-medium">
                          <input type="checkbox" name="public_photo" value={p.id} defaultChecked={p.is_public} />
                          {p.kind === "antes" ? "Antes" : "Después"}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-sm mt-3 w-full">{isPublished ? "Actualizar publicación" : "Publicar en el feed"}</button>
                </form>
                {isPublished && (
                  <form action={unpublishReport} className="mt-2">
                    <input type="hidden" name="id" value={id} />
                    <button className="btn btn-ghost btn-sm w-full">Retirar del feed</button>
                  </form>
                )}
              </>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

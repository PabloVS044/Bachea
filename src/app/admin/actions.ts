"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PHOTO_BUCKET, STATUSES, WORK_DAY_STATUSES } from "@/lib/config";
import { ImageError, normalizeImage, storePhoto } from "@/lib/images";
import { allow, clientIp } from "@/lib/security";
import { requireAdmin, sessionClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

const uuid = z.uuid();
const statusValue = z.enum(STATUSES.map((s) => s.value) as [string, ...string[]]);
const workDayValue = z.enum(WORK_DAY_STATUSES.map((s) => s.value) as [string, ...string[]]);
const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const textOrNull = (v: FormDataEntryValue | null) => text(v) || null;

function reportPath(id: string, message?: string, isError = false) {
  const query = message ? `?${isError ? "error" : "ok"}=${encodeURIComponent(message)}` : "";
  return `/admin/reportes/${id}${query}`;
}

function ensure<T extends { error: { message: string } | null }>(result: T) {
  if (result.error) throw new Error(result.error.message);
  return result;
}

// Sesión ---------------------------------------------------------------------------------------
export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const ip = clientIp(await headers());
  if (!(await allow("login", ip, 900, 10))) return "Demasiados intentos. Espera 15 minutos.";
  const supabase = await sessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(form.get("email")),
    password: String(form.get("password") ?? ""),
  });
  if (error) return "Correo o contraseña incorrectos.";
  redirect("/admin");
}

export async function logout() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Reportes -------------------------------------------------------------------------------------
export async function updateStatus(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const status = statusValue.parse(form.get("status"));
  ensure(await supabase.from("reports").update({ status }).eq("id", id));
  revalidatePath("/admin", "layout");
  redirect(reportPath(id, "Estado actualizado."));
}

export async function saveNotes(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  ensure(await supabase.from("reports").update({
    admin_notes: textOrNull(form.get("admin_notes")),
    zona: Number(form.get("zona")) || null,
    colonia: textOrNull(form.get("colonia")),
    address: textOrNull(form.get("address")),
  }).eq("id", id));
  redirect(reportPath(id, "Datos guardados."));
}

export async function saveResolution(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const costRaw = text(form.get("cost_gtq"));
  const cost = costRaw ? Number(costRaw) : null;
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
    redirect(reportPath(id, "Revisa el costo: debe ser un número positivo.", true));
  }
  const note = text(form.get("resolution_note"));
  if (note.length > 500) redirect(reportPath(id, "La nota pública admite hasta 500 caracteres.", true));
  ensure(await supabase.from("reports").update({
    status: "tapado",
    resolution_note: note || null,
    materials: textOrNull(form.get("materials")),
    cost_gtq: cost,
  }).eq("id", id));
  revalidatePath("/admin", "layout");
  redirect(reportPath(id, "Reparación registrada."));
}

export async function uploadAfterPhoto(form: FormData): Promise<string | null> {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const file = form.get("photo");
  if (!(file instanceof File)) return "Elige una foto.";
  try {
    const image = await normalizeImage(file);
    const storage_path = await storePhoto(id, image);
    const result = await supabase.from("report_photos").insert({ report_id: id, storage_path, kind: "despues", is_public: true });
    if (result.error) {
      await serviceClient().storage.from(PHOTO_BUCKET).remove([storage_path]);
      throw new Error(result.error.message);
    }
  } catch (e) {
    if (e instanceof ImageError) return e.message;
    console.error("uploadAfterPhoto", e);
    return "No se pudo subir la foto. Inténtalo de nuevo.";
  }
  revalidatePath(`/admin/reportes/${id}`);
  return null;
}

export async function deletePhoto(form: FormData) {
  const { supabase } = await requireAdmin();
  const photoId = uuid.parse(form.get("photo_id"));
  const id = uuid.parse(form.get("id"));
  const { data } = await supabase.from("report_photos").select("storage_path, kind").eq("id", photoId).eq("report_id", id).single();
  if (data) {
    ensure(await supabase.from("report_photos").delete().eq("id", photoId));
    await serviceClient().storage.from(PHOTO_BUCKET).remove([data.storage_path]);
  }
  redirect(reportPath(id, "Foto eliminada."));
}

export async function publishReport(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const publicIds = form.getAll("public_photo").map((v) => uuid.parse(v));

  const { data: report } = await supabase.from("reports").select("status, published_at").eq("id", id).single();
  if (report?.status !== "tapado") redirect(reportPath(id, "Marca el bache como tapado antes de publicar.", true));

  const { data: photos } = await supabase.from("report_photos").select("id, kind").eq("report_id", id);
  const chosen = (photos ?? []).filter((p) => publicIds.includes(p.id));
  if (!chosen.some((p) => p.kind === "despues")) {
    redirect(reportPath(id, "Elige al menos una foto de después para publicar.", true));
  }
  ensure(await supabase.from("report_photos").update({ is_public: false }).eq("report_id", id));
  ensure(await supabase.from("report_photos").update({ is_public: true }).in("id", chosen.map((p) => p.id)));
  if (!report.published_at) { // Editar las fotos no debe mover la entrada en el feed
    ensure(await supabase.from("reports").update({ published_at: new Date().toISOString() }).eq("id", id));
  }
  revalidatePath("/", "layout");
  redirect(reportPath(id, "Publicado en el feed."));
}

export async function unpublishReport(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  ensure(await supabase.from("reports").update({ published_at: null }).eq("id", id));
  revalidatePath("/", "layout");
  redirect(reportPath(id, "Retirado del feed."));
}

// Jornadas ---------------------------------------------------------------------------------------
export async function createWorkDay(form: FormData) {
  const { supabase } = await requireAdmin();
  const title = text(form.get("title"));
  const date = z.iso.date().safeParse(form.get("scheduled_on"));
  if (title.length < 2 || !date.success) redirect("/admin/jornadas?error=Escribe+un+nombre+y+una+fecha.");
  const { data } = ensure(await supabase.from("work_days").insert({
    title,
    scheduled_on: date.data,
    crew_id: textOrNull(form.get("crew_id")),
  }).select("id").single());
  redirect(`/admin/jornadas/${data!.id}`);
}

export async function updateWorkDay(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const date = z.iso.date().safeParse(form.get("scheduled_on"));
  if (!date.success) redirect(`/admin/jornadas/${id}?error=Revisa+la+fecha.`);
  ensure(await supabase.from("work_days").update({
    title: text(form.get("title")),
    scheduled_on: date.data,
    crew_id: textOrNull(form.get("crew_id")),
    status: workDayValue.parse(form.get("status")),
    notes: textOrNull(form.get("notes")),
  }).eq("id", id));
  redirect(`/admin/jornadas/${id}?ok=Jornada+guardada.`);
}

export async function deleteWorkDay(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  // Las paradas pendientes vuelven a la bandeja antes de borrar la jornada.
  ensure(await supabase.from("reports").update({ status: "verificado" }).eq("work_day_id", id).eq("status", "programado"));
  ensure(await supabase.from("reports").update({ route_order: null }).eq("work_day_id", id));
  ensure(await supabase.from("work_days").delete().eq("id", id));
  redirect("/admin/jornadas?ok=Jornada+eliminada.");
}

async function addToWorkDay(reportId: string, workDayId: string) {
  const { supabase } = await requireAdmin();
  const { data: last } = await supabase.from("reports").select("route_order")
    .eq("work_day_id", workDayId).order("route_order", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  const { data: report } = await supabase.from("reports").select("status").eq("id", reportId).single();
  ensure(await supabase.from("reports").update({
    work_day_id: workDayId,
    route_order: (last?.route_order ?? 0) + 1,
    ...(report?.status === "recibido" || report?.status === "verificado" ? { status: "programado" } : {}),
  }).eq("id", reportId));
}

async function removeFromWorkDay(reportId: string) {
  const { supabase } = await requireAdmin();
  const { data: report } = await supabase.from("reports").select("status").eq("id", reportId).single();
  ensure(await supabase.from("reports").update({
    work_day_id: null,
    route_order: null,
    ...(report?.status === "programado" ? { status: "verificado" } : {}),
  }).eq("id", reportId));
}

export async function addStop(form: FormData) {
  const workDayId = uuid.parse(form.get("work_day_id"));
  await addToWorkDay(uuid.parse(form.get("report_id")), workDayId);
  revalidatePath(`/admin/jornadas/${workDayId}`);
}

export async function removeStop(form: FormData) {
  const workDayId = uuid.parse(form.get("work_day_id"));
  await removeFromWorkDay(uuid.parse(form.get("report_id")));
  revalidatePath(`/admin/jornadas/${workDayId}`);
}

export async function moveStop(form: FormData) {
  const { supabase } = await requireAdmin();
  const workDayId = uuid.parse(form.get("work_day_id"));
  const reportId = uuid.parse(form.get("report_id"));
  const delta = form.get("direction") === "up" ? -1 : 1;
  const { data: stops } = await supabase.from("reports").select("id").eq("work_day_id", workDayId).order("route_order").order("created_at");
  const ids = (stops ?? []).map((s) => s.id);
  const from = ids.indexOf(reportId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await Promise.all(ids.map(async (id, i) => ensure(await supabase.from("reports").update({ route_order: i + 1 }).eq("id", id))));
  revalidatePath(`/admin/jornadas/${workDayId}`);
}

export async function assignFromReport(form: FormData) {
  const id = uuid.parse(form.get("id"));
  const workDayId = text(form.get("work_day_id"));
  if (workDayId) await addToWorkDay(id, uuid.parse(workDayId));
  else await removeFromWorkDay(id);
  redirect(reportPath(id, workDayId ? "Agregado a la jornada." : "Quitado de la jornada."));
}

// Cuadrillas -------------------------------------------------------------------------------------
export async function createCrew(form: FormData) {
  const { supabase } = await requireAdmin();
  const name = text(form.get("name"));
  if (name.length < 2) redirect("/admin/cuadrillas?error=Escribe+el+nombre+de+la+cuadrilla.");
  ensure(await supabase.from("crews").insert({ name, phone: textOrNull(form.get("phone")) }));
  revalidatePath("/admin/cuadrillas");
}

export async function toggleCrew(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.parse(form.get("id"));
  ensure(await supabase.from("crews").update({ active: form.get("active") === "true" }).eq("id", id));
  revalidatePath("/admin/cuadrillas");
}

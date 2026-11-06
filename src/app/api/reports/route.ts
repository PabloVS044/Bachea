import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inServiceArea, MAX_REPORT_PHOTOS, PHOTO_BUCKET } from "@/lib/config";
import { ImageError, normalizeImage, storePhoto } from "@/lib/images";
import { allow, clientIp } from "@/lib/security";
import { serviceClient } from "@/lib/supabase/service";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sin 0/O/1/I/L para dictarlo sin errores
const newFolio = () => `BCH-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => v || null).nullable().optional();

const schema = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  accuracy: z.coerce.number().min(0).max(100000).optional(),
  source: z.enum(["gps", "mapa"]),
  severity: z.enum(["leve", "moderado", "peligroso"]),
  zona: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1).max(25).optional()),
  colonia: optionalText(120),
  address: optionalText(240),
  description: optionalText(500),
  name: optionalText(80),
  phone: z.string().trim().max(20).regex(/^[+\d\s()-]*$/, "Revisa el teléfono: usa solo números.").transform((v) => v || null).optional(),
});

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!(await allow("report", ip, 3600, 6))) {
    return fail("Alcanzaste el límite de reportes por hora. Inténtalo más tarde.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("El envío llegó incompleto. Inténtalo de nuevo.");
  }
  if (form.get("website")) return fail("No se pudo enviar el reporte."); // campo trampa para bots

  const fields: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") fields[key] = value;
  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    return fail(parsed.error.issues.find((i) => i.path[0] === "phone")?.message ?? "Revisa los datos del reporte.");
  }
  const d = parsed.data;
  if (!inServiceArea(d.lat, d.lng)) return fail("Por ahora solo atendemos el área metropolitana de Ciudad de Guatemala.");

  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length < 1) return fail("Agrega al menos una foto del bache.");
  if (files.length > MAX_REPORT_PHOTOS) return fail(`Puedes adjuntar hasta ${MAX_REPORT_PHOTOS} fotos.`);

  const db = serviceClient();
  const id = randomUUID();
  const uploaded: string[] = [];
  try {
    const images = await Promise.all(files.map(normalizeImage));
    for (const image of images) uploaded.push(await storePhoto(id, image));

    let folio = "";
    for (let attempt = 0; attempt < 4 && !folio; attempt++) {
      const candidate = newFolio();
      const { error } = await db.from("reports").insert({
        id,
        folio: candidate,
        lat: d.lat,
        lng: d.lng,
        accuracy_m: d.accuracy ?? null,
        location_source: d.source,
        severity: d.severity,
        zona: d.zona ?? null,
        colonia: d.colonia ?? null,
        address: d.address ?? null,
        description: d.description ?? null,
        reporter_name: d.name ?? null,
        reporter_phone: d.phone ?? null,
      });
      if (!error) folio = candidate;
      else if (error.code !== "23505") throw new Error(error.message);
    }
    if (!folio) throw new Error("no se pudo generar folio");

    const { error: photoError } = await db.from("report_photos").insert(
      uploaded.map((storage_path) => ({ report_id: id, storage_path, kind: "antes" })),
    );
    if (photoError) {
      await db.from("reports").delete().eq("id", id);
      throw new Error(photoError.message);
    }
    return NextResponse.json({ folio }, { status: 201 });
  } catch (e) {
    if (uploaded.length) await db.storage.from(PHOTO_BUCKET).remove(uploaded);
    if (e instanceof ImageError) return fail(e.message);
    console.error("POST /api/reports", e);
    return fail("No se pudo guardar el reporte. Inténtalo de nuevo.", 500);
  }
}

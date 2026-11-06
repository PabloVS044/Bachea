import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const shots = process.env.SHOTS_DIR ?? "test-results/shots";
mkdirSync(shots, { recursive: true });

const ADMIN_EMAIL = `admin-${randomUUID().slice(0, 8)}@bachea.test`;
const ADMIN_PASSWORD = `Pw-${randomUUID()}`;
// Coordenada distinta por corrida para no chocar con reportes previos.
const SPOT = { latitude: 14.60 + Math.random() * 0.05, longitude: -90.53 + Math.random() * 0.05 };
const SECRET_PHONE = "5512 3456";
const SECRET_NAME = "Persona Prueba Privada";

const mobile = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, geolocation: SPOT, permissions: ["geolocation"] };

async function photo(color: { r: number; g: number; b: number }) {
  return sharp({ create: { width: 2400, height: 1800, channels: 3, background: color } })
    .withExif({ IFD3: { GPSLatitude: "14/1 36/1 0/1", GPSLatitudeRef: "N" } })
    .jpeg().toBuffer();
}
const file = async (name: string, color: { r: number; g: number; b: number }) =>
  ({ name, mimeType: "image/jpeg", buffer: await photo(color) });

let folio = "";
let reportId = "";

test.beforeAll(async () => {
  await service.from("rate_limits").delete().neq("hits", -1);
  const { data, error } = await service.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
  if (error) throw error;
  await service.from("admins").insert({ user_id: data.user.id });
});

test.describe.serial("flujo completo", () => {
  test("móvil: reportar con GPS, foto y contacto", async ({ browser }) => {
    const ctx = await browser.newContext(mobile);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/");
    await page.screenshot({ path: `${shots}/01-home-mobile.png` });
    await page.getByRole("link", { name: "Reportar un bache" }).first().click();
    await expect(page.getByRole("heading", { name: "Ubicación" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar ubicación" })).toBeDisabled();
    await page.getByRole("button", { name: "Usar mi GPS" }).click();
    await expect(page.getByText(/Ubicación encontrada/)).toBeVisible();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${shots}/02-mapa-gps.png` });
    await page.getByRole("button", { name: "Confirmar ubicación" }).click();

    await expect(page.getByRole("heading", { name: "Detalles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await page.locator('input[type="file"]').setInputFiles([await file("a.jpg", { r: 90, g: 80, b: 70 })]);
    await expect(page.getByAltText("Foto 1 del bache")).toBeVisible();
    await page.getByText("Peligroso", { exact: true }).click();
    await page.getByLabel("Zona").selectOption("7");
    await page.getByLabel("Colonia o barrio").fill("Colonia Prueba");
    await page.screenshot({ path: `${shots}/03-detalles.png`, fullPage: true });
    await page.getByRole("button", { name: "Continuar" }).click();

    await page.getByLabel("Nombre").fill(SECRET_NAME);
    await page.getByLabel("Teléfono o WhatsApp").fill(SECRET_PHONE);
    await page.screenshot({ path: `${shots}/04-enviar.png`, fullPage: true });
    await page.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(page.getByRole("heading", { name: "Reporte enviado" })).toBeVisible();
    folio = (await page.locator(".plate").innerText()).trim();
    expect(folio).toMatch(/^BCH-[A-Z0-9]{6}$/);
    await page.screenshot({ path: `${shots}/05-exito.png` });

    await page.getByRole("link", { name: "Ver seguimiento" }).click();
    await expect(page.getByRole("heading", { name: "Recibido" })).toBeVisible();
    await page.screenshot({ path: `${shots}/06-seguimiento.png`, fullPage: true });
    await expect(page.locator("body")).not.toContainText(SECRET_PHONE);
    expect(errors).toEqual([]);
    await ctx.close();

    const { data } = await service.from("reports").select("id, status, location_source, accuracy_m").eq("folio", folio).single();
    reportId = data!.id;
    expect(data!.status).toBe("recibido");
    expect(data!.location_source).toBe("gps");
  });

  test("las fotos guardadas no conservan EXIF ni quedan públicas", async () => {
    const { data: rows } = await service.from("report_photos").select("storage_path, is_public").eq("report_id", reportId);
    expect(rows).toHaveLength(1);
    expect(rows![0].is_public).toBe(false);
    const { data: blob } = await service.storage.from("report-photos").download(rows![0].storage_path);
    const meta = await sharp(Buffer.from(await blob!.arrayBuffer())).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600);

    const anon = await fetch(`${SUPABASE_URL}/storage/v1/object/public/report-photos/${rows![0].storage_path}`);
    expect(anon.status).toBeGreaterThanOrEqual(400);
  });

  test("móvil: duplicado cercano permite sumarse sin crear otro reporte", async ({ browser }) => {
    const ctx = await browser.newContext(mobile);
    const page = await ctx.newPage();
    await page.goto("/reportar");
    await page.getByRole("button", { name: "Usar mi GPS" }).click();
    await expect(page.getByText(/Ubicación encontrada/)).toBeVisible();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Confirmar ubicación" }).click();
    await expect(page.getByRole("heading", { name: "¿Es este bache?" })).toBeVisible();
    await page.screenshot({ path: `${shots}/07-duplicado.png` });
    await page.getByRole("button", { name: "Yo también lo vi" }).click();
    await expect(page.getByRole("heading", { name: "Te sumamos a este reporte" })).toBeVisible();
    await expect(page.locator(".plate")).toHaveText(folio);

    // El mismo dispositivo no puede sumar dos veces.
    const repeat = await ctx.request.post(`/api/reports/${reportId}/support`);
    expect((await repeat.json()).added).toBe(false);
    await ctx.close();

    const { data } = await service.from("reports").select("support_count").eq("id", reportId).single();
    expect(data!.support_count).toBe(1);
  });

  test("seguridad: anónimo no lee ni escribe tablas ni funciones", async ({ request }) => {
    const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };
    for (const table of ["reports", "report_photos", "admins", "crews", "work_days", "report_status_history", "report_supports", "rate_limits"]) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
      const rows = res.ok ? await res.json() : [];
      expect(rows, table).toEqual([]);
    }
    const insert = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ folio: "BCH-HACKED", lat: 14.6, lng: -90.5, location_source: "mapa", severity: "leve" }),
    });
    expect(insert.ok).toBe(false);
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_support`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_report: reportId, p_device: "x" }),
    });
    expect(rpc.ok).toBe(false);

    const panel = await request.get("/admin", { maxRedirects: 0 });
    expect(panel.status()).toBe(307);
    expect(panel.headers().location).toContain("/admin/login");

    // Validaciones del endpoint público
    const form = () => { const f = new FormData(); f.set("lat", "19.43"); f.set("lng", "-99.13"); f.set("source", "mapa"); f.set("severity", "leve"); return f; };
    const outside = await fetch("http://localhost:3000/api/reports", { method: "POST", body: form() });
    expect(outside.status).toBe(400);
    const f2 = form(); f2.set("lat", "14.6"); f2.set("lng", "-90.5");
    f2.append("photos", new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "x.jpg", { type: "image/jpeg" }));
    const notImage = await fetch("http://localhost:3000/api/reports", { method: "POST", body: f2 });
    expect(notImage.status).toBe(400);
  });

  test("una cuenta sin rol admin no entra al panel", async ({ page }) => {
    const email = `user-${randomUUID().slice(0, 8)}@bachea.test`;
    const password = `Pw-${randomUUID()}`;
    await service.auth.admin.createUser({ email, password, email_confirm: true });
    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Esta cuenta no tiene acceso al panel.")).toBeVisible();
  });

  test("admin: coordinar, tapar, publicar", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill("mala-clave");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
    await page.getByRole("link", { name: folio }).waitFor();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${shots}/10-admin-reportes.png` });

    const crewName = `Cuadrilla ${randomUUID().slice(0, 4)}`;
    await page.goto("/admin/cuadrillas");
    await page.getByLabel("Nombre").fill(crewName);
    await page.getByLabel("WhatsApp").fill("5555 1234");
    await page.getByRole("button", { name: "Agregar cuadrilla" }).click();
    await expect(page.getByText(crewName)).toBeVisible();

    await page.goto("/admin/jornadas");
    const dayName = `Jornada ${randomUUID().slice(0, 4)}`;
    await page.getByLabel("Nombre").fill(dayName);
    await page.getByLabel("Fecha").fill("2026-11-14");
    await page.getByLabel("Cuadrilla").selectOption({ label: crewName });
    await page.getByRole("button", { name: "Crear jornada" }).click();
    await expect(page.getByRole("heading", { name: dayName })).toBeVisible();
    const row = page.locator("li").filter({ hasText: folio });
    await row.getByRole("button", { name: "Agregar" }).click();
    const route = page.getByRole("link", { name: "Abrir en Google Maps" });
    await expect(route).toBeVisible();
    expect(await route.getAttribute("href")).toContain("google.com/maps/dir");
    await expect(page.getByRole("link", { name: "Enviar a cuadrilla" })).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${shots}/11-admin-jornada.png` });

    await page.getByRole("link", { name: folio }).click();
    await expect(page.getByText(SECRET_NAME)).toBeVisible();
    await expect(page.locator(".tag-programado")).toBeVisible();
    await expect(page.getByText("Se puede publicar cuando")).toBeVisible();

    await page.getByLabel("Nota para el feed público").fill("Bacheo con mezcla asfáltica en frío.");
    await page.getByLabel(/Materiales/).fill("2 sacos de mezcla INTERNO");
    await page.getByLabel(/Costo en Q/).fill("350.50");
    await page.getByRole("button", { name: "Guardar y marcar como tapado" }).click();
    await expect(page.getByText("Reparación registrada.")).toBeVisible();

    // Publicar sin foto de después debe fallar
    await page.getByRole("button", { name: "Publicar en el feed" }).click();
    await expect(page.getByText("Elige al menos una foto de después")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles([await file("despues.jpg", { r: 20, g: 22, b: 24 })]);
    await expect(page.getByAltText("Evidencia de la reparación")).toBeVisible({ timeout: 20000 });
    await page.getByRole("checkbox", { name: "Antes" }).check();
    await page.screenshot({ path: `${shots}/12-admin-detalle.png`, fullPage: true });
    await page.getByRole("button", { name: "Publicar en el feed" }).click();
    await expect(page.getByText("Publicado en el feed.")).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();

    const { data } = await service.from("report_status_history").select("status, changed_by").eq("report_id", reportId).order("created_at");
    expect(data!.map((h) => h.status)).toEqual(["recibido", "programado", "tapado"]);
    expect(data![2].changed_by).not.toBeNull();
  });

  test("público: feed, mapa y privacidad tras publicar", async ({ browser }) => {
    const ctx = await browser.newContext(mobile);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const res = await page.goto(`/tapados/${reportId}`);
    const html = await res!.text();
    for (const secret of [SECRET_NAME, SECRET_PHONE, "INTERNO", "350.5"]) expect(html).not.toContain(secret);
    await expect(page.getByText("Bacheo con mezcla asfáltica en frío.")).toBeVisible();

    await page.goto("/tapados");
    await expect(page.getByText("Bacheo con mezcla asfáltica en frío.").first()).toBeVisible();
    await expect(page.getByRole("slider", { name: "Comparar antes y después" }).first()).toBeAttached();
    await page.screenshot({ path: `${shots}/13-feed-mobile.png` });

    await page.getByRole("link", { name: "Mapa" }).click();
    await expect(page.locator(".pin-done").first()).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${shots}/14-mapa-resueltos.png` });

    await page.goto(`/seguimiento/${folio}`);
    await expect(page.getByRole("link", { name: "Ver fotos de la reparación" })).toBeVisible();
    await page.goto("/");
    await page.screenshot({ path: `${shots}/15-home-con-datos.png`, fullPage: true });
    expect(errors).toEqual([]);
    await ctx.close();

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktop.goto("/");
    await desktop.screenshot({ path: `${shots}/16-home-desktop.png`, fullPage: true });
    await desktop.close();
  });
});

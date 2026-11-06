import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { allow, anonHash, clientIp } from "@/lib/security";
import { serviceClient } from "@/lib/supabase/service";

const COOKIE = "bachea_device";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
  if (!(await allow("support", clientIp(request.headers), 3600, 20))) {
    return NextResponse.json({ error: "Alcanzaste el límite por hora. Inténtalo más tarde." }, { status: 429 });
  }
  const store = await cookies();
  const device = store.get(COOKIE)?.value ?? randomUUID();
  const { data, error } = await serviceClient()
    .rpc("add_support", { p_report: id, p_device: anonHash(`device:${device}`) })
    .maybeSingle();
  if (error) {
    console.error("add_support", error.message);
    return NextResponse.json({ error: "No se pudo registrar. Inténtalo de nuevo." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Este reporte ya no está abierto." }, { status: 404 });
  store.set(COOKIE, device, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return NextResponse.json(data);
}

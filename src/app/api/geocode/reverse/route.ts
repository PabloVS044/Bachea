import { NextResponse } from "next/server";
import { inServiceArea } from "@/lib/config";
import { allow, clientIp } from "@/lib/security";

// Pasa por el servidor para no revelar la IP de quien reporta al geocodificador.
export async function GET(request: Request) {
  const empty = NextResponse.json({ address: null, colonia: null, zona: null });
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inServiceArea(lat, lng)) return empty;
  if (!(await allow("geocode", clientIp(request.headers), 60, 10))) return empty;
  // Política de Nominatim: máximo 1 petición por segundo en todo el sitio.
  if (!(await allow("geocode-global", "sitio", 1, 1))) return empty;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({
      format: "jsonv2", lat: lat.toFixed(6), lon: lng.toFixed(6), zoom: "18", "accept-language": "es", addressdetails: "1",
    }).toString();
    const res = await fetch(url, {
      headers: { "User-Agent": `Bachea/0.1 (${process.env.NEXT_PUBLIC_SITE_URL ?? "reporte de baches"})` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const a = json.address ?? {};
    const zona = Number(/zona\s*(\d{1,2})/i.exec(json.display_name ?? "")?.[1]);
    const colonia = [a.neighbourhood, a.suburb, a.quarter, a.residential]
      .find((v: unknown) => typeof v === "string" && !/^zona\s*\d/i.test(v)) ?? null;
    return NextResponse.json({
      address: [a.road, a.house_number].filter(Boolean).join(" ") || null,
      colonia,
      zona: zona >= 1 && zona <= 25 ? zona : null,
    });
  } catch {
    return empty; // Es solo una ayuda: el formulario funciona sin esto.
  }
}

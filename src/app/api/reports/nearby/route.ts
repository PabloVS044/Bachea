import { NextResponse } from "next/server";
import { inServiceArea } from "@/lib/config";
import { allow, clientIp } from "@/lib/security";
import { serviceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inServiceArea(lat, lng)) {
    return NextResponse.json({ reports: [] });
  }
  if (!(await allow("nearby", clientIp(request.headers), 60, 30))) {
    return NextResponse.json({ reports: [] });
  }
  const { data, error } = await serviceClient().rpc("nearby_reports", { p_lat: lat, p_lng: lng, p_radius_m: 40 });
  if (error) {
    console.error("nearby_reports", error.message);
    return NextResponse.json({ reports: [] });
  }
  return NextResponse.json({ reports: data ?? [] });
}

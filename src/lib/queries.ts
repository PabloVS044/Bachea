import "server-only";
import { signPhotos } from "@/lib/images";
import { serviceClient } from "@/lib/supabase/service";
import type { Severity, Status } from "@/lib/config";

// Solo columnas públicas: nunca contacto, notas internas ni costos.
const PUBLIC_COLUMNS = "id, lat, lng, zona, colonia, severity, resolved_at, resolution_note, published_at, created_at";

export type PublishedReport = {
  id: string;
  lat: number;
  lng: number;
  zona: number | null;
  colonia: string | null;
  severity: Severity;
  resolved_at: string;
  resolution_note: string | null;
  published_at: string;
  created_at: string;
  before: string | null;
  after: string | null;
};

export const FEED_PAGE_SIZE = 12;

type Row = Omit<PublishedReport, "before" | "after">;

async function attachPhotos(rows: Row[]): Promise<PublishedReport[]> {
  if (!rows.length) return [];
  const { data: photos } = await serviceClient()
    .from("report_photos")
    .select("report_id, storage_path, kind")
    .in("report_id", rows.map((r) => r.id))
    .eq("is_public", true)
    .order("created_at");
  const list = photos ?? [];
  const urls = await signPhotos(list.map((p) => p.storage_path));
  const pick = (id: string, kind: string) => {
    const photo = list.find((p) => p.report_id === id && p.kind === kind);
    return photo ? urls.get(photo.storage_path) ?? null : null;
  };
  return rows.map((r) => ({ ...r, before: pick(r.id, "antes"), after: pick(r.id, "despues") }));
}

export async function getPublicStats() {
  const { data, error } = await serviceClient().rpc("public_stats").single();
  if (error) throw new Error(error.message);
  const s = data as { patched: number; received: number; zones: number; avg_days: number | null };
  return { patched: Number(s.patched), received: Number(s.received), zones: Number(s.zones), avgDays: s.avg_days === null ? null : Number(s.avg_days) };
}

export async function getFeed(page = 1, size = FEED_PAGE_SIZE) {
  const from = (page - 1) * size;
  const { data, count, error } = await serviceClient()
    .from("reports")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .range(from, from + size - 1);
  if (error) throw new Error(error.message);
  return { items: await attachPhotos((data ?? []) as Row[]), total: count ?? 0 };
}

export async function getPublishedPoints() {
  const { data, error } = await serviceClient()
    .from("reports")
    .select("id, lat, lng, zona, colonia, resolved_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPublished(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await serviceClient()
    .from("reports")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .not("published_at", "is", null)
    .maybeSingle();
  if (!data) return null;
  const [item] = await attachPhotos([data as Row]);
  return item;
}

export async function getTracking(folio: string) {
  const normalized = folio.trim().toUpperCase();
  if (!/^BCH-[A-Z0-9]{6}$/.test(normalized)) return null;
  const db = serviceClient();
  const { data: report } = await db
    .from("reports")
    .select("id, folio, zona, colonia, severity, status, support_count, published_at, created_at")
    .eq("folio", normalized)
    .maybeSingle();
  if (!report) return null;
  const { data: history } = await db
    .from("report_status_history")
    .select("status, created_at")
    .eq("report_id", report.id)
    .order("created_at");
  return {
    ...report,
    status: report.status as Status,
    history: (history ?? []) as { status: Status; created_at: string }[],
  };
}

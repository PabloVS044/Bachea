export const CITY = {
  name: "Ciudad de Guatemala",
  center: [14.6349, -90.5069] as [number, number],
  zoom: 13,
  // Área metropolitana: incluye Mixco, Villa Nueva, Santa Catarina Pinula, etc.
  bounds: { south: 14.35, north: 14.85, west: -90.85, east: -90.25 },
};

export const TIMEZONE = "America/Guatemala";
export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const PHOTO_BUCKET = "report-photos";
export const MAX_REPORT_PHOTOS = 3;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ZONES = Array.from({ length: 25 }, (_, i) => i + 1);

export function inServiceArea(lat: number, lng: number) {
  const b = CITY.bounds;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export const SEVERITIES = [
  { value: "leve", label: "Leve", hint: "Se puede esquivar" },
  { value: "moderado", label: "Moderado", hint: "Obliga a frenar" },
  { value: "peligroso", label: "Peligroso", hint: "Puede causar un accidente" },
] as const;

export const STATUSES = [
  { value: "recibido", label: "Recibido" },
  { value: "verificado", label: "Verificado" },
  { value: "programado", label: "Programado" },
  { value: "tapado", label: "Tapado" },
  { value: "descartado", label: "Descartado" },
] as const;

export const WORK_DAY_STATUSES = [
  { value: "planificada", label: "Planificada" },
  { value: "en_curso", label: "En curso" },
  { value: "completada", label: "Completada" },
] as const;

export type Severity = (typeof SEVERITIES)[number]["value"];
export type Status = (typeof STATUSES)[number]["value"];
export type WorkDayStatus = (typeof WORK_DAY_STATUSES)[number]["value"];

export const severityLabel = (v: string) => SEVERITIES.find((s) => s.value === v)?.label ?? v;
export const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v;
export const workDayLabel = (v: string) => WORK_DAY_STATUSES.find((s) => s.value === v)?.label ?? v;

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", year: "numeric", timeZone: TIMEZONE }).format(new Date(d));
export const formatDateTime = (d: string | Date) =>
  new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TIMEZONE }).format(new Date(d));
export const formatGtq = (n: number) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(n);

export function placeLabel(r: { zona?: number | null; colonia?: string | null }) {
  const parts = [r.zona ? `Zona ${r.zona}` : null, r.colonia || null].filter(Boolean);
  return parts.length ? parts.join(", ") : "Ciudad de Guatemala";
}

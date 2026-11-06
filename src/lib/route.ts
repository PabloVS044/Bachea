type Stop = { lat: number; lng: number };

const MAX_POINTS_PER_LINK = 10; // Google Maps admite origen, destino y hasta 8–9 paradas intermedias

/** Enlaces de ruta para Google Maps. Las jornadas largas se parten en tramos consecutivos. */
export function googleMapsRoutes(stops: Stop[]) {
  const links: string[] = [];
  const coord = (s: Stop) => `${s.lat.toFixed(6)},${s.lng.toFixed(6)}`;
  for (let i = 0; i < stops.length - 1 || (i === 0 && stops.length === 1); i += MAX_POINTS_PER_LINK - 1) {
    const chunk = stops.slice(i, i + MAX_POINTS_PER_LINK);
    const params = new URLSearchParams({ api: "1", travelmode: "driving" });
    params.set("destination", coord(chunk[chunk.length - 1]));
    if (chunk.length > 1) params.set("origin", coord(chunk[0]));
    const middle = chunk.slice(1, -1).map(coord).join("|");
    if (middle) params.set("waypoints", middle);
    links.push(`https://www.google.com/maps/dir/?${params.toString()}`);
  }
  return links;
}

/** Teléfono guatemalteco a formato wa.me; null si no parece válido. */
export function whatsappNumber(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 8) return `502${digits}`;
  if (digits.length === 11 && digits.startsWith("502")) return digits;
  return null;
}

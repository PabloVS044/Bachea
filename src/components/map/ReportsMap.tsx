"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { CITY, TILE_URL } from "@/lib/config";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  kind: "open" | "done" | "stop";
  severity?: string;
  order?: number;
  title: string;
  subtitle?: string;
  href?: string;
};

function icon(p: MapPoint) {
  if (p.kind === "done") {
    return L.divIcon({ className: "pin", html: '<span class="pin-done">✓</span>', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14] });
  }
  if (p.kind === "stop") {
    return L.divIcon({ className: "pin", html: `<span class="pin-stop">${Number(p.order) || ""}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] });
  }
  const severity = ["leve", "moderado", "peligroso"].includes(p.severity ?? "") ? p.severity : "leve";
  return L.divIcon({ className: "pin", html: `<span class="pin-open"><span class="hex sev-${severity}" style="font-size:27px"></span></span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  // Reencuadrar solo si cambian los puntos, no en cada render. Sin animación: desmontar el mapa
  // durante una animación de Leaflet lanza "_leaflet_pos".
  const signature = points.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    const coords = signature ? signature.split("|").map((c) => c.split(",").map(Number) as [number, number]) : [];
    if (coords.length === 1) map.setView(coords[0], 16, { animate: false });
    else if (coords.length > 1) map.fitBounds(coords, { padding: [36, 36], maxZoom: 16, animate: false });
  }, [map, signature]);
  return null;
}

export default function ReportsMap({ points, route = false }: { points: MapPoint[]; route?: boolean }) {
  const line = useMemo(
    () => points.filter((p) => p.kind === "stop").map((p) => [p.lat, p.lng] as [number, number]),
    [points],
  );
  return (
    <MapContainer center={CITY.center} zoom={CITY.zoom} className="size-full">
      <TileLayer url={TILE_URL} maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <FitBounds points={points} />
      {route && line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#121a13", weight: 3, dashArray: "8 8" }} />}
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p)}>
          <Popup>
            <strong>{p.title}</strong>
            {p.subtitle && <><br />{p.subtitle}</>}
            {p.href && <><br /><a href={p.href}>Ver detalle</a></>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

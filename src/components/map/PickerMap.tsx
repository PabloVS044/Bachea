"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CITY, TILE_URL } from "@/lib/config";

export type PickerTarget = { lat: number; lng: number; accuracy?: number; nonce: number };

function Controller({ target, onMove, onUserMove }: {
  target: PickerTarget | null;
  onMove: (lat: number, lng: number) => void;
  onUserMove: () => void;
}) {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove(c.lat, c.lng);
    },
    dragstart: onUserMove,
  });
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 18, { duration: 0.8 });
  }, [map, target]);
  return null;
}

export default function PickerMap(props: {
  target: PickerTarget | null;
  onMove: (lat: number, lng: number) => void;
  onUserMove: () => void;
}) {
  const b = CITY.bounds;
  return (
    <div className="relative size-full">
      <MapContainer center={CITY.center} zoom={CITY.zoom} minZoom={11} maxZoom={19} className="size-full"
        maxBounds={[[b.south - 0.05, b.west - 0.05], [b.north + 0.05, b.east + 0.05]]} zoomControl={false}>
        <TileLayer url={TILE_URL} maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {props.target?.accuracy && (
          <Circle center={[props.target.lat, props.target.lng]} radius={props.target.accuracy}
            pathOptions={{ color: "#4f8249", weight: 1, fillOpacity: 0.12 }} />
        )}
        <Controller {...props} />
      </MapContainer>
      {/* El mapa se mueve debajo del marcador: más preciso con el dedo que arrastrar un marcador */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full" aria-hidden>
        {/* Halo blanco: el verde de marca se perdería sobre parques y zonas verdes del mapa */}
        <div className="relative flex flex-col items-center [filter:drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_2px_3px_rgb(0_0_0/0.5))]">
          <span className="hex text-4xl" />
          <span className="-mt-1 h-5 w-1 bg-noche" />
        </div>
      </div>
    </div>
  );
}

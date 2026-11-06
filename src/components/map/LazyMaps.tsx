"use client";

import dynamic from "next/dynamic";

const placeholder = () => <div className="size-full animate-pulse bg-menta/30" />;

// Leaflet necesita window: no se puede renderizar en el servidor.
export const PickerMap = dynamic(() => import("./PickerMap"), { ssr: false, loading: placeholder });
export const ReportsMap = dynamic(() => import("./ReportsMap"), { ssr: false, loading: placeholder });

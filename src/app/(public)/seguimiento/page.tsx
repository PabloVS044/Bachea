import type { Metadata } from "next";
import { TrackForm } from "@/components/TrackForm";

export const metadata: Metadata = { title: "Seguimiento de reporte" };

export default function SeguimientoPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-5xl font-extrabold">Seguimiento</h1>
      <p className="mt-2 text-lg">Escribe el folio que recibiste al enviar tu reporte.</p>
      <TrackForm />
    </main>
  );
}

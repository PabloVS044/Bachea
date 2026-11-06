"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readFolios } from "@/lib/my-reports";

export function TrackForm({ notFound = false }: { notFound?: boolean }) {
  const router = useRouter();
  const [folio, setFolio] = useState("");
  const [mine, setMine] = useState<string[]>([]);
  useEffect(() => { queueMicrotask(() => setMine(readFolios())); }, []);

  return (
    <>
      <form className="mt-6" onSubmit={(e) => {
        e.preventDefault();
        const value = folio.trim().toUpperCase();
        if (value) router.push(`/seguimiento/${encodeURIComponent(value.startsWith("BCH-") ? value : `BCH-${value}`)}`);
      }}>
        <label className="label" htmlFor="folio">Folio</label>
        <div className="flex gap-2">
          <input id="folio" className="field uppercase" value={folio} onChange={(e) => setFolio(e.target.value)}
            placeholder="BCH-7K4M2P" autoComplete="off" autoCapitalize="characters" maxLength={10} required />
          <button className="btn btn-dark shrink-0">Buscar</button>
        </div>
        {notFound && <p role="alert" className="mt-2 font-semibold text-danger">No encontramos ese folio. Revisa que esté bien escrito.</p>}
      </form>
      {mine.length > 0 && (
        <section className="mt-8">
          <h2 className="text-3xl">Reportes de este teléfono</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {mine.map((f) => <li key={f}><Link href={`/seguimiento/${f}`} className="plate text-xl hover:bg-claro">{f}</Link></li>)}
          </ul>
        </section>
      )}
    </>
  );
}

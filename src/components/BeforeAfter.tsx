"use client";

import { useState } from "react";

/* eslint-disable @next/next/no-img-element -- URLs firmadas de vida corta, sin optimizador */
export function BeforeAfter({ before, after, alt }: { before: string | null; after: string | null; alt: string }) {
  const [split, setSplit] = useState(50);

  if (!before || !after) {
    const src = after ?? before;
    return (
      <div className="relative aspect-[4/3] bg-menta/30">
        {src && <img src={src} alt={`${after ? "Después" : "Antes"}: ${alt}`} loading="lazy" className="size-full object-cover" />}
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] select-none overflow-hidden bg-menta/30">
      <img src={after} alt={`Después: ${alt}`} loading="lazy" className="absolute inset-0 size-full object-cover" />
      <img src={before} alt={`Antes: ${alt}`} loading="lazy" className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
      <span className="tag absolute left-2 top-2 bg-noche text-white">Antes</span>
      <span className="tag tag-tapado absolute right-2 top-2">Después</span>
      <div className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white" style={{ left: `${split}%` }}>
        <span className="hex absolute! left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl" aria-hidden />
      </div>
      <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))}
        aria-label="Comparar antes y después"
        className="absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0" />
    </div>
  );
}

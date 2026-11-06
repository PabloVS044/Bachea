"use client";

/* eslint-disable @next/next/no-img-element -- vistas previas locales (blob:) */
import { ArrowLeft, Camera, Check, Copy, Crosshair, LoaderCircle, Share2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PickerMap } from "@/components/map/LazyMaps";
import type { PickerTarget } from "@/components/map/PickerMap";
import { compressImage } from "@/lib/compress-image";
import { CITY, inServiceArea, MAX_REPORT_PHOTOS, SEVERITIES, severityLabel, ZONES, type Severity } from "@/lib/config";
import { rememberFolio } from "@/lib/my-reports";

type Nearby = { id: string; severity: string; status: string; support_count: number; created_at: string; distance_m: number };
type Photo = { file: File; url: string };
type Done = { kind: "nuevo" | "apoyo"; folio: string; count?: number };

const STEPS = ["Ubicación", "Detalles", "Enviar"];

export function ReportWizard() {
  const [step, setStep] = useState(0);
  const [center, setCenter] = useState<[number, number]>(CITY.center);
  const [target, setTarget] = useState<PickerTarget | null>(null);
  const [source, setSource] = useState<"gps" | "mapa" | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [nearby, setNearby] = useState<Nearby[]>([]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [zona, setZona] = useState("");
  const [colonia, setColonia] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // campo trampa

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Liberar las vistas previas al salir
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const inArea = inServiceArea(center[0], center[1]);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGpsMessage("Este teléfono no permite usar GPS aquí. Mueve el mapa hasta el bache.");
      return;
    }
    setLocating(true);
    setGpsMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!inServiceArea(coords.latitude, coords.longitude)) {
          setGpsMessage("Tu ubicación está fuera del área que atendemos. Mueve el mapa hasta el bache.");
          return;
        }
        setTarget({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, nonce: Date.now() });
        setCenter([coords.latitude, coords.longitude]);
        setSource("gps");
        setGpsMessage(`Ubicación encontrada con ${Math.round(coords.accuracy)} m de margen. Ajusta el mapa si hace falta.`);
      },
      (e) => {
        setLocating(false);
        setGpsMessage(e.code === e.PERMISSION_DENIED
          ? "No diste permiso de ubicación. Actívalo en tu navegador o mueve el mapa hasta el bache."
          : "No se pudo obtener tu ubicación. Sal a un lugar abierto o mueve el mapa hasta el bache.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }

  async function continueFromMap() {
    setChecking(true);
    const [lat, lng] = center;
    fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((g) => {
        if (g.zona) setZona((v) => v || String(g.zona));
        if (g.colonia) setColonia((v) => v || g.colonia);
        if (g.address) setAddress(g.address);
      })
      .catch(() => {});
    try {
      const res = await fetch(`/api/reports/nearby?lat=${lat}&lng=${lng}`);
      const { reports } = await res.json();
      if (reports?.length) {
        setNearby(reports);
        return;
      }
    } catch { /* si la verificación falla, se puede reportar igual */ }
    finally { setChecking(false); }
    setStep(1);
  }

  async function support(id: string) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}/support`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      rememberFolio(json.folio);
      setDone({ kind: "apoyo", folio: json.folio, count: json.support_count });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se pudo registrar. Revisa tu conexión.");
    } finally {
      setSending(false);
    }
  }

  async function addPhotos(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setPhotoBusy(true);
    const room = MAX_REPORT_PHOTOS - photos.length;
    const added: Photo[] = [];
    let unreadable = false;
    for (const file of Array.from(list).slice(0, room)) {
      try {
        const small = await compressImage(file);
        added.push({ file: small, url: URL.createObjectURL(small) });
      } catch {
        unreadable = true;
      }
    }
    setPhotos((p) => [...p, ...added]);
    if (unreadable) setError("Una foto no se pudo leer. Prueba tomarla con la cámara o usa JPG o PNG.");
    else if (list.length > room) setError(`Puedes adjuntar hasta ${MAX_REPORT_PHOTOS} fotos.`);
    setPhotoBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url);
    setPhotos((p) => p.filter((x) => x.url !== url));
  }

  async function send() {
    setSending(true);
    setError(null);
    const form = new FormData();
    form.set("lat", String(center[0]));
    form.set("lng", String(center[1]));
    form.set("source", source ?? "mapa");
    if (source === "gps" && target?.accuracy) form.set("accuracy", String(target.accuracy));
    form.set("severity", severity!);
    form.set("zona", zona);
    form.set("colonia", colonia);
    form.set("address", address);
    form.set("description", description);
    form.set("name", name);
    form.set("phone", phone);
    form.set("website", website);
    photos.forEach((p) => form.append("photos", p.file));
    try {
      const res = await fetch("/api/reports", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      rememberFolio(json.folio);
      setDone({ kind: "nuevo", folio: json.folio });
    } catch (e) {
      setError(e instanceof Error && e.message && !e.message.includes("fetch")
        ? e.message
        : "No se pudo enviar. Revisa tu conexión; tus datos siguen aquí.");
    } finally {
      setSending(false);
    }
  }

  if (done) return <Success done={done} />;

  const header = (
    <header className="asphalt on-asphalt shrink-0 px-4 pb-3 pt-3">
      <div className="flex items-center gap-3">
        {step === 0
          ? <Link href="/" aria-label="Cancelar y volver al inicio" className="grid size-10 place-items-center rounded hover:bg-white/10"><X /></Link>
          : <button type="button" onClick={() => { setError(null); setStep(step - 1); }} aria-label="Volver al paso anterior" className="grid size-10 place-items-center rounded hover:bg-white/10"><ArrowLeft /></button>}
        <h1 className="text-2xl">{STEPS[step]}</h1>
        <span className="ml-auto text-sm text-white/75">Paso {step + 1} de {STEPS.length}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2" aria-hidden>
        {STEPS.map((s, i) => <span key={s} className={`h-1.5 ${i <= step ? "bg-menta" : "bg-white/20"}`} />)}
      </div>
    </header>
  );

  if (step === 0) {
    return (
      <div className="flex h-dvh flex-col">
        {header}
        <div className="relative min-h-0 flex-1">
          <PickerMap target={target}
            onMove={(lat, lng) => setCenter([lat, lng])}
            onUserMove={() => setSource("mapa")} />
          <button type="button" onClick={locate} disabled={locating}
            className="btn btn-dark absolute right-3 top-3 z-[600] shadow-lg">
            {locating ? <LoaderCircle className="animate-spin" size={20} /> : <Crosshair size={20} />}
            {locating ? "Buscando…" : "Usar mi GPS"}
          </button>
        </div>
        <div className="shrink-0 space-y-3 bg-fondo p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[0.95rem]" role="status">
            {gpsMessage ?? "Activa el GPS o mueve el mapa hasta que el marcador quede sobre el bache."}
          </p>
          {!inArea && <p className="font-semibold text-danger">Por ahora solo atendemos el área metropolitana de Ciudad de Guatemala.</p>}
          <button type="button" className="btn btn-primary w-full" disabled={!source || !inArea || checking} onClick={continueFromMap}>
            {checking && <LoaderCircle className="animate-spin" size={20} />}
            Confirmar ubicación
          </button>
        </div>

        {nearby.length > 0 && (
          <div className="fixed inset-0 z-[1100] flex items-end bg-noche/60" role="dialog" aria-modal="true" aria-labelledby="dup-title">
            <div className="max-h-[85dvh] w-full overflow-auto rounded-t-xl bg-fondo p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <h2 id="dup-title" className="text-3xl">¿Es este bache?</h2>
              <p className="mt-1 text-gris">Ya hay {nearby.length === 1 ? "un reporte" : `${nearby.length} reportes`} muy cerca. Si es el mismo, súmate para darle prioridad.</p>
              <ul className="mt-4 space-y-3">
                {nearby.map((r) => (
                  <li key={r.id} className="rounded-md border-2 border-linea/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <span className={`hex sev-${r.severity}`} aria-hidden />
                        {severityLabel(r.severity)}, a {Math.round(r.distance_m)} m
                      </span>
                      <span className="hint">{r.support_count + 1} {r.support_count === 0 ? "reporte" : "reportes"}</span>
                    </div>
                    <button type="button" className="btn btn-primary mt-3 w-full" disabled={sending} onClick={() => support(r.id)}>
                      Yo también lo vi
                    </button>
                  </li>
                ))}
              </ul>
              {error && <p role="alert" className="mt-3 font-semibold text-danger">{error}</p>}
              <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => { setNearby([]); setError(null); setStep(1); }}>
                Es otro bache, seguir con mi reporte
              </button>
              <button type="button" className="btn mt-1 w-full text-gris" onClick={() => { setNearby([]); setError(null); }}>
                Volver al mapa
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 1) {
    const ready = photos.length > 0 && severity;
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <form className="mx-auto w-full max-w-xl flex-1 space-y-6 p-4" onSubmit={(e) => { e.preventDefault(); if (ready) setStep(2); }}>
          <section>
            <h2 className="label text-base text-noche" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>Fotos del bache</h2>
            <p className="hint mb-2">Al menos una, hasta {MAX_REPORT_PHOTOS}. Evita que salgan rostros o placas.</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative aspect-square overflow-hidden rounded-md bg-menta/30">
                  <img src={p.url} alt={`Foto ${i + 1} del bache`} className="size-full object-cover" />
                  <button type="button" onClick={() => removePhoto(p.url)} aria-label={`Quitar foto ${i + 1}`}
                    className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-noche/85 text-white"><X size={18} /></button>
                </div>
              ))}
              {photos.length < MAX_REPORT_PHOTOS && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-dashed border-linea bg-claro text-center text-sm font-semibold focus-within:outline-3 focus-within:outline-bachea-dark">
                  <span className="flex flex-col items-center gap-1">
                    {photoBusy ? <LoaderCircle className="animate-spin" /> : <Camera />}
                    Agregar foto
                  </span>
                  <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" disabled={photoBusy}
                    onChange={(e) => addPhotos(e.target.files)} />
                </label>
              )}
            </div>
          </section>

          <fieldset>
            <legend className="label">¿Qué tan grave es?</legend>
            <div className="grid gap-2">
              {SEVERITIES.map((s) => (
                <label key={s.value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border-2 bg-claro px-4 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-bachea-dark ${severity === s.value ? "border-noche" : "border-transparent"}`}>
                  <input type="radio" name="severity" value={s.value} checked={severity === s.value} onChange={() => setSeverity(s.value)} className="sr-only" />
                  <span className={`hex sev-${s.value}`} style={{ fontSize: "1.2rem" }} aria-hidden />
                  <span className="ml-1"><strong className="font-semibold">{s.label}</strong><br /><span className="hint">{s.hint}</span></span>
                  {severity === s.value && <Check className="ml-auto" aria-hidden />}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            <div>
              <label className="label" htmlFor="zona">Zona</label>
              <select id="zona" className="field" value={zona} onChange={(e) => setZona(e.target.value)}>
                <option value="">No sé</option>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="colonia">Colonia o barrio</label>
              <input id="colonia" className="field" maxLength={120} value={colonia} onChange={(e) => setColonia(e.target.value)} autoComplete="off" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="address">Calle o punto de referencia</label>
            <input id="address" className="field" maxLength={240} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej.: 5a. avenida, frente a la farmacia" autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="description">Algo más que debamos saber <span className="font-normal text-gris">(opcional)</span></label>
            <textarea id="description" className="field" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tamaño, si se llena de agua, carril…" />
          </div>
          {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={!ready}>Continuar</button>
          {!ready && <p className="hint -mt-3 text-center">Falta {photos.length === 0 ? "agregar una foto" : "elegir la gravedad"}.</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <form className="mx-auto w-full max-w-xl flex-1 space-y-5 p-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <section className="rounded-md bg-claro p-4">
          <h2 className="text-2xl">Tu reporte</h2>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between gap-4"><dt className="text-gris">Gravedad</dt><dd className="font-semibold">{severityLabel(severity!)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gris">Lugar</dt><dd className="text-right font-semibold">{[zona && `Zona ${zona}`, colonia].filter(Boolean).join(", ") || "Marcado en el mapa"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gris">Ubicación</dt><dd className="font-semibold">{source === "gps" ? "GPS" : "Elegida en el mapa"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gris">Fotos</dt><dd className="font-semibold">{photos.length}</dd></div>
          </dl>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl">¿Te avisamos si hace falta?</h2>
            <p className="hint mt-1">Opcional. Solo nuestro equipo lo verá, nunca se publica. Lo usamos si necesitamos ubicar mejor el bache.</p>
          </div>
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono o WhatsApp</label>
            <input id="phone" className="field" type="tel" inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="5555 5555" />
          </div>
          <div className="absolute -left-[9999px]" aria-hidden>
            <label>Sitio web <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
          </div>
        </section>
        {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
        <button className="btn btn-primary w-full" disabled={sending}>
          {sending && <LoaderCircle className="animate-spin" size={20} />}
          {sending ? "Enviando…" : "Enviar reporte"}
        </button>
      </form>
    </div>
  );
}

function Success({ done }: { done: Done }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const url = () => `${location.origin}/seguimiento/${done.folio}`;

  return (
    <div className="asphalt on-asphalt flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-5xl">{done.kind === "nuevo" ? "Reporte enviado" : "Te sumamos a este reporte"}</h1>
        <p className="mt-3 text-lg text-white/85">
          {done.kind === "nuevo"
            ? "Vamos a revisarlo y programar la reparación. Guarda este folio para ver cómo avanza."
            : `Ya son ${(done.count ?? 0) + 1} reportes de este bache. Con este folio puedes ver cómo avanza.`}
        </p>
        <p className="mt-6"><span className="plate text-4xl">{done.folio}</span></p>
        <div className="mt-6 grid gap-3">
          <Link href={`/seguimiento/${done.folio}`} className="btn btn-primary">Ver seguimiento</Link>
          <button type="button" className="btn btn-ghost" onClick={async () => {
            try { await navigator.clipboard.writeText(done.folio); setCopied(true); } catch { /* el folio sigue visible */ }
          }}>
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? "Folio copiado" : "Copiar folio"}
          </button>
          {canShare && (
            <button type="button" className="btn btn-ghost" onClick={() => {
              navigator.share({ title: "Reporte de bache", url: url() }).catch(() => {});
            }}>
              <Share2 size={20} /> Compartir
            </button>
          )}
          <Link href="/" className="btn">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}

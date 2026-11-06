import Link from "next/link";
import { SeverityTag, StatusTag } from "@/components/Badges";
import { ReportsMap } from "@/components/map/LazyMaps";
import { formatDate, SEVERITIES, STATUSES, ZONES } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/server";

type Search = { estado?: string; gravedad?: string; zona?: string; q?: string; orden?: string };
const OPEN = ["recibido", "verificado", "programado"];
const LIMIT = 500;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const estado = params.estado ?? "abiertos";
  const orden = params.orden === "recientes" ? "recientes" : "prioridad";

  let query = supabase.from("reports")
    .select("id, folio, lat, lng, zona, colonia, address, severity, status, support_count, created_at, published_at, work_days(title)", { count: "exact" });
  if (estado === "abiertos") query = query.in("status", OPEN);
  else if (STATUSES.some((s) => s.value === estado)) query = query.eq("status", estado);
  if (SEVERITIES.some((s) => s.value === params.gravedad)) query = query.eq("severity", params.gravedad!);
  const zona = Number(params.zona);
  if (zona >= 1 && zona <= 25) query = query.eq("zona", zona);
  const q = (params.q ?? "").replace(/[^\p{L}\p{N} -]/gu, "").trim();
  if (q) query = query.or(`folio.ilike.%${q}%,colonia.ilike.%${q}%,address.ilike.%${q}%`);
  query = orden === "prioridad"
    ? query.order("severity", { ascending: false }).order("support_count", { ascending: false }).order("created_at")
    : query.order("created_at", { ascending: false });

  const [{ data, count, error }, statusRows] = await Promise.all([
    query.limit(LIMIT),
    supabase.from("reports").select("status"),
  ]);
  if (error) throw new Error(error.message);
  const reports = (data ?? []) as unknown as {
    id: string; folio: string; lat: number; lng: number; zona: number | null; colonia: string | null; address: string | null;
    severity: string; status: string; support_count: number; created_at: string; published_at: string | null;
    work_days: { title: string } | null;
  }[];

  const counts: Record<string, number> = {};
  for (const row of statusRows.data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const openTotal = OPEN.reduce((n, s) => n + (counts[s] ?? 0), 0);

  const tabs = [{ value: "abiertos", label: "Abiertos", n: openTotal }, ...STATUSES.map((s) => ({ value: s.value as string, label: s.label, n: counts[s.value] ?? 0 }))];
  const tabHref = (value: string) => {
    const next = new URLSearchParams();
    next.set("estado", value);
    if (params.gravedad) next.set("gravedad", params.gravedad);
    if (params.zona) next.set("zona", params.zona);
    if (params.q) next.set("q", params.q);
    if (params.orden) next.set("orden", params.orden);
    return `/admin?${next}`;
  };

  return (
    <main>
      <h1 className="text-4xl font-extrabold">Reportes</h1>
      <nav className="mt-3 flex flex-wrap gap-1" aria-label="Filtrar por estado">
        {tabs.map((t) => (
          <Link key={t.value} href={tabHref(t.value)} aria-current={estado === t.value ? "page" : undefined}
            className={`rounded px-3 py-1.5 font-medium ${estado === t.value ? "bg-noche text-white" : "bg-claro hover:bg-menta/40"}`}>
            {t.label} <span className="ml-1 font-bold tabular-nums">{t.n}</span>
          </Link>
        ))}
      </nav>

      <form className="mt-3 flex flex-wrap items-end gap-2" role="search">
        <input type="hidden" name="estado" value={estado} />
        <div><label className="hint block" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={params.q} className="field field-sm w-60" placeholder="Folio, colonia o calle" /></div>
        <div><label className="hint block" htmlFor="gravedad">Gravedad</label>
          <select id="gravedad" name="gravedad" defaultValue={params.gravedad ?? ""} className="field field-sm w-36"><option value="">Todas</option>{SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
        <div><label className="hint block" htmlFor="zona">Zona</label>
          <select id="zona" name="zona" defaultValue={params.zona ?? ""} className="field field-sm w-28"><option value="">Todas</option>{ZONES.map((z) => <option key={z} value={z}>Zona {z}</option>)}</select></div>
        <div><label className="hint block" htmlFor="orden">Orden</label>
          <select id="orden" name="orden" defaultValue={orden} className="field field-sm w-40"><option value="prioridad">Mayor prioridad</option><option value="recientes">Más recientes</option></select></div>
        <button className="btn btn-dark btn-sm">Aplicar</button>
        <Link href="/admin" className="btn btn-sm underline">Limpiar</Link>
      </form>

      <div className="mt-4 grid grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] items-start gap-4">
        <div className="overflow-hidden rounded-md bg-claro">
          <table className="w-full text-left text-[0.95rem]">
            <thead className="bg-menta text-sm">
              <tr>
                <th className="px-3 py-2 font-semibold">Folio</th>
                <th className="px-3 py-2 font-semibold">Gravedad</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Lugar</th>
                <th className="px-3 py-2 text-right font-semibold" title="Personas que reportaron este bache">Reportes</th>
                <th className="px-3 py-2 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-linea/40 hover:bg-fondo/60">
                  <td className="px-3 py-2 font-semibold whitespace-nowrap"><Link href={`/admin/reportes/${r.id}`} className="underline underline-offset-3">{r.folio}</Link></td>
                  <td className="px-3 py-2"><SeverityTag severity={r.severity} /></td>
                  <td className="px-3 py-2"><StatusTag status={r.status} />{r.published_at && <span className="hint ml-1.5">publicado</span>}</td>
                  <td className="px-3 py-2">
                    {[r.zona && `Z${r.zona}`, r.colonia].filter(Boolean).join(", ") || r.address || "Sin dato"}
                    {r.work_days && <div className="hint">{r.work_days.title}</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.support_count + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!reports.length && <p className="p-6 text-gris">No hay reportes con estos filtros.</p>}
          {(count ?? 0) > LIMIT && <p className="hint border-t border-linea/40 p-3">Se muestran {LIMIT} de {count}. Usa los filtros para acotar.</p>}
        </div>
        <div className="sticky top-6 h-[calc(100dvh-3rem)] overflow-hidden rounded-md">
          <ReportsMap points={reports.map((r) => ({
            id: r.id, lat: r.lat, lng: r.lng,
            kind: r.status === "tapado" ? "done" : "open",
            severity: r.severity,
            title: r.folio,
            subtitle: [r.zona && `Zona ${r.zona}`, r.colonia].filter(Boolean).join(", "),
            href: `/admin/reportes/${r.id}`,
          }))} />
        </div>
      </div>
    </main>
  );
}

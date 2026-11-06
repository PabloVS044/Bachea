import Link from "next/link";
import { createWorkDay } from "@/app/admin/actions";
import { Flash } from "@/components/admin/Flash";
import { formatDate, workDayLabel } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/server";

export default async function WorkDaysPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireAdmin();
  const flash = await searchParams;
  const [{ data }, { data: crews }] = await Promise.all([
    supabase.from("work_days").select("id, title, scheduled_on, status, crews(name), reports(status)").order("scheduled_on", { ascending: false }).limit(200),
    supabase.from("crews").select("id, name").eq("active", true).order("name"),
  ]);
  const days = (data ?? []) as unknown as { id: string; title: string; scheduled_on: string; status: string; crews: { name: string } | null; reports: { status: string }[] }[];

  return (
    <main className="max-w-5xl">
      <h1 className="text-4xl font-extrabold">Jornadas</h1>
      <p className="mt-1 text-gris">Agrupa baches en una salida de trabajo, asigna cuadrilla y genera la ruta.</p>
      <div className="mt-4"><Flash {...flash} /></div>
      <form action={createWorkDay} className="flex items-end gap-3 rounded-md bg-claro p-4">
        <div className="flex-1"><label className="label" htmlFor="title">Nombre</label><input id="title" name="title" required maxLength={120} className="field field-sm" placeholder="Ej.: Zona 7, sábado por la mañana" /></div>
        <div><label className="label" htmlFor="scheduled_on">Fecha</label><input id="scheduled_on" name="scheduled_on" type="date" required className="field field-sm" /></div>
        <div className="w-52"><label className="label" htmlFor="crew_id">Cuadrilla</label>
          <select id="crew_id" name="crew_id" className="field field-sm"><option value="">Sin asignar</option>{(crews ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <button className="btn btn-dark btn-sm">Crear jornada</button>
      </form>

      <div className="mt-4 overflow-hidden rounded-md bg-claro">
        <table className="w-full text-left">
          <thead className="bg-menta text-sm"><tr>
            <th className="px-3 py-2 font-semibold">Jornada</th><th className="px-3 py-2 font-semibold">Fecha</th><th className="px-3 py-2 font-semibold">Cuadrilla</th><th className="px-3 py-2 font-semibold">Estado</th><th className="px-3 py-2 text-right font-semibold">Baches tapados</th>
          </tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.id} className="border-t border-linea/40">
                <td className="px-3 py-2 font-semibold"><Link className="underline underline-offset-3" href={`/admin/jornadas/${d.id}`}>{d.title}</Link></td>
                <td className="px-3 py-2">{formatDate(`${d.scheduled_on}T12:00:00Z`)}</td>
                <td className="px-3 py-2">{d.crews?.name ?? "Sin asignar"}</td>
                <td className="px-3 py-2">{workDayLabel(d.status)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.reports.filter((r) => r.status === "tapado").length} de {d.reports.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!days.length && <p className="p-6 text-gris">Crea la primera jornada para empezar a programar baches.</p>}
      </div>
    </main>
  );
}

import { createCrew, toggleCrew } from "@/app/admin/actions";
import { Flash } from "@/components/admin/Flash";
import { requireAdmin } from "@/lib/supabase/server";

export default async function CrewsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase } = await requireAdmin();
  const flash = await searchParams;
  const { data: crews } = await supabase.from("crews").select("id, name, phone, active").order("active", { ascending: false }).order("name");
  return (
    <main className="max-w-3xl">
      <h1 className="text-4xl font-extrabold">Cuadrillas</h1>
      <div className="mt-4"><Flash {...flash} /></div>
      <form action={createCrew} className="flex items-end gap-3 rounded-md bg-claro p-4">
        <div className="flex-1"><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required maxLength={80} className="field field-sm" placeholder="Ej.: Cuadrilla norte" /></div>
        <div className="w-44"><label className="label" htmlFor="phone">WhatsApp</label><input id="phone" name="phone" type="tel" className="field field-sm" placeholder="5555 5555" /></div>
        <button className="btn btn-dark btn-sm">Agregar cuadrilla</button>
      </form>
      <ul className="mt-4 divide-y divide-linea/40 overflow-hidden rounded-md bg-claro">
        {(crews ?? []).map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1"><span className="font-semibold">{c.name}</span>{c.phone && <span className="ml-3 text-gris">{c.phone}</span>}</div>
            {!c.active && <span className="tag tag-descartado">Inactiva</span>}
            <form action={toggleCrew}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="active" value={String(!c.active)} />
              <button className="btn btn-ghost btn-sm">{c.active ? "Desactivar" : "Activar"}</button>
            </form>
          </li>
        ))}
        {!crews?.length && <li className="p-6 text-gris">Agrega tu primera cuadrilla para asignarla a jornadas.</li>}
      </ul>
    </main>
  );
}

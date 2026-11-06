import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { FeedCard } from "@/components/FeedCard";
import { getFeed, getPublicStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Márcalo en el mapa", text: "Usa el GPS de tu teléfono o mueve el mapa hasta el bache." },
  { title: "Agrega una foto", text: "No necesitas cuenta. Tu contacto es opcional y nunca se publica." },
  { title: "Sigue tu folio", text: "Mira cuándo se recibe, se programa y se tapa." },
];

export default async function HomePage() {
  const [stats, feed] = await Promise.all([getPublicStats(), getFeed(1, 3)]);

  return (
    <main>
      <section className="asphalt on-asphalt relative overflow-hidden">
        <div className="road-line absolute inset-y-0 left-5 md:left-[calc(50%-34rem)]" aria-hidden />
        <Image src="/brand/isotipo.png" alt="" width={363} height={430} priority
          className="absolute right-[max(1.5rem,calc(50%-34rem))] top-1/2 hidden h-[23rem] w-auto -translate-y-1/2 lg:block" />
        <div className="mx-auto max-w-6xl py-6 pl-12 pr-5 md:py-20 md:pl-14 md:pr-6">
          <Brand className="md:hidden" />
          <h1 className="mt-12 text-[3.6rem] font-extrabold leading-[0.92] sm:text-7xl md:mt-0 md:text-[6rem] lg:max-w-[42rem]">
            ¿Hay un bache en tu colonia?
          </h1>
          <p className="mt-5 max-w-md text-xl text-white/85">
            Márcalo en el mapa y nuestro equipo va a taparlo. Después publicamos la evidencia aquí.
          </p>
          <Link href="/reportar" className="btn btn-primary mt-8 w-full text-xl sm:w-auto sm:px-8">Reportar un bache</Link>
          <p className="mt-3 text-white/70">Ciudad de Guatemala y área metropolitana</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-8 md:px-6 md:pt-12">
        <div className="highway-sign">
          <dl className="highway-sign-inner grid grid-cols-3 divide-x divide-white/40 py-3">
            <div className="px-2 text-center"><dd className="text-5xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{stats.patched}</dd><dt className="text-sm leading-tight">{stats.patched === 1 ? "bache tapado" : "baches tapados"}</dt></div>
            <div className="px-2 text-center"><dd className="text-5xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{stats.zones}</dd><dt className="text-sm leading-tight">{stats.zones === 1 ? "zona atendida" : "zonas atendidas"}</dt></div>
            <div className="px-2 text-center"><dd className="text-5xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{stats.avgDays === null ? "–" : stats.avgDays < 1 ? "<1" : stats.avgDays}</dd><dt className="text-sm leading-tight">{stats.avgDays === 1 ? "día en promedio" : "días en promedio"}</dt></div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-10 md:px-6 md:pt-14">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2 className="text-4xl">Últimos baches tapados</h2>
          {feed.total > 0 && <Link href="/tapados" className="shrink-0 font-semibold underline underline-offset-4">Ver todos y el mapa</Link>}
        </div>
        {feed.items.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {feed.items.map((item) => <FeedCard key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="mt-3 max-w-prose text-gris">Aquí vas a ver cada reparación con sus fotos de antes y después. Empieza reportando el bache que te queda más cerca.</p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-14">
        <h2 className="text-4xl">Cómo reportar</h2>
        <ol className="relative mt-5 space-y-6 pl-11 md:grid md:grid-cols-3 md:gap-6 md:space-y-0 md:pl-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="absolute -left-11 grid size-8 place-items-center rounded-full bg-noche font-bold text-menta md:static md:mb-2" aria-hidden>{i + 1}</span>
              <h3 className="text-2xl">{s.title}</h3>
              <p className="mt-1 text-gris">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

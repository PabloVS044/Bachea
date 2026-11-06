"use client";

import { CheckCircle2, House, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";

const LINKS = [
  { href: "/", label: "Inicio", Icon: House },
  { href: "/reportar", label: "Reportar", Icon: Plus },
  { href: "/tapados", label: "Tapados", Icon: CheckCircle2 },
  { href: "/seguimiento", label: "Seguimiento", Icon: Search },
];

export function PublicNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  if (path === "/reportar") return null; // El asistente usa toda la pantalla

  return (
    <>
      <header className="asphalt on-asphalt hidden md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Brand />
          <nav className="flex items-center gap-1" aria-label="Principal">
            {LINKS.filter((l) => l.href !== "/reportar").map((l) => (
              <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded px-3 py-2 font-medium hover:bg-white/10 ${isActive(l.href) ? "underline decoration-menta decoration-3 underline-offset-6" : ""}`}>
                {l.label}
              </Link>
            ))}
            <Link href="/reportar" className="btn btn-primary btn-sm ml-3">Reportar un bache</Link>
          </nav>
        </div>
      </header>
      <nav aria-label="Principal"
        className="on-asphalt fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-4 bg-noche pb-[env(safe-area-inset-bottom)] text-white md:hidden">
        {LINKS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          const primary = href === "/reportar";
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${primary ? "bg-bachea text-white" : active ? "text-menta" : "text-white/80"}`}>
              <Icon size={22} aria-hidden strokeWidth={primary ? 3 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

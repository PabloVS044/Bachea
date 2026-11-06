"use client";

import { ClipboardList, LogOut, Route, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { Brand } from "@/components/Brand";

const LINKS = [
  { href: "/admin", label: "Reportes", Icon: ClipboardList, match: (p: string) => p === "/admin" || p.startsWith("/admin/reportes") },
  { href: "/admin/jornadas", label: "Jornadas", Icon: Route, match: (p: string) => p.startsWith("/admin/jornadas") },
  { href: "/admin/cuadrillas", label: "Cuadrillas", Icon: Users, match: (p: string) => p.startsWith("/admin/cuadrillas") },
];

export function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  return (
    <aside className="asphalt on-asphalt sticky top-0 flex h-dvh w-56 shrink-0 flex-col p-4">
      <Brand href="/admin" />
      <nav className="mt-6 space-y-1" aria-label="Panel">
        {LINKS.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded px-3 py-2 font-medium ${active ? "bg-bachea text-white" : "hover:bg-white/10"}`}>
              <Icon size={19} aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-sm">
        <Link href="/" target="_blank" className="block rounded px-3 py-2 hover:bg-white/10">Ver sitio público</Link>
        <p className="truncate px-3 py-1 text-white/60" title={email}>{email}</p>
        <form action={logout}>
          <button className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 hover:bg-white/10"><LogOut size={16} aria-hidden /> Cerrar sesión</button>
        </form>
      </div>
    </aside>
  );
}

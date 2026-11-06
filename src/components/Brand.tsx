import Image from "next/image";
import Link from "next/link";

/** Logo completo para fondos oscuros: isotipo, línea y letras en blanco. */
export function Brand({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="Bachea, ir al inicio" className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/brand/isotipo.png" alt="" width={363} height={430} priority className="h-9 w-auto" />
      <span className="h-8 w-px bg-white/70" aria-hidden />
      <Image src="/brand/letras-blanco.png" alt="" width={585} height={95} priority className="h-4 w-auto" />
    </Link>
  );
}

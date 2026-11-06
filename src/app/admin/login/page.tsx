import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Panel: iniciar sesión", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="asphalt on-asphalt grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <Brand className="mb-6" />
        <h1 className="text-5xl font-extrabold">Panel de administración</h1>
        <LoginForm notAllowed={error === "sin-permiso"} />
      </div>
    </main>
  );
}

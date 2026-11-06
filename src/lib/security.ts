import "server-only";
import { createHmac } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";

export function clientIp(headers: Headers) {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconocida"
  );
}

/** No guardamos IP ni identificadores de dispositivo en claro. */
export function anonHash(value: string) {
  const secret = process.env.HASH_SECRET;
  if (!secret) throw new Error("Falta HASH_SECRET");
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** true si la acción está permitida. Si el limitador falla, deja pasar: no bloquea reportes reales. */
export async function allow(action: string, identifier: string, windowSeconds: number, max: number) {
  const { data, error } = await serviceClient().rpc("rate_limit_hit", {
    p_key: `${action}:${anonHash(identifier)}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("rate_limit_hit", error.message);
    return true;
  }
  return data === true;
}

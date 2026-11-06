"use client";

import { useActionState, useState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm({ notAllowed }: { notAllowed: boolean }) {
  const [error, action, pending] = useActionState(login, null);
  const [email, setEmail] = useState(""); // React limpia el formulario tras cada envío
  const message = error ?? (notAllowed ? "Esta cuenta no tiene acceso al panel." : null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="field text-noche" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field text-noche" />
      </div>
      {message && <p role="alert" className="font-semibold text-menta">{message}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}

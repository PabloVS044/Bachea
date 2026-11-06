#!/usr/bin/env node
// Crea (o promueve) un administrador. Uso: npm run admin:create -- correo@dominio.com
// La contraseña se pide por la variable ADMIN_PASSWORD para no dejarla en el historial del shell.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Uso: ADMIN_PASSWORD='mínimo 12 caracteres' npm run admin:create -- correo@dominio.com");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let userId;
const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created?.user) {
  userId = created.user.id;
} else if (error?.code === "email_exists") {
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  userId = list.users.find((u) => u.email === email.toLowerCase())?.id;
  if (!userId) throw new Error("La cuenta existe pero no se encontró");
  console.log("La cuenta ya existía: se conserva su contraseña.");
} else {
  throw error;
}

const { error: adminError } = await db.from("admins").upsert({ user_id: userId });
if (adminError) throw adminError;
console.log(`Administrador listo: ${email}`);

# Bachea

Reporte ciudadano de baches en Ciudad de Guatemala, panel de coordinación y feed público de reparaciones.

- **Público (móvil primero):** reportar con GPS o mapa y fotos, seguimiento por folio, baches tapados en feed y mapa.
- **Panel (`/admin`, escritorio):** bandeja priorizada, jornadas con ruta en Google Maps, cuadrillas, evidencias, costos y publicación.

Stack: Next.js 16, Supabase (Postgres, Auth, Storage), Leaflet con OpenStreetMap, Tailwind.

## Probar en local

Requiere Node 22 y Docker.

```bash
npm install
npx supabase start
npx supabase status -o env       # copia ANON_KEY y SERVICE_ROLE_KEY
cp .env.example .env.local       # llena las claves y HASH_SECRET (openssl rand -hex 32)
ADMIN_PASSWORD='una-clave-de-12-o-mas' npm run admin:create -- tu@correo.com
npm run dev
```

Sitio en http://localhost:3000 y panel en http://localhost:3000/admin.

El GPS del navegador solo funciona en `localhost` o con HTTPS. Para probarlo en un teléfono, usa un despliegue de Vercel o un túnel HTTPS.

## Pruebas

```bash
npm run build && npx playwright test
```

Requieren el Supabase local: crean reportes y usuarios de prueba en esa base. `npx supabase db reset` la deja limpia.

## Publicar

1. Crea un proyecto en Supabase y aplica el esquema: `npx supabase link --project-ref <ref> && npx supabase db push`.
2. En Supabase, en Authentication > Sign In / Providers, **desactiva los registros públicos** (`config.toml` solo aplica en local).
3. Importa el repositorio en Vercel y define las variables de `.env.example`. `NEXT_PUBLIC_SITE_URL` es el dominio final.
4. Crea el primer administrador con las variables de producción en `.env.local`: `npm run admin:create -- correo`.

## Seguridad y privacidad

- El navegador no accede directo a la base. Las rutas públicas usan la service role en el servidor y eligen columnas públicas; el panel usa la sesión del usuario con RLS.
- `SUPABASE_SERVICE_ROLE_KEY` y `HASH_SECRET` nunca deben llevar prefijo `NEXT_PUBLIC_`.
- Las fotos se reescriben en el servidor (sin EXIF ni GPS), viven en un bucket privado y solo se exponen las que un admin marca al publicar.
- El contacto, las notas, materiales y costos nunca salen a páginas públicas.
- Los límites por IP confían en cabeceras del proxy. En Vercel funciona tal cual; en un servidor propio, tu proxy debe sobrescribir `X-Real-IP`.

## Dónde ajustar

| Qué | Archivo |
| --- | --- |
| Ciudad, área de servicio, gravedades, estados | `src/lib/config.ts` |
| Colores y tipografía | `src/app/globals.css` |
| Esquema y reglas de acceso | `supabase/migrations/` |
| Límites por IP | `src/app/api/**`, `src/app/admin/actions.ts` |

OpenStreetMap sirve para empezar. Con tráfico alto, su política pide cambiar de proveedor de mosaicos con `NEXT_PUBLIC_MAP_TILE_URL` y de geocodificador en `src/app/api/geocode/reverse/route.ts`.

## Marca

Logo original en `assets/brand/`. `node scripts/build-brand.mjs` regenera isotipo, letras e íconos. La paleta está en `src/app/globals.css`: los colores de gravedad (amarillo, naranja, rojo) quedan fuera de la marca a propósito, para distinguirse de un vistazo.

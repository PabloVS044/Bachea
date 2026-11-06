// Siembra datos de ejemplo en la base LOCAL de Bachea para las grabaciones y la demo en vivo.
// Es idempotente: borra y recrea solo lo que sembró (folios BCH-DEM*, cuadrillas y jornadas "Demo"
// y el administrador demo@bachea.test). Se niega a correr contra una base que no sea local.
//
// Uso: DEMO_PASSWORD='una-clave-local' npm run seed
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BACHEA = resolve(process.env.BACHEA_DIR ?? '..')
process.loadEnvFile(resolve(BACHEA, '.env.local'))
const require = createRequire(resolve(BACHEA, 'package.json'))
const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(URL_ ?? '')) {
  throw new Error('Este script solo corre contra Supabase local.')
}
const db = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const must = (r) => { if (r.error) throw new Error(r.error.message); return r.data }

const FOTOS = resolve(import.meta.dirname, '../public/media/fotos')
const DIA = 86400000
const hace = (d) => new Date(Date.now() - d * DIA).toISOString()

export const DEMO_EMAIL = 'demo@bachea.test'
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD
if (!DEMO_PASSWORD) throw new Error('Define DEMO_PASSWORD con la clave local del panel de demo.')

const R = [
  // Tapados y publicados: alimentan el feed con antes y después simulados
  { z: 10, col: 'Oakland', addr: '13 calle y 2a avenida', lat: 14.5985, lng: -90.5098, sev: 'peligroso', st: 'tapado', foto: 'bache-moto', sup: 14, d: 9, res: 2, nota: 'Corte recto y mezcla asfáltica en frío, compactada.' },
  { z: 11, col: 'Mariscal', addr: '11 avenida y 16 calle', lat: 14.6052, lng: -90.5352, sev: 'moderado', st: 'tapado', foto: 'bache-calle', sup: 6, d: 7, res: 2, nota: 'Limpieza del hueco y parche con mezcla asfáltica.' },
  { z: 7, col: 'Kaminal Juyú', addr: 'Calzada San Juan y 30 avenida', lat: 14.6315, lng: -90.5548, sev: 'peligroso', st: 'tapado', foto: 'bache-hondo', sup: 21, d: 12, res: 3, nota: 'Bacheo profundo por capas. Quedó a nivel con la calzada.' },
  // Programados en la jornada
  { z: 12, col: 'La Reformita', addr: 'Avenida Petapa y 42 calle', lat: 14.5763, lng: -90.5344, sev: 'peligroso', st: 'programado', foto: 'bache-charco', sup: 32, d: 3, ruta: 1 },
  { z: 13, col: 'Aurora', addr: 'Boulevard Liberación y 7a avenida', lat: 14.5871, lng: -90.5272, sev: 'peligroso', st: 'programado', foto: 'bache-grieta', sup: 18, d: 4, ruta: 2 },
  { z: 9, col: 'Centro', addr: '7a avenida y 6a calle', lat: 14.6118, lng: -90.5163, sev: 'moderado', st: 'programado', foto: 'bache-noche', sup: 9, d: 2, ruta: 3 },
  // Verificados y recibidos: bandeja priorizada
  { z: 1, col: 'Centro Histórico', addr: '6a avenida y 12 calle', lat: 14.6365, lng: -90.5137, sev: 'peligroso', st: 'verificado', foto: 'bache-tapa', sup: 12, d: 2 },
  { z: 4, col: 'Cuatro Grados Norte', addr: 'Vía 5 y Ruta 2', lat: 14.6227, lng: -90.5158, sev: 'moderado', st: 'verificado', foto: 'bache-grieta', sup: 5, d: 1 },
  { z: 15, col: 'Vista Hermosa I', addr: 'Boulevard Vista Hermosa y 25 avenida', lat: 14.5919, lng: -90.4842, sev: 'moderado', st: 'recibido', foto: 'bache-charco', sup: 4, d: 1 },
  { z: 18, col: 'Atlántida', addr: 'Calzada Atanasio Tzul norte, km 6', lat: 14.6584, lng: -90.4883, sev: 'peligroso', st: 'recibido', foto: 'bache-noche', sup: 7, d: .4 },
  { z: 6, col: 'Proyectos 4-4', addr: '15 avenida y 21 calle', lat: 14.6502, lng: -90.4987, sev: 'leve', st: 'recibido', foto: 'bache-tapa', sup: 1, d: .3 },
  { z: 5, col: 'La Palmita', addr: '20 calle y 28 avenida', lat: 14.6201, lng: -90.4949, sev: 'moderado', st: 'recibido', foto: 'bache-grieta', sup: 2, d: .2 },
  { z: 16, col: 'Cayalá', addr: 'Boulevard Rafael Landívar', lat: 14.6118, lng: -90.4768, sev: 'leve', st: 'recibido', foto: 'bache-charco', sup: 0, d: .15 },
  { z: 19, col: 'La Florida', addr: 'Calzada San Juan, km 8', lat: 14.6387, lng: -90.5722, sev: 'moderado', st: 'recibido', foto: 'bache-noche', sup: 3, d: .1 },
]

async function subir(path, archivo) {
  const buf = await sharp(readFileSync(resolve(FOTOS, archivo))).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  must(await db.storage.from('report-photos').upload(path, buf, { contentType: 'image/webp', upsert: true }))
}

async function limpiar() {
  const prev = must(await db.from('reports').select('id').like('folio', 'BCH-DEM%'))
  if (prev.length) {
    const ids = prev.map((r) => r.id)
    const fotos = must(await db.from('report_photos').select('storage_path').in('report_id', ids))
    if (fotos.length) await db.storage.from('report-photos').remove(fotos.map((f) => f.storage_path))
    must(await db.from('reports').delete().in('id', ids))
  }
  must(await db.from('work_days').delete().like('title', 'Demo%'))
  must(await db.from('crews').delete().like('name', 'Demo%'))
}

async function admin() {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  let u = data.users.find((x) => x.email === DEMO_EMAIL)
  if (u) must(await db.auth.admin.updateUserById(u.id, { password: DEMO_PASSWORD }))
  else u = must(await db.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true })).user
  must(await db.from('admins').upsert({ user_id: u.id }))
}

await limpiar()
await admin()
const crew = must(await db.from('crews').insert({ name: 'Demo · Cuadrilla Norte', phone: '5555 0100' }).select('id').single())
must(await db.from('crews').insert({ name: 'Demo · Cuadrilla Sur', phone: '5555 0200' }))
const dia = new Date(Date.now() + DIA).toISOString().slice(0, 10)
const jornada = must(await db.from('work_days').insert({ title: 'Demo · Jornada Petapa', scheduled_on: dia, crew_id: crew.id, status: 'planificada' }).select('id').single())

let n = 0
for (const r of R) {
  n++
  const folio = `BCH-DEM${String(n).padStart(3, '0')}`
  const creado = hace(r.d)
  const tapado = r.st === 'tapado'
  const fila = must(await db.from('reports').insert({
    folio, lat: r.lat, lng: r.lng, location_source: n % 3 ? 'gps' : 'mapa', accuracy_m: 8,
    address: r.addr, zona: r.z, colonia: r.col, severity: r.sev, status: r.st, support_count: r.sup,
    work_day_id: r.ruta ? jornada.id : null, route_order: r.ruta ?? null,
    created_at: creado,
    resolved_at: tapado ? hace(r.d - r.res) : null,
    resolution_note: r.nota ?? null,
    published_at: tapado ? hace(r.d - r.res) : null,
    materials: tapado ? 'Mezcla asfáltica en frío (ejemplo)' : null,
    cost_gtq: tapado ? 350 : null,
  }).select('id').single())
  const antes = `${fila.id}/antes.webp`
  await subir(antes, `${r.foto}.jpg`)
  must(await db.from('report_photos').insert({ report_id: fila.id, storage_path: antes, kind: 'antes', is_public: tapado }))
  if (tapado) {
    const desp = `${fila.id}/despues.webp`
    await subir(desp, `${r.foto}-tapado.jpg`)
    must(await db.from('report_photos').insert({ report_id: fila.id, storage_path: desp, kind: 'despues', is_public: true }))
  }
}
console.log(`Sembrados ${R.length} reportes de ejemplo. Panel: ${DEMO_EMAIL}`)

// Graba la app real (localhost) a video nítido usando el screencast de Chromium.
// Requiere la app corriendo y `npm run seed`. Sale en public/media/demos/.
// Uso: node scripts/grabar-demos.mjs [reporte] [panel] [feed]
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BACHEA = resolve(process.env.BACHEA_DIR ?? '..')
const ROOT = resolve(import.meta.dirname, '..')
process.loadEnvFile(resolve(BACHEA, '.env.local'))
const require = createRequire(resolve(BACHEA, 'package.json'))
const { chromium } = require('@playwright/test')
const { createClient } = require('@supabase/supabase-js')

const BASE = process.env.APP_URL ?? 'http://localhost:3000'
const OUT = resolve(ROOT, 'public/media/demos')
mkdirSync(OUT, { recursive: true })
const EMAIL = 'demo@bachea.test'
const PASSWORD = process.env.DEMO_PASSWORD
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const TAP = `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='nextjs-portal{display:none!important}';document.head.append(s)});addEventListener('pointerdown',e=>{const d=document.createElement('div');
d.style.cssText='position:fixed;z-index:2147483647;left:'+(e.clientX-22)+'px;top:'+(e.clientY-22)+'px;width:44px;height:44px;border-radius:50%;background:rgba(79,130,73,.45);border:2px solid #fff;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out';
document.documentElement.appendChild(d);requestAnimationFrame(()=>{d.style.transform='scale(1.7)';d.style.opacity='0'});setTimeout(()=>d.remove(),500)},true);`

async function grabar(page, nombre, guion, { width, height }) {
  const dir = mkdtempSync(join(tmpdir(), `bachea-${nombre}-`))
  const cdp = await page.context().newCDPSession(page)
  const frames = []
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(frames.length).padStart(6, '0')}.jpg`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: width, maxHeight: height, everyNthFrame: 1 })
  const t0 = Date.now()
  const capitulos = {}
  await guion((label) => {
    capitulos[label] = +((Date.now() - t0) / 1000).toFixed(2)
    console.log(`  ${nombre} · ${label} @ ${capitulos[label]}s`)
  })
  await page.waitForTimeout(600)
  await cdp.send('Page.stopScreencast')
  const fin = frames.at(-1).t + 1
  const lista = frames.map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.t ?? fin) - f.t).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`
  const txt = join(dir, 'lista.txt')
  writeFileSync(txt, lista)
  const salida = join(OUT, `${nombre}.mp4`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', txt,
    '-vf', `fps=30,scale=${width}:${height}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-movflags', '+faststart', '-an', salida])
  writeFileSync(join(OUT, `${nombre}.json`), JSON.stringify(capitulos, null, 2))
  console.log(`  → ${salida} (${frames.length} cuadros)`)
}

const pausa = (page, ms) => page.waitForTimeout(ms)
// Espera a que el mapa pinte sus mosaicos para no grabar un recuadro gris
const mosaicos = (page) => page.waitForFunction(() => {
  const t = [...document.querySelectorAll('.leaflet-tile')]
  return t.length > 0 && t.every((i) => i.classList.contains('leaflet-tile-loaded'))
}, null, { timeout: 12000 }).catch(() => {})

async function reporte(browser) {
  // Punto real, lejos de los reportes sembrados, para que no salte el aviso de duplicado
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    geolocation: { latitude: 14.5683, longitude: -90.5461 }, permissions: ['geolocation'], locale: 'es-GT',
  })
  await ctx.addInitScript(TAP)
  const page = await ctx.newPage()
  let folio = ''
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await grabar(page, 'reporte', async (cap) => {
    cap('inicio')
    await pausa(page, 1300)
    await page.getByRole('link', { name: 'Reportar un bache' }).first().click()
    await page.getByRole('heading', { name: 'Ubicación' }).waitFor()
    await mosaicos(page)
    cap('ubicacion')
    await pausa(page, 1200)
    await page.getByRole('button', { name: 'Usar mi GPS' }).click()
    await page.getByText(/Ubicación encontrada/).waitFor()
    await pausa(page, 800)
    await mosaicos(page)
    await pausa(page, 1200)
    await page.getByRole('button', { name: 'Confirmar ubicación' }).click()
    await page.getByRole('heading', { name: 'Detalles' }).waitFor()
    cap('detalles')
    await pausa(page, 500)
    await page.locator('input[type="file"]').setInputFiles(resolve(ROOT, 'public/media/fotos/bache-charco.jpg'))
    await page.getByAltText('Foto 1 del bache').waitFor()
    await pausa(page, 900)
    await page.getByText('Peligroso', { exact: true }).click()
    await pausa(page, 500)
    await page.getByLabel('Zona').selectOption('12')
    await pausa(page, 300)
    await page.getByLabel('Colonia o barrio').pressSequentially('La Reformita', { delay: 45 })
    await pausa(page, 500)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Enviar reporte' }).waitFor()
    cap('enviar')
    await pausa(page, 1000)
    await page.getByRole('button', { name: 'Enviar reporte' }).click()
    await page.getByRole('heading', { name: 'Reporte enviado' }).waitFor()
    cap('folio')
    folio = (await page.locator('.plate').innerText()).trim()
    await pausa(page, 2300)
    await page.getByRole('link', { name: 'Ver seguimiento' }).click()
    await page.getByRole('heading', { name: 'Recibido' }).waitFor()
    cap('seguimiento')
    await pausa(page, 2600)
  }, { width: 780, height: 1688 })
  await ctx.close()
  // El reporte de la grabación no debe quedar en la demo
  if (folio) {
    const { data } = await db.from('reports').select('id').eq('folio', folio).single()
    const { data: fotos } = await db.from('report_photos').select('storage_path').eq('report_id', data.id)
    if (fotos?.length) await db.storage.from('report-photos').remove(fotos.map((f) => f.storage_path))
    await db.from('reports').delete().eq('id', data.id)
  }
}

async function panel(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1.5, locale: 'es-GT' })
  await ctx.addInitScript(TAP)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Correo').fill(EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('heading', { name: 'Reportes' }).waitFor()
  await page.waitForLoadState('networkidle')
  await pausa(page, 1500)
  await grabar(page, 'panel', async (cap) => {
    cap('bandeja')
    await pausa(page, 3200)
    await page.mouse.wheel(0, 420)
    await pausa(page, 2600)
    await page.goto(`${BASE}/admin/jornadas`, { waitUntil: 'networkidle' })
    cap('jornadas')
    await pausa(page, 1500)
    await page.getByRole('link', { name: /Demo · Jornada Petapa/ }).first().click()
    await page.getByRole('heading', { name: /Demo · Jornada Petapa/ }).waitFor()
    await page.waitForLoadState('networkidle')
    cap('ruta')
    await pausa(page, 3600)
    await page.goto(`${BASE}/admin?estado=tapado`, { waitUntil: 'networkidle' })
    cap('tapados')
    await pausa(page, 1400)
    await page.getByRole('link', { name: 'BCH-DEM003' }).first().click()
    await page.waitForLoadState('networkidle')
    cap('evidencia')
    await pausa(page, 1800)
    await page.mouse.wheel(0, 500)
    await pausa(page, 2600)
  }, { width: 1920, height: 1080 })
  await ctx.close()
}

async function feed(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'es-GT' })
  await ctx.addInitScript(TAP)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/tapados`, { waitUntil: 'networkidle' })
  await grabar(page, 'feed', async (cap) => {
    cap('feed')
    await pausa(page, 1500)
    const s = page.getByRole('slider', { name: 'Comparar antes y después' }).first()
    await s.scrollIntoViewIfNeeded()
    for (const v of [50, 30, 12, 30, 60, 88, 60, 50]) {
      await s.evaluate((el, x) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, x); el.dispatchEvent(new Event('input', { bubbles: true })) }, v)
      await pausa(page, 260)
    }
    await pausa(page, 700)
    await page.getByRole('link', { name: 'Mapa' }).click()
    await page.locator('.pin-done').first().waitFor()
    await mosaicos(page)
    cap('mapa')
    await pausa(page, 3200)
  }, { width: 780, height: 1688 })
  await ctx.close()
}

const pedidos = process.argv.slice(2)
const todos = { reporte, panel, feed }
const browser = await chromium.launch()
for (const n of pedidos.length ? pedidos : Object.keys(todos)) {
  console.log(`Grabando ${n}…`)
  await todos[n](browser)
}
await browser.close()

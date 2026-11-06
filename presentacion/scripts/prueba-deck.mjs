// Recorre la presentación como un presentador real, con clics y teclas. Uso: node scripts/prueba-deck.mjs [url]
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve(process.env.BACHEA_DIR ?? '..', 'package.json'))
const { chromium } = require('@playwright/test')
const URL_ = process.argv[2] ?? 'http://127.0.0.1:5173/'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('requestfailed', (r) => errs.push('FALLA ' + r.url()))
const ok = (c, t) => { console.log(`${c ? 'ok ' : 'MAL'} ${t}`); if (!c) process.exitCode = 1 }
const st = () => p.evaluate(() => { const { index, step } = window.__deck.state; return [window.__deck.slides[index].id, step] })
const rec = () => p.evaluate(() => {
  const s = window.__deck.slides[window.__deck.state.index]; const o = []
  for (const x of window.__deck.slides) if (x !== s && x.el.classList.contains('active')) o.push(x.id)
  return o
})
const espera = (ms) => p.waitForTimeout(ms)
await p.goto(URL_, { waitUntil: 'load' })
await p.waitForFunction(() => window.__deck?.state?.index === 0)
await espera(800)
const secuencia = []
for (let i = 0; i < 30; i++) {
  const [id, k] = await st()
  secuencia.push(`${id}.${k}`)
  if (id === 'cierre') break
  await p.keyboard.press('ArrowRight')
  await espera(1600)
  ok((await rec()).length === 0, `sin encimadas tras ${id}.${k}`)
}
console.log(secuencia.join(' → '))
ok(secuencia.at(-1) === 'cierre.0', 'el flujo termina en cierre')
await p.keyboard.press('ArrowRight'); await espera(400)
ok((await st())[0] === 'cierre', 'avanzar en cierre no entra a las extras')

// Mapa: tocar un pin abre su tarjeta
await p.evaluate(() => { location.hash = ''; window.__deck.go(3, 1) }); await espera(1500)
await p.mouse.move(600, 500)
await p.locator('.slide.active .hexpin').first().click({ force: true }); await espera(300)
ok(await p.locator('.slide.active .pin-card').isVisible(), 'el pin abre la tarjeta')
ok((await p.locator('.slide.active .pin-card b').innerText()).length > 3, 'tarjeta con lugar')

// Pasos del teléfono saltan en el video
await p.evaluate(() => window.__deck.go(5, 0)); await espera(1800)
await p.locator('.slide.active .pasos button').nth(2).click(); await espera(500)
const t = await p.evaluate(() => document.querySelector('.slide.active video').currentTime)
ok(t >= 10.9 && t < 13, `salta al folio (${t.toFixed(2)} s)`)
ok(await p.locator('.slide.active .pasos button').nth(2).evaluate((e) => e.classList.contains('on')), 'marca el paso activo')

// Antes y después
await p.evaluate(() => window.__deck.go(7, 1)); await espera(1400)
await p.locator('.slide.active .ba input').fill('20'); await espera(150)
ok((await p.locator('.slide.active .ba').evaluate((e) => e.style.getPropertyValue('--split'))) === '20%', 'el deslizador mueve la línea')

// Tecla D, respaldo y Abrir la app
await p.keyboard.press('Escape'); await p.locator('body').click({ position: { x: 5, y: 5 }, force: true }).catch(() => {})
await p.keyboard.press('d'); await espera(1800)
ok((await st())[0] === 'demo', 'tecla D va a la demo')
await p.locator('.slide.active .backup button').first().click(); await espera(900)
ok(await p.locator('.backup-view video').evaluate((v) => !v.paused && v.readyState >= 2), 'video de respaldo reproduce')
await p.locator('.backup-close').click(); await espera(150)
ok(await p.locator('.backup-view').isHidden(), 'cierra el respaldo')
const [pop] = await Promise.all([ctx.waitForEvent('page'), p.locator('.slide.active a.cta').click()])
await pop.waitForLoadState('domcontentloaded')
ok(pop.url().startsWith('http://localhost:3000'), `Abrir la app → ${pop.url()}`)
await pop.close()

// Juego
await p.keyboard.press('g'); await espera(1300)
ok((await st())[0] === 'juego', 'tecla G abre el juego')
await p.locator('.slide.active .start').click(); await espera(700)
await p.locator('.hole').first().dispatchEvent('pointerdown', { bubbles: true }); await espera(200)
ok((await p.locator('.score').innerText()) === '1', 'tocar un bache suma')
await p.keyboard.press('l'); await espera(1300)
ok(await p.locator('.slide.active video').evaluate((v) => !v.paused), 'tecla L reproduce el video del stand')
await p.keyboard.press('c'); await espera(1300)
ok((await st())[0] === 'creditos', 'tecla C abre créditos')
ok((await p.locator('.hole').count()) === 0, 'al salir del juego no quedan baches')

// Retroceso y salto a slide con videos
await p.keyboard.press('Home'); await espera(500)
ok((await st())[0] === 'portada', 'Home vuelve a portada')

// Presentador
const [pres] = await Promise.all([ctx.waitForEvent('page'), p.keyboard.press('p')])
await pres.waitForLoadState('load'); await pres.waitForTimeout(1200)
const titulo = await pres.locator('#p-title').innerText()
ok(titulo.startsWith('Portada'), `presentador sincroniza: ${titulo}`)
await pres.locator('footer button[data-cmd="next"]').click(); await espera(1500)
ok((await st())[0] === 'golpe', 'presentador controla el deck')
await pres.close()
console.log('errores:', [...new Set(errs)].join('\n') || 'ninguno')
if (errs.length) process.exitCode = 1
await b.close()

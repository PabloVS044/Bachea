// Captura cada paso de cada diapositiva para revisarlas. Uso: node scripts/capturas.mjs [url] [carpeta]
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve(process.env.BACHEA_DIR ?? '..', 'package.json'))
const { chromium } = require('@playwright/test')
const URL_ = process.argv[2] ?? 'http://127.0.0.1:5173/'
const out = process.argv[3] ?? 'tmp/shots'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('requestfailed', (r) => errs.push('FALLA ' + r.url()))
await p.goto(URL_ + '?preview#1.0', { waitUntil: 'load' })
await p.waitForFunction(() => window.__deck)
const slides = await p.evaluate(() => window.__deck.slides.map((s) => ({ id: s.id, steps: s.steps })))
for (let i = 0; i < slides.length; i++) {
  for (let k = 0; k <= slides[i].steps; k++) {
    await p.evaluate(([i, k]) => { location.hash = `#${i + 1}.${k}` }, [i, k])
    await p.waitForTimeout(900)
    const over = await p.evaluate(() => {
      const el = window.__deck.slides[window.__deck.state.index].el
      const res = []
      el.querySelectorAll('h1,h2,p,li,b,figcaption,small,a,button').forEach((n) => {
        const r = n.getBoundingClientRect()
        const vis = getComputedStyle(n).visibility !== 'hidden' && r.width
        if (vis && (r.right > 1921 || r.bottom > 1081 || r.left < -1 || r.top < -1)) res.push(n.tagName + ':' + n.textContent.trim().slice(0, 30))
      })
      return res
    })
    await p.screenshot({ path: `${out}/${String(i + 1).padStart(2, '0')}-${slides[i].id}-${k}.jpg`, type: 'jpeg', quality: 70 })
    if (over.length) console.log('DESBORDE', slides[i].id, k, over.join(' | '))
  }
}
console.log(slides.map((s) => `${s.id}:${s.steps}`).join(' '))
console.log('errores:', [...new Set(errs)].join('\n') || 'ninguno')
await b.close()

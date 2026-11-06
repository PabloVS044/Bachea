import '@fontsource/barlow/400.css'
import '@fontsource/barlow/700.css'
import './presenter.css'
import { SLIDES } from './slides/index.js'
import { SECTIONS, TOTAL_TOPE } from './sections.js'

const $ = (id) => document.getElementById(id)
const channel = new BroadcastChannel('bachea-deck')

const steps = SLIDES.map((s) => s.steps ?? Math.max(0, ...[...s.html.matchAll(/data-step="(\d+)"/g)].map((m) => +m[1])))

let state = { index: 0, step: 0 }
let lastSection = null

// ---------- Cronómetros ----------
let running = false
let totalMs = 0
let secMs = 0
let lastTick = 0

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function tick(now) {
  if (running) {
    const d = now - lastTick
    totalMs += d
    secMs += d
  }
  lastTick = now
  const tope = SECTIONS[SLIDES[state.index].section].tope * 1000
  $('t-sec').textContent = fmt(secMs)
  $('t-total').textContent = fmt(totalMs)
  $('t-sec').className = !tope ? '' : secMs > tope ? 'over' : secMs > tope - 15000 ? 'warn' : 'ok'
  $('t-total').className = totalMs > TOTAL_TOPE * 1000 ? 'over' : ''
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

$('t-start').onclick = () => {
  running = !running
  $('t-start').textContent = running ? 'Pausar' : 'Reanudar'
}
$('t-reset').onclick = () => {
  totalMs = 0
  secMs = 0
}

// ---------- Previews ----------
function fitFrames() {
  for (const f of document.querySelectorAll('.frame iframe')) {
    const w = f.parentElement.clientWidth
    f.style.transform = `scale(${w / 1920})`
    f.parentElement.style.height = `${(w / 1920) * 1080}px`
  }
}
addEventListener('resize', fitFrames)

function setFrame(f, i, s) {
  const hash = `#${i + 1}.${s}`
  if (!f.src) f.src = `index.html?preview${hash}`
  else f.contentWindow.location.hash = hash
}

function render() {
  const { index, step } = state
  const s = SLIDES[index]
  const meta = SECTIONS[s.section]
  if (lastSection !== null && lastSection !== s.section) secMs = 0
  lastSection = s.section

  $('p-secn').textContent = meta.n
  $('p-sec').textContent = meta.title
  $('p-who').textContent = meta.who
  $('t-tope').textContent = meta.tope ? `/ ${fmt(meta.tope * 1000)}` : ''
  $('p-idx').textContent = `slide ${index + 1} de ${SLIDES.filter((x) => !x.extra).length}${steps[index] ? ` · paso ${step} de ${steps[index]}` : ''}`
  $('p-title').textContent = s.title
  $('p-notes').textContent = s.notes || ''

  setFrame($('f-now'), index, step)
  const nxt = step < steps[index] ? [index, step + 1] : index + 1 < SLIDES.length && !SLIDES[index + 1].extra ? [index + 1, 0] : [index, step]
  setFrame($('f-next'), nxt[0], nxt[1])
}

channel.onmessage = ({ data }) => {
  if (data.type === 'state') {
    state = { index: data.index, step: data.step }
    render()
  }
}

function send(type) {
  channel.postMessage({ type })
}

document.querySelectorAll('footer button').forEach((b) => (b.onclick = () => send(b.dataset.cmd)))

let buf = ''
addEventListener('keydown', (e) => {
  const k = e.key
  if (/^[0-9]$/.test(k)) return void (buf += k)
  if (k === 'Enter' && buf) {
    channel.postMessage({ type: 'go', index: parseInt(buf, 10) - 1, step: 0 })
    buf = ''
    return
  }
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) {
    e.preventDefault()
    send('next')
  } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) {
    e.preventDefault()
    send('prev')
  } else if (k === 'b' || k === 'B' || k === '.') send('black')
  else if (k === 'v' || k === 'V') send('video')
})

render()
fitFrames()
send('hello')

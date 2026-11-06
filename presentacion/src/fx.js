import gsap from 'gsap'

// Estados de partida de cada tipo de entrada (data-in / data-anim).
export const FROM = {
  up: { y: 48, opacity: 0 },
  down: { y: -40, opacity: 0 },
  fade: { opacity: 0 },
  scale: { scale: 0.86, opacity: 0 },
  pop: { scale: 0.4, opacity: 0, ease: 'back.out(2)' },
  blur: { opacity: 0, filter: 'blur(18px)', y: 12 },
  left: { x: -70, opacity: 0 },
  right: { x: 70, opacity: 0 },
  zoom: { scale: 1.25, opacity: 0, filter: 'blur(10px)' },
}

const TO = { y: 0, x: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }

export function animIn(el, kind = 'up', vars = {}) {
  const from = { ...(FROM[kind] || FROM.up) }
  const ease = from.ease || 'power3.out'
  delete from.ease
  const to = {}
  for (const k of Object.keys(from)) to[k] = TO[k]
  return gsap.fromTo(el, from, { ...to, duration: 0.9, ease, clearProps: 'transform,filter', ...vars })
}

// Envuelve cada palabra de un título para revelarlas desde abajo.
export function splitWords(el) {
  if (el.dataset.split) return el.querySelectorAll('.wi')
  el.dataset.split = '1'
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/)
        const frag = document.createDocumentFragment()
        for (const p of parts) {
          if (!p) continue
          if (/^\s+$/.test(p)) {
            frag.appendChild(document.createTextNode(' '))
            continue
          }
          const w = document.createElement('span')
          w.className = 'w'
          const wi = document.createElement('span')
          wi.className = 'wi'
          wi.textContent = p
          w.appendChild(wi)
          frag.appendChild(w)
        }
        child.replaceWith(frag)
      } else if (child.nodeType === 1 && !child.classList.contains('w')) {
        walk(child)
      }
    }
  }
  walk(el)
  return el.querySelectorAll('.wi')
}

export function words(el, vars = {}) {
  const ws = splitWords(el)
  return gsap.fromTo(
    ws,
    { yPercent: 110, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.06, clearProps: 'transform', ...vars },
  )
}

// Cuenta un número de 0 a su valor (data-count, data-decimals, data-sep, data-from).
// Cada dígito va en una caja de ancho fijo: los dígitos miden distinto y, sin esto, el número tiembla de lado a lado mientras cuenta.
function formatCount(el, v) {
  const dec = parseInt(el.dataset.decimals || '0', 10)
  const sep = el.dataset.sep ?? ' '
  const [i, d] = v.toFixed(dec).split('.')
  return (sep ? i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : i) + (d ? `.${d}` : '')
}

function renderCount(el, v) {
  el.innerHTML = formatCount(el, v).replace(/\d/g, '<i class="dg">$&</i>')
}

export function countUp(el, vars = {}) {
  const target = parseFloat(el.dataset.count)
  const o = { v: parseFloat(el.dataset.from || '0') }
  renderCount(el, o.v)
  return gsap.to(o, {
    v: target,
    duration: 1.8,
    ease: 'power3.out',
    ...vars,
    onUpdate: () => renderCount(el, o.v),
    onComplete: () => renderCount(el, target),
  })
}

export function setCount(el) {
  renderCount(el, parseFloat(el.dataset.count))
}

// Dibuja trazos SVG (paths/lines con clase .draw).
export function draw(els, vars = {}) {
  const list = gsap.utils.toArray(els)
  list.forEach((p) => {
    const len = p.getTotalLength ? p.getTotalLength() : 1000
    p.style.strokeDasharray = `${len}`
    p.style.strokeDashoffset = `${len}`
  })
  return gsap.to(list, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.12, ...vars })
}

export function drawDone(els) {
  gsap.utils.toArray(els).forEach((p) => {
    p.style.strokeDasharray = 'none'
    p.style.strokeDashoffset = '0'
  })
}

// Iconos de trazo (24×24).
const P = {
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.6"/>',
  pin: '<path d="M12 22s7-7 7-12.5A7 7 0 0 0 5 9.5C5 15 12 22 12 22Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  plate: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M7 12h10"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 8.8V3M15 13.8l5 2.9M9 13.8l-5 2.9"/>',
  rim: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6"/><path d="M12 10.4V3.5M13.5 12.6l6.6 2.3M10.5 12.6l-6.6 2.3M5.5 6l5.5 5M18.5 6 13 11"/>',
  spring: '<path d="M7 3h10M7 21h10M8 6l8 2.5-8 2.5 8 2.5-8 2.5 8 2.5"/>',
  moto: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M5.5 17 10 9h5l3.5 8M13 5h3l1 4M10 9l3 8h5"/>',
  car: '<path d="M4 16v-3l2-6a2 2 0 0 1 2-1.4h8A2 2 0 0 1 18 7l2 6v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1ZM4.5 12.5h15"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M10 20v-6h4v6"/>',
  phone: '<path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M10 18h4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  office: '<path d="M4 21V5l8-2v18M12 8l8 2v11M2 21h20M7.5 8.5v.01M7.5 12.5v.01M7.5 16.5v.01M16 13.5v.01M16 17v.01"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  hand: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V12m0-.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.6L4 15.5a1.6 1.6 0 0 1 2.5-2L8 15"/>',
}

export function svgIcon(name, size = 38, sw = 1.6) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`
}

import { svgIcon } from '../fx.js'
import { APP_URL, SITE_URL, EQUIPO } from '../config.js'
import creditos from '../creditos.json'

// Proyección del mapa base (ver scripts/mapa.py): OSM zoom 14 centrado en la ciudad.
const N = 256 * 2 ** 14
const mx = (lng) => ((lng + 180) / 360) * N
const my = (lat) => ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * N
const px = (lat, lng) => [mx(lng) - mx(-90.522) + 960, my(lat) - my(14.615) + 540]

const REPORTES = [
  { lat: 14.5799, lng: -90.5228, sev: 'peligroso', place: 'Zona 12 · Av. Petapa', foto: 'bache-charco', apoyos: 32 },
  { lat: 14.5871, lng: -90.5272, sev: 'peligroso', place: 'Zona 13 · Blvd. Liberación', foto: 'bache-grieta', apoyos: 18 },
  { lat: 14.5985, lng: -90.5098, sev: 'peligroso', place: 'Zona 10 · Oakland', foto: 'bache-moto', apoyos: 14 },
  { lat: 14.6118, lng: -90.5163, sev: 'moderado', place: 'Zona 9 · Centro', foto: 'bache-noche', apoyos: 9 },
  { lat: 14.6365, lng: -90.5137, sev: 'peligroso', place: 'Zona 1 · Centro Histórico', foto: 'bache-tapa', apoyos: 12 },
  { lat: 14.6227, lng: -90.5158, sev: 'moderado', place: 'Zona 4 · 4 Grados Norte', foto: 'bache-grieta', apoyos: 5 },
  { lat: 14.6052, lng: -90.5352, sev: 'moderado', place: 'Zona 11 · Mariscal', foto: 'bache-calle', apoyos: 6 },
  { lat: 14.5919, lng: -90.4842, sev: 'moderado', place: 'Zona 15 · Vista Hermosa', foto: 'bache-charco', apoyos: 4 },
  { lat: 14.6440, lng: -90.5260, sev: 'peligroso', place: 'Zona 2 · Ciudad Nueva', foto: 'bache-hondo', apoyos: 21 },
  { lat: 14.6502, lng: -90.4987, sev: 'leve', place: 'Zona 6 · Proyectos 4-4', foto: 'bache-tapa', apoyos: 1 },
  { lat: 14.6201, lng: -90.4949, sev: 'moderado', place: 'Zona 5 · La Palmita', foto: 'bache-grieta', apoyos: 2 },
  { lat: 14.6118, lng: -90.4768, sev: 'leve', place: 'Zona 16 · Cayalá', foto: 'bache-charco', apoyos: 1 },
]

const SEV_LABEL = { leve: 'Leve', moderado: 'Moderado', peligroso: 'Peligroso' }

const pasosReporte = [
  { t: 2.81, n: 1, title: 'Márcalo en el mapa', icon: 'pin' },
  { t: 6.29, n: 2, title: 'Agrega una foto', icon: 'camera' },
  { t: 10.97, n: 3, title: 'Sigue tu folio', icon: 'plate' },
]

const respaldo = [
  { file: 'reporte', label: 'Reportar', icon: 'phone', tall: true },
  { file: 'panel', label: 'Panel', icon: 'route', tall: false },
  { file: 'feed', label: 'Evidencias', icon: 'camera', tall: true },
]

export const SLIDES = [
  // ---------- 1 · Portada / antesala ----------
  {
    id: 'portada',
    section: 0,
    title: 'Portada · pantalla mientras entra el público',
    notes: `Queda en pantalla mientras entra la gente. Nadie habla todavía.
Cuando todos estén listos, avanzar: el golpe arranca sin avisar.`,
    layout: 'dark',
    html: `
      <img class="bleed kb" src="media/fotos/guate-noche.jpg" alt="Ciudad de Guatemala de noche" />
      <div class="bleed scrim-left"></div>
      <div class="road-rail" aria-hidden="true"></div>
      <div class="portada">
        <div class="lockup" data-in="fade">
          <img src="media/brand/isotipo.png" alt="" /><i></i><img src="media/brand/letras-blanco.png" alt="Bachea" />
        </div>
        <h1 class="mega" data-in="words">Tú lo reportas.<br /><em>Nosotros lo tapamos.</em></h1>
        <ul class="team" data-in="up">${EQUIPO.map((n) => `<li>${n}</li>`).join('')}</ul>
      </div>`,
  },

  // ---------- 2 · El golpe ----------
  {
    id: 'golpe',
    section: 1,
    title: 'Golpe · video de 7 s, sin voz',
    notes: `Dejen correr el video en silencio. No hablen hasta que aparezca «Otro bache».
Pregunta a la sala: «¿Quién cayó en uno esta semana?» Pidan manos arriba.
[clic] «Las calles se comen nuestros carros.»`,
    layout: 'dark',
    html: `
      <video class="bleed" src="media/motion/golpe.mp4" data-autoplay data-preview-time="6.5"></video>
      <div class="bleed step-layer" data-step="1" data-anim="fade">
        <img class="bleed" src="media/fotos/bache-charco.jpg" alt="Bache lleno de agua en una calle" />
        <div class="bleed scrim-bottom"></div>
        <h2 class="mega bottom" data-in="words">Las calles se <em>comen</em><br />nuestros carros.</h2>
      </div>`,
  },

  // ---------- 3 · El daño ----------
  {
    id: 'dano',
    section: 1,
    title: 'Cuatro golpes al bolsillo',
    notes: `Una palabra por cada tarjeta; no lean explicaciones.
Con lluvia es peor: el agua los esconde. Y cada golpe se paga en el taller.`,
    layout: 'dark',
    html: `
      <div class="dano">
        ${[
          ['tire', 'Llantas', 'bache-moto'],
          ['rim', 'Aros', 'bache-hondo'],
          ['spring', 'Suspensión', 'bache-grieta'],
          ['moto', 'Motos', 'bache-charco'],
        ].map(([i, t, f], k) => `
          <figure class="dano-card" data-in="up">
            <img src="media/fotos/${f}.jpg" alt="" />
            <figcaption>${svgIcon(i, 110, 1.4)}<b>${t}</b></figcaption>
          </figure>`).join('')}
      </div>
      <p class="caption-big" data-in="fade" data-delay="1">Cada golpe <em>se paga en el taller.</em></p>`,
  },

  // ---------- 4 · Mapa ----------
  {
    id: 'mapa',
    section: 1,
    title: 'Nadie sabe dónde están (interactiva)',
    notes: `«Hoy reportar es llamar, escribir en redes o ir a una oficina. Y el reporte se pierde.»
[clic] Aparecen los baches. Toquen uno con el mouse: se abre su foto. Son datos de ejemplo.
[clic] «Si nadie sabe dónde están, nadie los repara.»`,
    layout: 'dark map',
    html: `
      <img class="bleed" src="media/mapa/guate-oscuro.jpg" alt="Mapa de Ciudad de Guatemala" />
      <div class="bleed scrim-map"></div>
      <div class="mapa-head">
        <h2 class="mega small" data-in="words">Nadie sabe<br /><em>dónde están.</em></h2>
        <ul class="canales" data-in="up">
          <li>${svgIcon('phone', 44)}Llamar</li>
          <li>${svgIcon('chat', 44)}Redes</li>
          <li>${svgIcon('office', 44)}Oficina</li>
        </ul>
      </div>
      <div class="pins" data-step="1" data-anim="none">
        ${REPORTES.map((r, i) => {
          const [x, y] = px(r.lat, r.lng)
          return `<button class="hexpin sev-${r.sev}" style="left:${x}px;top:${y}px" data-i="${i}" aria-label="${r.place}, ${SEV_LABEL[r.sev]}"></button>`
        }).join('')}
      </div>
      <aside class="pin-card" hidden>
        <img alt="" /><div><b></b><span class="sev"></span></div>
      </aside>
      <p class="punch" data-step="2" data-anim="up">Entonces <em>nadie los repara.</em></p>
      <small class="fine">Reportes de ejemplo · Mapa © OpenStreetMap</small>`,
    init(el) {
      const card = el.querySelector('.pin-card')
      el.querySelector('.pins').addEventListener('click', (e) => {
        const b = e.target.closest('.hexpin')
        if (!b) return
        const r = REPORTES[+b.dataset.i]
        card.querySelector('img').src = `media/fotos/${r.foto}.jpg`
        card.querySelector('b').textContent = r.place
        card.querySelector('.sev').textContent = SEV_LABEL[r.sev]
        card.querySelector('.sev').dataset.sev = r.sev
        const x = parseFloat(b.style.left)
        card.style.left = `${x > 1200 ? x - 560 : x + 56}px`
        card.style.top = `${Math.min(parseFloat(b.style.top) - 60, 640)}px`
        card.hidden = false
        b.blur()
      })
    },
    onStep(k, el, animate) {
      const pins = [...el.querySelectorAll('.hexpin')]
      if (k === 1 && animate) {
        window.gsap?.fromTo(pins, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.09, ease: 'back.out(2)', clearProps: 'all' })
      }
      if (k !== 1) el.querySelector('.pin-card').hidden = true
    },
    leave(el) {
      el.querySelector('.pin-card').hidden = true
    },
  },

  // ---------- 5 · Público ----------
  {
    id: 'publico',
    section: 2,
    title: 'Para todos los que ruedan',
    notes: `Tres personas de ejemplo. Una frase por cada una.
Andrea, conductora: quiere reportar sin llamar a nadie.
Kevin, repartidor: quiere un bache menos en su ruta.
Don Rodrigo, vecino: si otro ya reportó, se suma con «Yo también lo vi».`,
    layout: 'dark',
    html: `
      <div class="bleed scrim-top"></div>
      <h2 class="mega small over" data-in="words">Para todos los que <em>ruedan.</em></h2>
      <div class="gente">
        ${[
          ['car', 'Andrea', 'Conductora', 'Reportar sin llamar a nadie', 'guate-calle'],
          ['moto', 'Kevin', 'Repartidor', 'Un bache menos en su ruta', 'bache-moto'],
          ['home', 'Don Rodrigo', 'Vecino', '«Yo también lo vi»', 'guate-aerea'],
        ].map(([i, n, r, q, f]) => `
          <figure class="persona" data-in="up">
            <img src="media/fotos/${f}.jpg" alt="" />
            <figcaption>
              <span class="chip-ic">${svgIcon(i, 58)}</span>
              <b>${n}</b><small>${r}</small>
              <p>${q}</p>
            </figcaption>
          </figure>`).join('')}
      </div>
      <small class="fine">Personas de ejemplo</small>`,
  },

  // ---------- 6 · Solución ----------
  {
    id: 'reportar',
    section: 3,
    title: 'Cómo se reporta · la app real (interactiva)',
    notes: `Este es el reporte real, grabado de la app. Sin cuenta, desde el teléfono.
Toquen cada paso a la izquierda para saltar en el video.
1. Márcalo: GPS o mover el mapa. 2. Foto y qué tan grave. 3. Recibes un folio, como una placa, y con él ves cómo avanza.
El contacto es opcional y nunca se publica.`,
    layout: 'green',
    html: `
      <div class="sol">
        <div class="sol-left">
          <div class="lockup small" data-in="fade"><img src="media/brand/isotipo.png" alt="" /><i></i><img src="media/brand/letras-blanco.png" alt="Bachea" /></div>
          <h2 class="mega small" data-in="words">Tres pasos.<br /><em>Cero cuentas.</em></h2>
          <ol class="pasos">
            ${pasosReporte.map((p, i) => `
              <li data-in="left"><button data-t="${p.t}" data-k="${i}"><span class="num">${p.n}</span>${svgIcon(p.icon, 50)}<b>${p.title}</b></button></li>`).join('')}
          </ol>
        </div>
        <div class="phone" data-in="up"><video src="media/demos/reporte.mp4" data-autoplay loop data-preview-time="11.8"></video></div>
      </div>`,
    init(el) {
      const v = el.querySelector('video')
      const btns = [...el.querySelectorAll('.pasos button')]
      btns.forEach((b) => b.addEventListener('click', () => {
        v.currentTime = +b.dataset.t
        v.play().catch(() => {})
        b.blur()
      }))
      v.addEventListener('timeupdate', () => {
        const t = v.currentTime
        let on = -1
        pasosReporte.forEach((p, i) => { if (t >= p.t) on = i })
        btns.forEach((b, i) => b.classList.toggle('on', i === on))
      })
    },
  },

  // ---------- 7 · Cuadrilla ----------
  {
    id: 'cuadrilla',
    section: 4,
    title: 'Cada reporte llega a una cuadrilla',
    notes: `Video de la ruta: una jornada son varios baches en orden. Dejen que corra.
[clic] El panel real: la bandeja ordena por gravedad y por cuántos vecinos lo apoyan.
La jornada arma la ruta en Google Maps y se envía a la cuadrilla.
Al terminar se sube la evidencia y se registra lo que costó.`,
    layout: 'dark',
    html: `
      <video class="bleed" src="media/motion/ruta.mp4" data-autoplay data-preview-time="9.6"></video>
      <div class="bleed step-layer solid" data-step="1" data-anim="fade">
        <div class="panel-grid">
          <div>
            <h2 class="mega small" data-in="up">Cada reporte llega a <em>una cuadrilla.</em></h2>
            <ul class="tres">
              <li data-in="left">${svgIcon('shield', 52)}<b>Primero lo peligroso</b></li>
              <li data-in="left">${svgIcon('route', 52)}<b>Ruta en Google Maps</b></li>
              <li data-in="left">${svgIcon('camera', 52)}<b>Foto de evidencia</b></li>
            </ul>
          </div>
          <div class="laptop" data-in="up"><div class="screen"><video src="media/demos/panel.mp4" data-autoplay loop data-preview-time="12"></video></div><i class="base"></i></div>
        </div>
      </div>`,
  },

  // ---------- 8 · Prueba ----------
  {
    id: 'prueba',
    section: 5,
    title: 'La prueba es la foto (interactiva)',
    notes: `El video corre solo.
[clic] Arrastren la línea: antes y después. Así se ve cada reparación en el sitio público.
Aclaren: esta imagen es una simulación porque todavía no tenemos reparaciones reales publicadas.
Privacidad: las fotos se limpian de metadatos y el contacto nunca sale a páginas públicas.`,
    layout: 'dark',
    html: `
      <video class="bleed" src="media/motion/tapado.mp4" data-autoplay data-preview-time="6.5"></video>
      <div class="bleed step-layer solid" data-step="1" data-anim="fade">
        <div class="ba">
          <img class="ba-after" src="media/fotos/bache-moto-tapado.jpg" alt="Simulación del bache tapado" />
          <img class="ba-before" src="media/fotos/bache-moto.jpg" alt="El bache antes de la reparación" />
          <span class="ba-tag a">Antes</span><span class="ba-tag b">Después</span>
          <div class="ba-line"><span>${svgIcon('hand', 60, 1.5)}</span></div>
          <input type="range" min="0" max="100" value="50" aria-label="Comparar antes y después" />
        </div>
        <div class="ba-scrim"></div>
        <h2 class="mega small ba-title" data-in="words">No nos crean.<br /><em>Vean la foto.</em></h2>
        <small class="fine">Simulación ilustrativa</small>
      </div>`,
    init(el) {
      const r = el.querySelector('input')
      const set = () => el.querySelector('.ba').style.setProperty('--split', `${r.value}%`)
      r.addEventListener('input', set)
      // Al soltarlo se libera el foco: las flechas y el clicker vuelven a mover las diapositivas
      r.addEventListener('pointerup', () => r.blur())
      r.addEventListener('change', () => r.blur())
      set()
    },
    onStep(k, el) {
      if (k !== 1) return
      const r = el.querySelector('input')
      r.value = 50
      el.querySelector('.ba').style.setProperty('--split', '50%')
    },
  },

  // ---------- 9 · Demo ----------
  {
    id: 'demo',
    section: 6,
    title: 'Demo en vivo · 4 minutos',
    notes: `Clic en «Abrir la app». Sigue la ruta de abajo, con un ejemplo real de la sala si se puede.
1. Reportar desde el teléfono (usa el mapa si el GPS tarda). 2. Ver el folio en Seguimiento.
3. En el panel: entra el reporte, se agrega a la jornada, se marca tapado. 4. Abrir el feed público.
¿Falla internet o la app? No expliquen: toquen un video de respaldo y sigan narrando.
Panel: demo@bachea.test.`,
    layout: 'dark demo',
    html: `
      <div class="demo-rail" aria-hidden="true"></div>
      <div class="demo-body">
        <span class="live" data-in="fade"><i></i>Demostración</span>
        <h2 class="mega" data-in="words">Ahora, <em>en vivo.</em></h2>
        <ol class="ruta-demo">
          ${['Reportar', 'Seguir el folio', 'Asignar y tapar', 'Publicar'].map((t, i) => `<li data-in="up"><span>${i + 1}</span><b>${t}</b></li>`).join('')}
        </ol>
        <div class="demo-actions" data-in="fade">
          <a class="cta" href="${APP_URL}" target="bachea-app" rel="noopener">${svgIcon('ext', 44, 2)} Abrir la app</a>
          <div class="backup"><span>Videos de respaldo</span>
            ${respaldo.map((r) => `<button data-file="${r.file}" data-tall="${r.tall}">${svgIcon(r.icon, 34)}${r.label}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="backup-view" hidden>
        <button class="backup-close" aria-label="Cerrar video">${svgIcon('x', 44, 2)}</button>
        <div class="backup-frame"><video playsinline muted loop></video></div>
      </div>`,
    init(el) {
      const view = el.querySelector('.backup-view')
      const v = view.querySelector('video')
      el.querySelectorAll('.backup button').forEach((b) => b.addEventListener('click', () => {
        v.src = `media/demos/${b.dataset.file}.mp4`
        view.classList.toggle('tall', b.dataset.tall === 'true')
        view.hidden = false
        v.play().catch(() => {})
        b.blur()
      }))
      view.querySelector('.backup-close').addEventListener('click', () => {
        view.hidden = true
        v.pause()
      })
    },
    leave(el) {
      el.querySelector('.backup-view').hidden = true
      el.querySelector('.backup-view video').pause()
    },
  },

  // ---------- 10 · Cierre ----------
  {
    id: 'cierre',
    section: 7,
    title: 'Cierre',
    notes: `Una sola petición: ${SITE_URL ? 'que escaneen el QR y reporten' : 'que pasen al stand y reporten'} el bache que les queda más cerca.
Terminen con la frase y callen. Tecla L: video en bucle para el stand. Tecla G: juego. Tecla C: créditos.`,
    layout: 'dark',
    html: `
      <img class="bleed" src="media/fotos/guate-aerea.jpg" alt="Vista aérea de Ciudad de Guatemala" />
      <div class="bleed scrim-green"></div>
      <div class="cierre">
        <img class="cierre-logo" data-in="pop" src="media/brand/isotipo.png" alt="Bachea" />
        <div>
          <h2 class="mega" data-in="words">Tú lo reportas.<br />Nosotros lo tapamos.</h2>
          <p class="cierre-cta" data-in="up">${svgIcon('pin', 54, 2)} ${SITE_URL ? 'Escanea y reporta tu primer bache' : 'Pasa al stand y reporta tu primer bache'}</p>
        </div>
        ${SITE_URL ? `<div class="qr" data-in="up"><img src="media/qr-bachea.svg" alt="QR a ${SITE_URL}" /><b>${SITE_URL.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</b></div>` : ''}
      </div>
      <small class="fine light">Personas, reportes y antes/después son ejemplos. Fotos: Wikimedia Commons. Mapa: © OpenStreetMap.</small>`,
  },

  // ---------- Extra · Video en bucle para el stand ----------
  {
    id: 'lanzamiento',
    section: 'x',
    extra: true,
    title: 'Video de lanzamiento en bucle (21 s, sin sonido)',
    notes: 'Fuera del flujo. Tecla L para abrir. Déjenlo corriendo en el stand.',
    layout: 'dark',
    html: '<video class="bleed" src="media/motion/antesala.mp4" data-autoplay loop muted data-preview-time="19.8"></video>',
  },

  // ---------- Extra · Juego para el stand ----------
  {
    id: 'juego',
    section: 'x',
    extra: true,
    title: 'Juego del stand · ¿Cuántos tapas?',
    notes: 'Fuera del flujo. Tecla G para abrir. En una pantalla táctil, el visitante toca los baches durante 20 segundos.',
    layout: 'dark juego',
    html: `
      <img class="bleed" src="media/mapa/guate-oscuro.jpg" alt="" />
      <div class="bleed scrim-map"></div>
      <div class="hud"><div><small>Tapados</small><b class="score">0</b></div><div><small>Tiempo</small><b class="time">20</b></div><div><small>Récord</small><b class="best">0</b></div></div>
      <div class="field"></div>
      <div class="juego-start">
        <h2 class="mega">¿Cuántos <em>tapas?</em></h2>
        <button class="cta start">${svgIcon('play', 44, 2)} Empezar</button>
      </div>`,
    init(el) {
      const field = el.querySelector('.field')
      const scoreEl = el.querySelector('.score')
      const timeEl = el.querySelector('.time')
      const bestEl = el.querySelector('.best')
      const start = el.querySelector('.juego-start')
      const title = start.querySelector('h2')
      const btn = start.querySelector('.start')
      let best = 0
      try { best = +(localStorage.getItem('bachea-record') || 0) } catch {}
      bestEl.textContent = best
      let timers = []
      let score = 0
      const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t }
      const clear = () => { timers.forEach(clearTimeout); clearInterval(el._tick); timers = []; field.replaceChildren() }
      const spawn = (left) => {
        const b = document.createElement('button')
        b.className = 'hole'
        b.style.left = `${120 + Math.random() * 1600}px`
        b.style.top = `${230 + Math.random() * 720}px`
        b.setAttribute('aria-label', 'Tapar bache')
        const stay = Math.max(800, 1600 - (20 - left) * 45)
        const gone = later(() => b.remove(), stay)
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          clearTimeout(gone)
          score++
          scoreEl.textContent = score
          b.classList.add('done')
          b.disabled = true
          later(() => b.remove(), 450)
        })
        field.appendChild(b)
      }
      const fin = () => {
        clear()
        if (score > best) {
          best = score
          bestEl.textContent = best
          try { localStorage.setItem('bachea-record', best) } catch {}
        }
        title.innerHTML = `¡<em>${score}</em> ${score === 1 ? 'bache tapado' : 'baches tapados'}!`
        btn.lastChild.textContent = ' Otra vez'
        start.hidden = false
      }
      btn.addEventListener('click', () => {
        clear()
        score = 0
        scoreEl.textContent = 0
        let left = 20
        timeEl.textContent = left
        start.hidden = true
        const loop = () => {
          if (left <= 0) return
          spawn(left)
          later(loop, Math.max(330, 750 - (20 - left) * 22))
        }
        loop()
        el._tick = setInterval(() => {
          left--
          timeEl.textContent = left
          if (left <= 0) fin()
        }, 1000)
        btn.blur()
      })
      el._clear = clear
    },
    leave(el) {
      el._clear?.()
      el.querySelector('.juego-start').hidden = false
    },
  },

  // ---------- Extra · Créditos ----------
  {
    id: 'creditos',
    section: 'x',
    extra: true,
    title: 'Créditos de imágenes',
    notes: 'Fuera del flujo. Tecla C para abrir. Las licencias CC BY y CC BY-SA piden citar al autor.',
    layout: 'dark creditos',
    html: `
      <h2 class="mega small"><em>Créditos</em></h2>
      <ul class="cred">
        ${creditos.map((c) => `<li><b>${c.uso}</b><span>${c.autor} · ${c.licencia}</span></li>`).join('')}
      </ul>
      <p class="cred-note">Imágenes de Wikimedia Commons; los enlaces están en CREDITOS.md. Los «después» son simulaciones hechas sobre las fotos originales. Mapa © colaboradores de OpenStreetMap.<br />Presentación hecha con apoyo de herramientas de inteligencia artificial.</p>`,
  },
]

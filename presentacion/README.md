# Bachea · presentación

Presentación interactiva de Bachea: 6 minutos de historia y 4 de demo en vivo. Funciona sin internet, salvo la app durante la demo. Las fuentes, las animaciones y los videos van dentro del proyecto.

## Correrla el día de la presentación

```bash
npm install
npm run build
npm run preview
```

Abre http://localhost:4173, pulsa **F** para pantalla completa y **P** para la vista de presentador (arrástrala a la laptop; la presentación va al proyector).

## Teclas

| Tecla | Acción |
| --- | --- |
| → · Espacio · PageDown | Siguiente paso o diapositiva (funciona con clicker) |
| ← · PageUp | Anterior |
| número + Enter | Saltar a esa diapositiva |
| D | Ir a la demo en vivo |
| L | Video de lanzamiento en bucle para el stand |
| G | Juego «¿Cuántos tapas?» para el stand |
| C | Créditos de fotos |
| F / P | Pantalla completa / presentador |
| B o . | Pantalla negra |
| V | Pausar o reanudar el video |
| R | Repetir la animación de entrada |

Partes interactivas: tocar un bache en el mapa, tocar cada paso junto al teléfono, arrastrar el antes/después y los videos de respaldo de la demo. Mueve el mouse para que aparezca el cursor.

## Preparar la demo en vivo

```bash
# Desde la raíz del repositorio
npx supabase start && npm run dev                    # app en http://localhost:3000
# En otra terminal
cd presentacion && DEMO_PASSWORD='una-clave-local' npm run seed   # 14 reportes de ejemplo
```

- `npm run seed` solo corre contra Supabase local y solo reemplaza lo que él mismo creó (folios `BCH-DEM*`, y cuadrillas y jornadas «Demo»).
- Panel: http://localhost:3000/admin con `demo@bachea.test` y la clave que pusiste en `DEMO_PASSWORD`. Es una cuenta local: no la uses en producción.
- Ensaya con la app ya abierta. El mapa necesita internet; si falla, usa los videos de respaldo de la diapositiva.
- Después de `npx supabase db reset` hay que correr `npm run seed` otra vez.

## Antes de presentar

1. **URL y QR:** cuando Bachea esté publicada, pon `SITE_URL` en `src/config.js` y corre `npm run qr -- https://tu-dominio`. Mientras esté vacía, el cierre invita a pasar al stand.
2. **Quién presenta qué:** cambia `who` en `src/sections.js`.
3. **Fotos reales:** si tienen reparaciones reales, reemplaza `public/media/fotos/bache-moto.jpg` y `bache-moto-tapado.jpg` (misma proporción, 4:3) y quita la etiqueta de simulación en `src/slides/index.js`.

## Publicarla en Vercel

Crea un proyecto aparte con **Root Directory** `presentacion`. Vercel detecta Vite: se compila con `npm run build` y publica `dist`. No requiere variables de entorno.

El botón «Abrir la app» apunta a `APP_URL` en `src/config.js`, así que apunta a `localhost:3000` en la computadora de quien presenta hasta que lo cambies por el dominio real.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Contenido y notas de cada diapositiva | `src/slides/index.js` |
| Guion y demo paso a paso | `GUION.md` |
| Videos motion (HyperFrames) | `videos/<nombre>/`; se exportan a `public/media/motion/` |
| Video de lanzamiento | `brag-output/` (plan, video, póster y texto para compartir). Para volver a exportarlo, copia antes los videos de `public/media/motion` y `public/media/demos` a `composition/assets` |
| Grabaciones de la app real | `public/media/demos/`; se regeneran con `npm run grabar` |
| Créditos y licencias | `CREDITOS.md` |

Para volver a exportar un video: `npx hyperframes render -o ../../public/media/motion/<nombre>.mp4` dentro de su carpeta.

## Pruebas

Con `npm run dev` y la app corriendo: `node scripts/prueba-deck.mjs` recorre todo con clics y teclas, y `node scripts/capturas.mjs` saca una imagen de cada paso. Usan el Playwright de la app, en la raíz del repositorio.

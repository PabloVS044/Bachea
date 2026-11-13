"""Genera las versiones de QR de Bachea.

Uso:  python3 scripts/qr/generate.py [URL]   (luego: node scripts/qr/render.mjs)
Requiere: pip install segno
"""
import base64
import pathlib
import sys

import segno

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "qr"
BUILD = OUT / "_html"
URL = sys.argv[1] if len(sys.argv) > 1 else "https://bachea.vercel.app"
DISPLAY_URL = URL.replace("https://", "").replace("http://", "").rstrip("/")

C = {
    "bachea": "#4f8249",
    "dark": "#2e5529",
    "menta": "#93b78b",
    "claro": "#dcead7",
    "noche": "#121a13",
    "fondo": "#eef0eb",
}


def b64(path: pathlib.Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


LOGO = f"data:image/png;base64,{b64(ROOT / 'public/brand/isotipo.png')}"
FONTS = ROOT / "presentacion/videos/ruta/assets/fonts"
FONT_CSS = f"""
@font-face {{ font-family: Barlow; font-weight: 500;
  src: url(data:font/woff2;base64,{b64(FONTS / 'barlow-latin-500-normal.woff2')}) format('woff2'); }}
@font-face {{ font-family: 'Barlow Condensed'; font-weight: 600;
  src: url(data:font/woff2;base64,{b64(FONTS / 'barlow-condensed-latin-600-normal.woff2')}) format('woff2'); }}
@font-face {{ font-family: 'Barlow Condensed'; font-weight: 800;
  src: url(data:font/woff2;base64,{b64(FONTS / 'barlow-condensed-latin-800-normal.woff2')}) format('woff2'); }}
"""
ASPHALT = (
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E"
    "%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='3' stitchTiles='stitch'/%3E"
    "%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0'/%3E%3C/filter%3E"
    "%3Crect width='240' height='240' filter='url(%23g)'/%3E%3C/svg%3E\")"
)


def qr_svg(dots: str, eye_outer: str, eye_inner: str, bg: str | None = "#ffffff",
           style: str = "dots", quiet: int = 3, plate: str = "#ffffff") -> str:
    """SVG del QR con módulos redondeados, ojos con la marca y el isotipo al centro."""
    qr = segno.make(URL, error="h", boost_error=False)
    m = [list(row) for row in qr.matrix]
    n = len(m)
    size = n + 2 * quiet

    # Hueco central para el logo (~24 % del ancho, dentro del margen del nivel H)
    hole = int(round(n * 0.24)) | 1
    h0 = (n - hole) // 2
    h1 = h0 + hole

    def is_finder(r, c):
        return (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)

    def in_hole(r, c):
        return h0 - 1 <= r <= h1 and h0 - 1 <= c <= h1

    parts = []
    for r in range(n):
        for c in range(n):
            if not m[r][c] or is_finder(r, c) or in_hole(r, c):
                continue
            x, y = c + quiet, r + quiet
            if style == "dots":
                parts.append(f'<circle cx="{x + .5}" cy="{y + .5}" r=".43"/>')
            else:
                parts.append(f'<rect x="{x + .06}" y="{y + .06}" width=".88" height=".88" rx=".28"/>')

    eyes = []
    for (r, c) in [(0, 0), (0, n - 7), (n - 7, 0)]:
        x, y = c + quiet, r + quiet
        eyes.append(
            f'<path fill-rule="evenodd" fill="{eye_outer}" d="'
            f'M{x + 2},{y} h3 a2,2 0 0 1 2,2 v3 a2,2 0 0 1 -2,2 h-3 a2,2 0 0 1 -2,-2 v-3 a2,2 0 0 1 2,-2 z '
            f'M{x + 2},{y + 1} a1,1 0 0 0 -1,1 v3 a1,1 0 0 0 1,1 h3 a1,1 0 0 0 1,-1 v-3 a1,1 0 0 0 -1,-1 z"/>'
            f'<rect x="{x + 2}" y="{y + 2}" width="3" height="3" rx="0.9" fill="{eye_inner}"/>'
        )

    # Isotipo: 363x430, centrado en el hueco sobre una placa redondeada
    lw = hole - 0.6
    lh = lw * 430 / 363
    if lh > hole + 1.4:
        lh = hole + 1.4
        lw = lh * 363 / 430
    cx = cy = size / 2
    pw, ph = hole + 1.2, hole + 1.2
    logo = (
        f'<rect x="{cx - pw / 2}" y="{cy - ph / 2}" width="{pw}" height="{ph}" rx="1.6" fill="{plate}"/>'
        f'<image href="{LOGO}" x="{cx - lw / 2}" y="{cy - lh / 2}" width="{lw}" height="{lh}"/>'
    )
    bg_rect = f'<rect width="{size}" height="{size}" rx="2" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="geometricPrecision">'
        f'{bg_rect}<g fill="{dots}">{"".join(parts)}</g>{"".join(eyes)}{logo}</svg>'
    )


def page(w: int, h: int, body: str, css: str = "") -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
{FONT_CSS}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{w}px;height:{h}px;overflow:hidden}}
body{{font-family:Barlow,sans-serif;color:{C['noche']}}}
.cond{{font-family:'Barlow Condensed',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.01em}}
.asphalt{{background-color:{C['noche']};background-image:{ASPHALT};color:#fff}}
.qr svg{{display:block;width:100%;height:100%}}
.road{{background-image:repeating-linear-gradient(to bottom,{C['menta']} 0 var(--d,34px),transparent var(--d,34px) var(--g,58px))}}
.road-h{{background-image:repeating-linear-gradient(to right,{C['menta']} 0 var(--d,34px),transparent var(--d,34px) var(--g,58px))}}
{css}
</style></head><body>{body}</body></html>"""


def wordmark(color: str, size: int) -> str:
    f = "letras-blanco.png" if color == "white" else "letras-noche.png"
    return f'<img src="data:image/png;base64,{b64(ROOT / "public/brand" / f)}" style="height:{size}px;display:block">'


ISO = f'<img src="{LOGO}" style="display:block;height:100%">'

designs = {}

# 1. Solo QR, fondo blanco (para imprimir o pegar donde sea)
designs["01-qr-clasico"] = (1600, 1600, page(1600, 1600,
    f'<div class="qr" style="width:1600px;height:1600px">{qr_svg(C["noche"], C["bachea"], C["noche"], style="dots")}</div>'))

# 2. Solo QR en verde Bachea sobre fondo claro
designs["02-qr-verde"] = (1600, 1600, page(1600, 1600,
    f'<div class="qr" style="width:1600px;height:1600px">{qr_svg(C["dark"], C["noche"], C["bachea"], bg=C["claro"], plate=C["claro"], style="rounded")}</div>'))

# 3. Sticker cuadrado: asfalto con QR en tarjeta
designs["03-sticker-noche"] = (1600, 1600, page(1600, 1600, f"""
<div class="asphalt" style="width:1600px;height:1600px;padding:90px;display:flex;flex-direction:column;align-items:center">
  <div style="display:flex;align-items:center;gap:30px;height:120px">
    <div style="height:120px">{ISO}</div>{wordmark('white', 78)}
  </div>
  <div class="qr" style="margin-top:56px;width:1060px;height:1060px;border-radius:44px;overflow:hidden;box-shadow:0 0 0 14px {C['bachea']}">
    {qr_svg(C['noche'], C['bachea'], C['noche'], style='dots')}
  </div>
  <div class="cond" style="margin-top:60px;font-size:84px;line-height:1;color:{C['menta']}">Escanea y reporta un bache</div>
</div>"""))

# 4. Póster vertical (carta / A4 proporción, 2480x3508 = A4 a 300 dpi)
designs["04-poster-a4"] = (2480, 3508, page(2480, 3508, f"""
<div style="width:2480px;height:3508px;display:flex;flex-direction:column;background:{C['fondo']}">
  <div class="asphalt" style="position:relative;height:1140px;padding:160px 180px 0;overflow:hidden">
    <div class="road" style="--d:90px;--g:150px;position:absolute;right:340px;top:0;bottom:0;width:22px"></div>
    <div style="display:flex;align-items:center;gap:56px;height:240px">
      <div style="height:240px">{ISO}</div>{wordmark('white', 150)}
    </div>
    <div class="cond" style="margin-top:110px;font-size:230px;line-height:.9">¿Viste un bache?</div>
    <div class="cond" style="font-size:230px;line-height:.9;color:{C['menta']}">Repórtalo.</div>
  </div>
  <div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;margin-top:-150px">
    <div class="qr" style="width:1560px;height:1560px;border-radius:70px;overflow:hidden;background:#fff;box-shadow:0 0 0 22px {C['bachea']},0 40px 80px rgba(18,26,19,.25)">
      {qr_svg(C['noche'], C['bachea'], C['noche'], style='dots')}
    </div>
    <div class="cond" style="margin-top:110px;font-size:120px;color:{C['bachea']}">Escanea con tu cámara</div>
    <div style="margin-top:30px;font-size:96px;font-weight:500;color:{C['noche']}">{DISPLAY_URL}</div>
    <div style="margin-top:28px;font-size:62px;color:#4d5b4e">Ciudad de Guatemala y área metropolitana</div>
  </div>
  <div style="height:70px;background:{C['bachea']}"></div>
</div>"""))

# 5. Historia de Instagram / WhatsApp 1080x1920
designs["05-historia-1080x1920"] = (1080, 1920, page(1080, 1920, f"""
<div class="asphalt" style="position:relative;width:1080px;height:1920px;padding:140px 90px 0;display:flex;flex-direction:column;align-items:center;overflow:hidden">
  <div class="road" style="--d:44px;--g:76px;position:absolute;left:50%;margin-left:-6px;top:0;height:250px;width:12px;opacity:.7"></div>
  <div class="road" style="--d:44px;--g:76px;position:absolute;left:50%;margin-left:-6px;bottom:0;height:150px;width:12px;opacity:.7"></div>
  <div style="height:200px;margin-top:90px">{ISO}</div>
  <div style="margin-top:44px">{wordmark('white', 84)}</div>
  <div class="cond" style="margin-top:70px;font-size:104px;line-height:.92;text-align:center">¿Viste un bache?<br><span style="color:{C['menta']}">Repórtalo.</span></div>
  <div class="qr" style="margin-top:70px;width:760px;height:760px;border-radius:40px;overflow:hidden;box-shadow:0 0 0 12px {C['bachea']}">
    {qr_svg(C['noche'], C['bachea'], C['noche'], style='dots')}
  </div>
  <div style="margin-top:56px;font-size:50px;font-weight:500">{DISPLAY_URL}</div>
</div>"""))

# 6. Diapositiva 16:9 para la presentación
designs["06-slide-1920x1080"] = (1920, 1080, page(1920, 1080, f"""
<div class="asphalt" style="position:relative;width:1920px;height:1080px;display:flex;align-items:center;padding:0 130px;gap:120px;overflow:hidden">
  <div class="road-h" style="--d:60px;--g:100px;position:absolute;left:0;right:0;bottom:70px;height:10px;opacity:.55"></div>
  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:30px;height:130px">
      <div style="height:130px">{ISO}</div>{wordmark('white', 80)}
    </div>
    <div class="cond" style="margin-top:70px;font-size:150px;line-height:.9">Pruébala<br><span style="color:{C['menta']}">ahora mismo</span></div>
    <div style="margin-top:50px;font-size:44px;color:#cfd8cd;max-width:760px;line-height:1.3">Escanea el código, reporta un bache con GPS y foto, y sigue su reparación con tu folio.</div>
    <div style="margin-top:44px;font-size:56px;font-weight:500;color:#fff">{DISPLAY_URL}</div>
  </div>
  <div class="qr" style="width:760px;height:760px;flex:none;border-radius:44px;overflow:hidden;box-shadow:0 0 0 14px {C['bachea']}">
    {qr_svg(C['noche'], C['bachea'], C['noche'], style='dots')}
  </div>
</div>"""))

# 7. Tarjeta claro (fondo de la app), cuadrada para redes
designs["07-tarjeta-clara"] = (1600, 1600, page(1600, 1600, f"""
<div style="position:relative;width:1600px;height:1600px;background:{C['fondo']};display:flex;flex-direction:column;align-items:center;padding-top:100px;overflow:hidden">
  {wordmark('noche', 96)}
  <div class="cond" style="margin-top:22px;font-size:58px;color:{C['bachea']}">Reporta baches en Guate</div>
  <div class="qr" style="margin-top:60px;width:1000px;height:1000px;border-radius:48px;overflow:hidden;background:#fff;box-shadow:0 0 0 12px {C['noche']}">
    {qr_svg(C['dark'], C['noche'], C['bachea'], style='rounded')}
  </div>
  <div style="margin-top:64px;font-size:64px;font-weight:500">{DISPLAY_URL}</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:34px;background:{C['bachea']}"></div>
</div>"""))

BUILD.mkdir(parents=True, exist_ok=True)
for name, (w, h, html) in designs.items():
    (BUILD / f"{name}.html").write_text(html)
(BUILD / "sizes.txt").write_text("\n".join(f"{k} {w} {h}" for k, (w, h, _) in designs.items()))

# SVG vectorial del QR para imprenta
(OUT / "bachea-qr.svg").write_text(qr_svg(C["noche"], C["bachea"], C["noche"], style="dots"))
print(f"{len(designs)} diseños para {URL}")

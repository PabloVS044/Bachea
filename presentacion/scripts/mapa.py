"""Une mosaicos de OpenStreetMap (© colaboradores de OSM) en un mapa base oscuro de Ciudad de Guatemala.
Uso: python3 -I scripts/mapa.py <salida_dir>"""
import io, json, math, sys, time, urllib.request
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
Z = 14; LAT, LNG = 14.615, -90.522; W, H = 1920, 1080
def px(lat, lng):
    n = 256 * 2 ** Z
    x = (lng + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y
cx, cy = px(LAT, LNG); x0, y0 = cx - W / 2, cy - H / 2
canvas = Image.new("RGB", (W, H))
for ty in range(int(y0 // 256), int((y0 + H) // 256) + 1):
    for tx in range(int(x0 // 256), int((x0 + W) // 256) + 1):
        req = urllib.request.Request(f"https://tile.openstreetmap.org/{Z}/{tx}/{ty}.png", headers={"User-Agent": "bachea-presentacion/1.0 (mapa base estático de una presentación)"})
        tile = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
        canvas.paste(tile, (int(tx * 256 - x0), int(ty * 256 - y0)))
        time.sleep(.25)
canvas.save(out / "guate-claro.jpg", quality=88)
g = ImageOps.invert(ImageOps.grayscale(canvas))
g = ImageOps.autocontrast(g, cutoff=1).point(lambda v: 255 * (v / 255) ** .8)
dark = ImageOps.colorize(g, black=(10, 16, 11), mid=(62, 84, 62), white=(214, 232, 206))
dark.save(out / "guate-oscuro.jpg", quality=86)
json.dump({"z": Z, "x0": x0, "y0": y0, "w": W, "h": H}, open(out / "guate.json", "w"))

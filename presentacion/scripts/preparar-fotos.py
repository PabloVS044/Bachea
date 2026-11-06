"""Optimiza las fotos elegidas y simula el parche del "después".
Uso: python3 -I scripts/preparar-fotos.py <carpeta_con_originales> <salida>
Las imágenes "*-tapado" son SIMULACIONES y se etiquetan como tales en la presentación."""
import sys, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance
import numpy as np

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

def load(n, w=1920):
    im = Image.open(src / f"{n}.jpg").convert("RGB")
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    return im

def patch(im, quad, seed=1, dark=.52):
    """Parche de corte recto, como uno real: clona la textura del mismo asfalto y la oscurece."""
    W, H = im.size
    rnd = random.Random(seed)
    arr = np.asarray(im, dtype=np.float32)
    # Textura de un trozo limpio (parte baja de la foto), sin su iluminación
    y0 = int(H * .68)
    band_im = im.crop((0, y0, W, H))
    band = np.asarray(band_im, dtype=np.float32)
    low = np.asarray(band_im.filter(ImageFilter.GaussianBlur(W / 80)), dtype=np.float32)
    # El grano se calcula antes de repetir, para que la unión no deje una franja
    g1 = (band - low).mean(axis=2, keepdims=True) * .72
    reps = H // band.shape[0] + 1
    grain = np.concatenate([g1] * reps, axis=0)[:H]
    # Luz de la escena alrededor del hueco
    pts = [(x * W, y * H) for x, y in quad]
    hole = Image.new("L", (W, H), 0)
    ImageDraw.Draw(hole).polygon(pts, fill=255)
    hole_big = hole.filter(ImageFilter.GaussianBlur(W / 45)).point(lambda v: 255 if v > 8 else 0)
    # relleno de la luz: promedio de lo que rodea, sin contar el hueco
    sm = im.filter(ImageFilter.GaussianBlur(W / 22))
    w_mask = np.asarray(hole_big.filter(ImageFilter.GaussianBlur(W / 22)), dtype=np.float32)[..., None] / 255
    around = np.asarray(sm, dtype=np.float32)
    mean_out = arr[np.asarray(hole_big) == 0].mean(axis=0)
    light = around * (1 - w_mask) + mean_out * w_mask
    fresh = light * dark + grain
    fresh = np.clip(fresh, 0, 255)
    # Bordes con pequeño temblor, no perfectamente rectos
    m = Image.new("L", (W, H), 0)
    jit = []
    for i in range(4):
        (ax, ay), (bx, by) = pts[i], pts[(i + 1) % 4]
        for k in range(26):
            t = k / 26
            jit.append((ax + (bx - ax) * t + rnd.uniform(-1, 1) * W / 700, ay + (by - ay) * t + rnd.uniform(-1, 1) * W / 700))
    ImageDraw.Draw(m).polygon(jit, fill=255)
    soft = np.asarray(m.filter(ImageFilter.GaussianBlur(W / 1500)), dtype=np.float32)[..., None] / 255
    out_arr = arr * (1 - soft) + fresh * soft
    # Junta de sello
    ring = Image.new("L", (W, H), 0)
    ImageDraw.Draw(ring).line(jit + jit[:1], fill=170, width=max(3, W // 420))
    r = np.asarray(ring.filter(ImageFilter.GaussianBlur(W / 1300)), dtype=np.float32)[..., None] / 255
    out_arr = out_arr * (1 - r) + np.array([17, 18, 19], dtype=np.float32) * r
    return Image.fromarray(np.clip(out_arr, 0, 255).astype(np.uint8))

JOBS = {
    "14": ("bache-moto", ([(.365, .262), (.635, .252), (.660, .447), (.348, .458)], 3)),
    "3": ("bache-calle", ([(.195, .285), (.905, .275), (.935, .640), (.170, .650)], 4)),
    "25": ("bache-hondo", ([(.110, .235), (.875, .215), (.900, .665), (.090, .690)], 5)),
}
# Usa la foto ya optimizada si existe; si no, parte del original descargado.
for n, (name, p) in JOBS.items():
    base = out / f"{name}.jpg"
    if base.exists():
        im = Image.open(base).convert("RGB")
    else:
        im = load(n)
        im.save(base, quality=84, optimize=True, progressive=True)
    patch(im, *p).save(out / f"{name}-tapado.jpg", quality=84, optimize=True, progressive=True)

OTRAS = {"22": "bache-charco", "38": "bache-grieta", "9": "bache-noche", "10": "bache-tapa", "75": "guate-noche", "80": "guate-aerea", "69": "guate-calle", "138": "cuadrilla-cruce"}
for n, name in OTRAS.items():
    if not (out / f"{name}.jpg").exists():
        load(n).save(out / f"{name}.jpg", quality=82, optimize=True, progressive=True)

#!/usr/bin/env node
// Genera los recursos de marca a partir de assets/brand/logo-original.png.
import sharp from "sharp";

const SRC = "assets/brand/logo-original.png";
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const at = (x, y) => (y * W + x) * 4;
const BG = [data[0], data[1], data[2]];
const dist = (i) => Math.hypot(data[i] - BG[0], data[i + 1] - BG[1], data[i + 2] - BG[2]);

async function save(raw, w, h, box, path) {
  const cropped = sharp(raw, { raw: { width: w, height: h, channels: 4 } }).extract(box);
  await cropped.png().toFile(path);
}

function bbox(raw, w, h, region) {
  let [x0, y0, x1, y1] = [w, h, 0, 0];
  for (let y = region.top; y < region.top + region.height; y++) {
    for (let x = region.left; x < region.left + region.width; x++) {
      if (raw[(y * w + x) * 4 + 3] > 24) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Isotipo: borra solo el fondo conectado con el exterior; el aro claro interior se conserva.
const out = Buffer.from(data);
const REGION = { left: 280, top: 130, width: 420, height: 480 };
const visited = new Uint8Array(W * H);
const stack = [];
for (let x = REGION.left; x < REGION.left + REGION.width; x++) stack.push([x, REGION.top], [x, REGION.top + REGION.height - 1]);
for (let y = REGION.top; y < REGION.top + REGION.height; y++) stack.push([REGION.left, y], [REGION.left + REGION.width - 1, y]);
const SOFT = 90; // el borde suavizado se desmezcla del fondo para evitar halo en fondos oscuros
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < REGION.left || y < REGION.top || x >= REGION.left + REGION.width || y >= REGION.top + REGION.height) continue;
  if (visited[y * W + x]) continue;
  visited[y * W + x] = 1;
  const i = at(x, y);
  const d = dist(i);
  if (d >= SOFT) continue;
  const alpha = d < 12 ? 0 : (d - 12) / (SOFT - 12);
  out[i + 3] = Math.round(alpha * 255);
  if (alpha > 0) {
    for (let c = 0; c < 3; c++) {
      out[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - BG[c] * (1 - alpha)) / alpha)));
    }
  }
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const inside = x >= REGION.left && y >= REGION.top && x < REGION.left + REGION.width && y < REGION.top + REGION.height;
  if (!inside) out[at(x, y) + 3] = 0;
}
const markBox = bbox(out, W, H, REGION);
await save(out, W, H, markBox, "public/brand/isotipo.png");

// Letras: la luminancia se vuelve transparencia, en dos tonos.
const WORD = { left: 735, top: 300, width: 630, height: 150 };
for (const [name, rgb] of [["noche", [0x12, 0x1a, 0x13]], ["blanco", [255, 255, 255]]]) {
  const w = Buffer.alloc(W * H * 4);
  for (let y = WORD.top; y < WORD.top + WORD.height; y++) for (let x = WORD.left; x < WORD.left + WORD.width; x++) {
    const i = at(x, y);
    const a = Math.max(0, Math.min(1, (dist(i) - 25) / 170));
    w[i] = rgb[0]; w[i + 1] = rgb[1]; w[i + 2] = rgb[2]; w[i + 3] = Math.round(a * 255);
  }
  await save(w, W, H, bbox(w, W, H, WORD), `public/brand/letras-${name}.png`);
}

// Íconos de la app
const mark = await sharp("public/brand/isotipo.png").toBuffer();
const square = (size, background) =>
  sharp(mark).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 0, bottom: 0, left: 0, right: 0 }).png();
const padded = async (size, pad, background) => sharp({ create: { width: size, height: size, channels: 4, background } })
  .composite([{ input: await square(size - pad * 2).toBuffer(), gravity: "center" }]).png();
await (await padded(512, 0, { r: 0, g: 0, b: 0, alpha: 0 })).toFile("src/app/icon.png");
await (await padded(180, 14, { r: 0xee, g: 0xf0, b: 0xeb, alpha: 1 })).toFile("src/app/apple-icon.png");
console.log("isotipo", markBox);

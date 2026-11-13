// Renderiza a PNG los diseños que deja scripts/qr/generate.py en assets/qr/_html
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/qr");
const build = path.join(out, "_html");
const browser = await chromium.launch();
for (const line of readFileSync(path.join(build, "sizes.txt"), "utf8").trim().split("\n")) {
  const [name, w, h] = line.split(" ");
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(build, `${name}.html`));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, `bachea-${name}.png`) });
  await page.close();
  console.log("ok", name);
}
await browser.close();
rmSync(build, { recursive: true });

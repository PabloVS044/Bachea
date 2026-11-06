// Genera el QR del sitio como SVG local (sin depender de internet el día de la presentación).
// Uso: npm run qr -- https://tu-dominio
import { writeFile } from 'node:fs/promises'
import QRCode from 'qrcode'

const SITE = process.argv[2]
if (!SITE) throw new Error('Falta la URL: npm run qr -- https://tu-dominio')
const svg = await QRCode.toString(SITE, { type: 'svg', errorCorrectionLevel: 'H', margin: 0, color: { dark: '#121a13', light: '#0000' } })
await writeFile(new URL('../public/media/qr-bachea.svg', import.meta.url), svg)
console.log('QR →', SITE)

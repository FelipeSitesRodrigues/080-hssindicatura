/**
 * Imagem de compartilhamento (1200 x 630), a prévia que aparece quando alguém manda o link
 * no WhatsApp, Instagram ou Facebook. Montada em HTML com as fontes, as torres do hero, o
 * hexágono HS e o Danilo recortado do próprio site, fotografada pelo Chrome e gravada em
 * src/assets/img/og-hs.jpg (o build copia pra dist). Base do 079.
 *
 * Precisa do build feito e do servidor: node scripts/serve.mjs
 * Uso: node scripts/og.mjs
 */
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3080'
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:600 700;src:url(/assets/fonts/montserrat-var.woff2)}
@font-face{font-family:I;font-weight:400 500;src:url(/assets/fonts/inter-var.woff2)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#031926;position:relative;font-family:I}
.cena{position:absolute;inset:0;width:1200px;height:630px;object-fit:cover;object-position:50% 35%}
.veu{position:absolute;inset:0;background:linear-gradient(90deg,#031926 0%,rgb(3 25 38/.93) 38%,rgb(3 25 38/.45) 62%,rgb(3 25 38/.25) 100%),linear-gradient(0deg,rgb(3 25 38/.85),transparent 30%)}
.hex{position:absolute;right:92px;top:34px;width:430px}
.dan{position:absolute;right:48px;bottom:-40px;width:470px}
.txt{position:absolute;left:64px;top:56px;width:640px}
.marca{display:flex;align-items:center;gap:12px}
.marca img{width:46px}
.marca b{font:700 21px/1 M;color:#fff;letter-spacing:.01em}
.marca b span{color:#C9943C}
.rot{margin-top:44px;font:600 15px/1.3 M;letter-spacing:.14em;text-transform:uppercase;color:#C9943C}
h1{margin-top:16px;font:700 50px/1.08 M;letter-spacing:-.018em;color:#fff}
h1 span{color:#C9943C}
.pe{display:flex;gap:26px;margin-top:30px;font:500 18px/1.3 I;color:rgb(255 255 255/.86)}
.pe b{color:#C9943C;font:700 15px/1.3 M;letter-spacing:.1em;text-transform:uppercase}
.faixa{position:absolute;left:0;right:0;bottom:0;height:6px;background:linear-gradient(90deg,#E2B866,#C9943C,#A87A31)}
</style></head><body>
<img class="cena" src="/assets/img/hero-desk-1280.webp" alt="">
<div class="veu"></div>
<img class="hex" src="/assets/img/hex-hs-640.webp" alt="">
<img class="dan" src="/assets/img/danilo-780.webp" alt="">
<div class="txt">
  <div class="marca"><img src="/assets/img/logo-hs-96.webp" alt=""><b><span>HS</span> SINDICATURA</b></div>
  <p class="rot">Síndico profissional em São Paulo</p>
  <h1>Síndico profissional<br>com gestão estratégica,<br><span>transparência e presença.</span></h1>
  <p class="pe"><b>Saúde</b><b>Segurança</b><b>Sossego</b></p>
</div>
<div class="faixa"></div>
</body></html>`

mkdirSync('dist/preview', { recursive: true })
writeFileSync('dist/preview/og.html', html)
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const p = await b.newPage()
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await p.goto(`${BASE}/preview/og.html`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  const png = await p.screenshot({ type: 'png' })
  const info = await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile('src/assets/img/og-hs.jpg')
  console.log(`ok src/assets/img/og-hs.jpg ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`)
} finally {
  await b.close()
  rmSync('dist/preview/og.html', { force: true })
}

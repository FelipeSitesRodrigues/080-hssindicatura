/**
 * Fotografa a abertura do hero em instantes fixos, com a animação ligada: pausa todas as
 * animações e põe o relógio delas no instante pedido (determinístico, sem depender da hora do
 * print). Junta os quadros numa tira pra revisar a sequência.
 *
 * Uso: node scripts/quadros-abertura.mjs [largura] [instantes em ms, separados por vírgula]
 *   node scripts/quadros-abertura.mjs 1440 0,200,500,800,1200,2000
 *   node scripts/quadros-abertura.mjs 390 0,300,600,1000
 * Saída: .tmp/abertura-<largura>.png
 */
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const largura = Number(process.argv[2] || 1440)
const instantes = String(process.argv[3] || '0,200,500,800,1200,2000').split(',').map(Number)
const altura = largura < 600 ? 844 : 900
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] })
const quadros = []
try {
  const p = await b.newPage()
  await p.setViewport({ width: largura, height: altura, deviceScaleFactor: 1, isMobile: largura < 600, hasTouch: largura < 600 })
  await p.goto(process.env.BASE_URL ?? 'http://localhost:3080/', { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  for (const t of instantes) {
    await p.evaluate((t) => {
      for (const a of document.getAnimations()) {
        a.pause()
        a.currentTime = t
      }
    }, t)
    await new Promise((r) => setTimeout(r, 120))
    quadros.push({ t, buf: await p.screenshot({ type: 'png' }) })
  }
} finally {
  await b.close()
}
const esc = largura < 600 ? 1 : 0.5
const w = Math.round(largura * esc)
const h = Math.round(altura * esc)
const colunas = largura < 600 ? quadros.length : Math.min(3, quadros.length)
const linhas = Math.ceil(quadros.length / colunas)
const rot = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28"><rect width="100%" height="100%" fill="#222"/><text x="10" y="20" font-family="Arial" font-size="16" fill="#fff">${t} ms</text></svg>`)
const comp = []
for (const [i, q] of quadros.entries()) {
  const x = (i % colunas) * (w + 10)
  const y = Math.floor(i / colunas) * (h + 38)
  comp.push({ input: rot(q.t), left: x, top: y })
  comp.push({ input: await sharp(q.buf).resize({ width: w }).toBuffer(), left: x, top: y + 28 })
}
mkdirSync('.tmp', { recursive: true })
await sharp({ create: { width: colunas * (w + 10) - 10, height: linhas * (h + 38), channels: 3, background: '#888' } }).composite(comp).png().toFile(`.tmp/abertura-${largura}.png`)
console.log(`ok .tmp/abertura-${largura}.png (${quadros.length} quadros)`)

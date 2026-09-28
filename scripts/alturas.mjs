/**
 * Mede a altura do CONTEÚDO de cada seção abaixo do topo (altura menos o padding vertical),
 * nas larguras dos degraus do src/css/99-desempenho.css, em todas as páginas. É o número do
 * contain-intrinsic-size (o navegador soma o padding por cima: bug do 076). Rodar de novo
 * quando uma seção mudar muito de tamanho e atualizar o CSS.
 *
 * Uso: node scripts/alturas.mjs [rota]   (com o servidor no ar; BASE_URL pra outra porta)
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3080').replace(/\/$/, '')
const paginas = JSON.parse(readFileSync(new URL('../src/paginas.json', import.meta.url), 'utf8')).itens
const rotas = process.argv[2] ? [process.argv[2]] : paginas.map((p) => p.rota)
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const p = await b.newPage()
  for (const rota of rotas) {
    console.log(`\n${rota}`)
    for (const w of [1440, 1100, 800, 390]) {
      await p.setViewport({ width: w, height: 900, isMobile: w < 600, hasTouch: w < 600 })
      await p.goto(BASE + rota, { waitUntil: 'networkidle2' })
      const r = await p.evaluate(() => {
        document.documentElement.classList.add('cv-pronto')
        return [...document.querySelectorAll('main > section:not(:first-child), footer')].map((el) => {
          const cs = getComputedStyle(el)
          return `${el.id || el.className.split(' ').pop()} ${Math.round(el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom))}`
        })
      })
      console.log(`  ${w}: ${r.join(' | ')}`)
    }
  }
} finally {
  await b.close()
}

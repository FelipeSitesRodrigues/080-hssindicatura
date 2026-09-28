/**
 * Baixa as fontes do Google Fonts e grava no próprio site (src/assets/fonts), com o
 * @font-face em src/css/_fontes.css (base do 079).
 *
 * Briefing da HS: títulos em Montserrat 600/700 e texto em Inter 400/500. Ficou assim:
 * - 'Montserrat' variável, peso de 600 a 700, num arquivo só (títulos, botões, números).
 * - 'Inter' variável, peso de 400 a 500 (texto corrido, menu, rótulos).
 * - Fallbacks com size-adjust medidos contra a fonte real (Arial negrito pros títulos,
 *   Arial pro texto): enquanto a fonte chega, o texto ocupa quase o mesmo espaço e a
 *   linha não quebra diferente (CLS).
 *
 * O CSS do Google pedido sem user agent de navegador devolve TTF estático, que o
 * opentype.js lê pra medir; com user agent de navegador, WOFF2 variável cortado por
 * alfabeto (vale o bloco latin).
 *
 * Uso: node scripts/baixar-fontes.mjs   (ou npm run fontes)
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import subsetFont from 'subset-font'
import opentype from 'opentype.js'

const CACHE = 'scripts/.cache'
mkdirSync('src/assets/fonts', { recursive: true })
mkdirSync(CACHE, { recursive: true })
mkdirSync('src/css', { recursive: true })

// letras do site: ASCII, Latin-1 (acentos do português) e a pontuação tipográfica usada
let LETRAS = ''
for (let c = 0x20; c <= 0x7e; c++) LETRAS += String.fromCharCode(c)
for (let c = 0xa0; c <= 0xff; c++) LETRAS += String.fromCharCode(c)
LETRAS += '‘’“”•…·→©ªº'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function baixar(familia, arq, { navegador = false } = {}) {
  const destino = `${CACHE}/${arq}`
  if (existsSync(destino)) return readFileSync(destino)
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}`, navegador ? { headers: { 'User-Agent': UA } } : {})).text()
  const bloco = navegador ? [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)].find(([, sub]) => sub === 'latin')?.[2] : css
  const url = bloco?.match(/url\((https:[^)]+)\)/)?.[1]
  if (!url) throw new Error(`sem url de fonte para ${familia}:\n${css.slice(0, 300)}`)
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  writeFileSync(destino, buf)
  console.log('baixada', arq, Math.round(buf.length / 1024) + ' KB')
  return buf
}

const kb = (b) => (b.length / 1024).toFixed(1) + ' KB'
const ab = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

// largura média de um texto de referência, em em
const AMOSTRA_TITULO = 'Síndico profissional com gestão estratégica, transparência e presença. O que entregamos na prática. Um método claro, do diagnóstico ao acompanhamento.'
const AMOSTRA_TEXTO = 'Gestão condominial estruturada para condomínios residenciais, mistos e comerciais, com foco em organização administrativa, controle financeiro e comunicação clara entre conselho, moradores e administradora.'
const largura = (fonte, texto) => fonte.getAdvanceWidth(texto, fonte.unitsPerEm) / fonte.unitsPerEm

function fallback(nome, fonte, local, arqLocal, amostra) {
  const ref = opentype.parse(ab(readFileSync(arqLocal)))
  const ajuste = largura(fonte, amostra) / largura(ref, amostra)
  const upm = fonte.unitsPerEm
  const hhea = fonte.tables.hhea
  const pct = (v) => (v * 100).toFixed(2) + '%'
  return `@font-face {
  font-family: '${nome}';
  src: ${local.map((l) => `local('${l}')`).join(', ')};
  size-adjust: ${pct(ajuste)};
  ascent-override: ${pct(hhea.ascender / upm / ajuste)};
  descent-override: ${pct(Math.abs(hhea.descender) / upm / ajuste)};
  line-gap-override: ${pct((hhea.lineGap || 0) / upm / ajuste)};
}`
}

async function variavel(buf, eixos) {
  try {
    return await subsetFont(buf, LETRAS, { targetFormat: 'woff2', variationAxes: eixos })
  } catch (e) {
    console.log('aviso: subset-font não limitou os eixos, vai a variável inteira:', e.message)
    return subsetFont(buf, LETRAS, { targetFormat: 'woff2' })
  }
}

const saida = ['/* Gerado por scripts/baixar-fontes.mjs. Não editar à mão. */']

// ---------------------------------------------------------------- Montserrat variável 600 a 700 (títulos, botões, números)
const montserrat = await baixar('Montserrat:wght@600..700', 'montserrat-var-latin.woff2', { navegador: true })
const montserratWoff2 = await variavel(montserrat, { wght: { min: 600, max: 700, default: 600 } })
writeFileSync('src/assets/fonts/montserrat-var.woff2', montserratWoff2)
console.log('ok montserrat-var.woff2', kb(montserratWoff2))
saida.push(`@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 600 700;
  font-display: swap;
  src: url('/assets/fonts/montserrat-var.woff2') format('woff2');
}`)
const montserrat700 = opentype.parse(ab(await baixar('Montserrat:wght@700', 'montserrat-700.ttf')))
saida.push(fallback('Montserrat fallback', montserrat700, ['Arial Bold', 'Arial-BoldMT', 'Arial'], 'C:/Windows/Fonts/arialbd.ttf', AMOSTRA_TITULO))

// ---------------------------------------------------------------- Inter variável 400 a 500 (texto)
const inter = await baixar('Inter:wght@400..500', 'inter-var-latin.woff2', { navegador: true })
const interWoff2 = await variavel(inter, { wght: { min: 400, max: 500, default: 400 } })
writeFileSync('src/assets/fonts/inter-var.woff2', interWoff2)
console.log('ok inter-var.woff2', kb(interWoff2))
saida.push(`@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 500;
  font-display: swap;
  src: url('/assets/fonts/inter-var.woff2') format('woff2');
}`)
const inter400 = opentype.parse(ab(await baixar('Inter:wght@400', 'inter-400.ttf')))
saida.push(fallback('Inter fallback', inter400, ['Arial', 'Helvetica', 'Roboto'], 'C:/Windows/Fonts/arial.ttf', AMOSTRA_TEXTO))

writeFileSync('src/css/_fontes.css', saida.join('\n') + '\n')
console.log('src/css/_fontes.css gravado')
const cap = (f) => f.tables.os2.sCapHeight / f.unitsPerEm
console.log(`altura de maiúscula: Montserrat 700 ${cap(montserrat700).toFixed(3)} em, Inter ${cap(inter400).toFixed(3)} em`)

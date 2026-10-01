/**
 * Gera as imagens do site a partir de "../080 - HS Sindicatura/Recursos Site", em
 * src/assets/img, em AVIF e WebP e em várias larguras pra srcset. Grava
 * src/assets/img/manifesto.json com largura e altura de cada arquivo (pro width/height do
 * <img>, sem salto de layout). Base do 079.
 *
 * - Hero: as torres de vidro na hora azul, deitadas no computador (DESKTOP/IMAGEM FUNDO
 *   HERO DESKTOP) e em pé no celular (MOBILE/IMAGEM HERO MOBILE), feitas pro mockup.
 * - Danilo recortado (02 - IMAGEM DANILO FUNDO TRANSPARENTE): o PNG guarda a cor de um
 *   brilho laranja nos pixels transparentes (memória do 080). Aqui a cor escondida é zerada,
 *   a borda dos dedos que encosta na esquerda e o corte da cintura somem num degradê.
 * - Hexágono HS: o símbolo do logo (01 - LOGO ... FAVICON), grande atrás do Danilo. O
 *   azul-marinho de dentro fica translúcido, pra cidade aparecer por trás, como no mockup.
 *   O mesmo símbolo, inteiro, é o logo do header e do rodapé e os favicons. O arquivo tem
 *   uma franja vermelha na borda e um acento solto embaixo: saem aqui.
 * - Fundador: a foto do Danilo no corredor de vidro (02 - IMAGEM DANILO.jpg), no bloco
 *   Liderança da Home e na página A HS.
 * - As 3 soluções (cartões da Home e blocos da página Soluções) e o topo das páginas
 *   Soluções e A HS: foto real com o nome do site em PÁGINAS/ (sol-implantacao, sol-gestao,
 *   sol-sindico, topo-solucoes, topo-sobre) passa na frente; senão, banco de imagem de WEB/
 *   (créditos em WEB/creditos.md); senão, um recorte das provisórias do mockup.
 * - Case Sunset View: a foto real do condomínio, opcional, em CASES/sunset-view.
 * - Antes e depois (ANTES X DEPOIS/ANTES n e DEPOIS n) e jardim renovado (JARDIM RENOVAD-
 *   CARROSEL): fotos reais do condomínio, sem tratamento de cor. Os pares saem alinhados no
 *   mesmo quadro 4:5 (src/dados/antes-depois.json); as fotos do jardim, na ordem de
 *   src/dados/jardim.json.
 * - CTA final: as mesmas torres do hero, mais leves (aparecem a ~30% sob o véu).
 *
 * A imagem de compartilhamento sai do scripts/og.mjs e fica quando este roda de novo.
 *
 * Uso: node scripts/processar-imagens.mjs   (ou npm run imagens)
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const R = '../080 - HS Sindicatura/Recursos Site'
const OUT = 'src/assets/img'
const PETROLEO = { r: 3, g: 25, b: 38 } // #031926

// acha o arquivo mesmo que o nome venha com acento em outra normalização (NFC/NFD)
function achar(relativo, obrigatorio = true) {
  let atual = R
  for (const parte of relativo.split('/')) {
    if (!existsSync(atual)) return null
    const nome = readdirSync(atual).find((n) => n.normalize('NFC').toLowerCase() === parte.normalize('NFC').toLowerCase())
    if (!nome) {
      if (obrigatorio) throw new Error(`falta o arquivo: ${atual}/${parte}`)
      return null
    }
    atual = path.join(atual, nome)
  }
  return atual
}

// esvazia a pasta; fica a imagem de compartilhamento (og.mjs)
mkdirSync(OUT, { recursive: true })
const manifestoAntigo = existsSync(path.join(OUT, 'manifesto.json')) ? JSON.parse(readFileSync(path.join(OUT, 'manifesto.json'), 'utf8')) : {}
const fica = (f) => f.startsWith('og-')
for (const f of readdirSync(OUT)) if (!fica(f)) rmSync(path.join(OUT, f), { recursive: true, force: true })
mkdirSync('src/raiz', { recursive: true })
const manifesto = Object.fromEntries(Object.entries(manifestoAntigo).filter(([f]) => fica(f)))
const provisorias = []
// o foco de cada foto (onde o recorte centra): ajustado olhando a foto escolhida
const FOCO = JSON.parse(readFileSync('scripts/focos.json', 'utf8'))

async function gravar(pipeline, nome) {
  const info = await pipeline.toFile(path.join(OUT, nome))
  manifesto[nome] = { w: info.width, h: info.height, kb: Math.round(info.size / 1024) }
}

// uma imagem (arquivo ou buffer) em várias larguras, AVIF e WebP
async function variantes(origem, nome, larguras, { q = 74, alfa = false, avif = null } = {}) {
  for (const w of larguras) {
    for (const f of ['avif', 'webp']) {
      let p = sharp(origem).resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' })
      p =
        f === 'avif'
          ? p.avif(avif || { quality: Math.round(q - 22), effort: 7, chromaSubsampling: alfa ? '4:4:4' : '4:2:0' })
          : p.webp({ quality: q, effort: 6, smartSubsample: true, ...(alfa ? { alphaQuality: 88 } : {}) })
      await gravar(p, `${nome}-${w}.${f}`)
    }
  }
}

// recorte na proporção pedida (largura inteira ou altura inteira), centrado no foco; zoom > 1
// fecha o recorte (tira da foto o que não pode aparecer, como letreiro de loja)
async function proporcao(buf, razao, focoY = 0.5, focoX = 0.5, zoom = 1) {
  const m = await sharp(buf).metadata()
  let w = m.width
  let h = Math.round(w / razao)
  if (h > m.height) {
    h = m.height
    w = Math.round(h * razao)
  }
  w = Math.round(w / zoom)
  h = Math.round(h / zoom)
  const top = Math.max(0, Math.min(m.height - h, Math.round(focoY * m.height - h / 2)))
  const left = Math.max(0, Math.min(m.width - w, Math.round(focoX * m.width - w / 2)))
  return sharp(buf).extract({ left, top, width: w, height: h }).toBuffer()
}

// pixels RGBA crus de um PNG com transparência
async function rgba(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { px: data, W: info.width, H: info.height }
}
const png = ({ px, W, H }) => sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()

// ---------------------------------------------------------------- hero
await variantes(achar('DESKTOP/IMAGEM FUNDO HERO DESKTOP.png'), 'hero-desk', [960, 1280, 1672], { q: 66, avif: { quality: 38, effort: 8, chromaSubsampling: '4:2:0' } })
// 760: o Lighthouse de celular é 412 px em tela 1,75x (721 px). AVIF leve: é o LCP do celular
await variantes(achar('MOBILE/IMAGEM HERO MOBILE.png'), 'hero-cel', [480, 640, 760, 940], { q: 60, avif: { quality: 24, effort: 9, chromaSubsampling: '4:2:0' } })

// ---------------------------------------------------------------- Danilo recortado
{
  const img = await rgba(achar('02 - IMAGEM DANILO FUNDO TRANSPARENTE PARA O HERO.png'))
  const { px, W, H } = img
  let escondidos = 0
  const ESQ = 26 // degradê na borda esquerda (os dedos encostam em x = 0)
  const BASE = Math.round(H * 0.1) // degradê no corte da cintura
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      let a = px[i + 3]
      if (a < 12) {
        if (px[i] + px[i + 1] + px[i + 2]) escondidos++
        px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0
        continue
      }
      let f = 1
      if (x < ESQ) f *= x / ESQ
      const dBase = H - 1 - y
      if (dBase < BASE) f *= Math.pow(dBase / BASE, 0.8)
      px[i + 3] = Math.round(a * f)
    }
  console.log(`danilo: ${escondidos} pixels com cor escondida zerados`)
  // tira o vazio de cima (a cabeça começa em y = 136), com folga pro brilho
  const limpo = await sharp(await png(img)).extract({ left: 0, top: 96, width: W, height: H - 96 }).png().toBuffer()
  await variantes(limpo, 'danilo', [420, 600, 780, 1024], { q: 78, alfa: true, avif: { quality: 44, effort: 8, chromaSubsampling: '4:4:4' } })
}

// ---------------------------------------------------------------- símbolo HS (logo e hexágono do hero)
{
  const img = await rgba(achar('01 - LOGO HS SINDICATURA - FAVICON.png'))
  const { px, W, H } = img
  let franja = 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]]
      // cor escondida, o acento solto embaixo à esquerda e a franja vermelha do recorte
      const acento = x >= 100 && x < 220 && y >= 930
      const vermelho = a >= 12 && r > 120 && g < 70 && b < 70
      if (vermelho) franja++
      if (a < 12 || acento || vermelho) px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0
    }
  console.log(`símbolo: ${franja} pixels de franja vermelha tirados`)
  const simbolo = await sharp(await png(img)).trim({ threshold: 1 }).png().toBuffer()
  const m = await sharp(simbolo).metadata()
  console.log(`símbolo recortado: ${m.width}x${m.height}`)
  await variantes(simbolo, 'logo-hs', [64, 96, 128, 192], { q: 90, alfa: true, avif: { quality: 70, effort: 7, chromaSubsampling: '4:4:4' } })

  // hexágono grande do hero: o azul-marinho de dentro vira translúcido (a cidade aparece)
  const hex = await rgba(simbolo)
  for (let i = 0; i < hex.px.length; i += 4) {
    const [r, g, b, a] = [hex.px[i], hex.px[i + 1], hex.px[i + 2], hex.px[i + 3]]
    if (!a) continue
    const azul = b > r + 6 && r < 110 // o marinho e as linhas escuras entre os anéis
    if (azul) hex.px[i + 3] = Math.round(a * 0.38)
  }
  await variantes(await png(hex), 'hex-hs', [360, 480, 640, 960], { q: 76, alfa: true, avif: { quality: 44, effort: 8, chromaSubsampling: '4:2:0' } })

  // favicons: o símbolo inteiro sobre o petróleo
  const quadrado = async (lado, margem) => {
    const util = Math.round(lado * (1 - margem * 2))
    const ic = await sharp(simbolo).resize({ width: util, height: util, fit: 'inside' }).png().toBuffer()
    return sharp({ create: { width: lado, height: lado, channels: 4, background: { ...PETROLEO, alpha: 1 } } }).composite([{ input: ic, gravity: 'center' }])
  }
  const pngIcone = { palette: true, quality: 92, compressionLevel: 9, effort: 10 }
  await (await quadrado(32, 0.06)).png(pngIcone).toFile('src/raiz/favicon-32.png')
  await (await quadrado(180, 0.14)).png(pngIcone).toFile('src/raiz/apple-touch-icon.png')
  await (await quadrado(192, 0.14)).png(pngIcone).toFile('src/raiz/icon-192.png')
  await (await quadrado(512, 0.14)).png(pngIcone).toFile('src/raiz/icon-512.png')
  // favicon.ico com o PNG de 32 embutido (o formato ICO aceita PNG desde o Vista)
  const png32 = await (await quadrado(32, 0.06)).png(pngIcone).toBuffer()
  const ico = Buffer.alloc(22)
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4)
  ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9)
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18)
  writeFileSync('src/raiz/favicon.ico', Buffer.concat([ico, png32]))
}

// ---------------------------------------------------------------- fundador
await variantes(achar('02 - IMAGEM DANILO.jpg'), 'danilo-foto', [400, 600, 800, 1066], { q: 76 })

// ---------------------------------------------------------------- antes e depois (3 pares, fotos reais)
// As duas fotos de cada par não foram tiradas do mesmo ponto nem com o mesmo zoom. Cada par
// sai recortado no mesmo quadro 4:5, alinhado por um ponto em comum (o canto do canteiro, a
// escada) e pela escala (src/dados/antes-depois.json): assim a linha do comparador passa pelo
// mesmo lugar nas duas. Sem tratamento de cor: é a prova do serviço.
{
  const pares = JSON.parse(readFileSync('src/dados/antes-depois.json', 'utf8')).itens
  for (const p of pares) {
    const antes = await sharp(achar(`ANTES X DEPOIS/ANTES ${p.arquivo}.jpg`)).rotate().toBuffer()
    const depois = await sharp(achar(`ANTES X DEPOIS/DEPOIS ${p.arquivo}.jpg`)).rotate().toBuffer()
    const { escala: s, antes: [ax, ay], depois: [dx, dy], quadro: [x, y, w] } = p.alinhamento
    const h = Math.round(w * 1.25)
    const ma = await sharp(antes).metadata()
    const md = await sharp(depois).metadata()
    const ra = { left: Math.round((x - dx) * s + ax), top: Math.round((y - dy) * s + ay), width: Math.round(w * s), height: Math.round(h * s) }
    const cabe = (r, m) => r.left >= 0 && r.top >= 0 && r.left + r.width <= m.width && r.top + r.height <= m.height
    if (!cabe({ left: x, top: y, width: w, height: h }, md)) throw new Error(`antes e depois ${p.id}: o quadro passa da foto de depois (${md.width}x${md.height})`)
    if (!cabe(ra, ma)) throw new Error(`antes e depois ${p.id}: o quadro passa da foto de antes (${JSON.stringify(ra)} em ${ma.width}x${ma.height})`)
    const quadro = (buf, r) => sharp(buf).extract(r).resize(800, 1000, { kernel: 'lanczos3' }).toBuffer()
    await variantes(await quadro(depois, { left: x, top: y, width: w, height: h }), `ad-${p.id}-depois`, [400, 600, 800], { q: 74 })
    await variantes(await quadro(antes, ra), `ad-${p.id}-antes`, [400, 600, 800], { q: 74 })
  }
}

// ---------------------------------------------------------------- jardim renovado (carrossel contínuo)
// Fotos reais, sem tratamento de cor, em pé (3:4) ou deitadas (4:3), como vieram.
{
  const fotos = JSON.parse(readFileSync('src/dados/jardim.json', 'utf8')).itens
  for (const f of fotos) {
    const deitada = f.formato === 'deitada'
    const buf = await proporcao(await sharp(achar(`JARDIM RENOVAD- CARROSEL/${f.arquivo}`)).rotate().toBuffer(), deitada ? 4 / 3 : 3 / 4)
    await variantes(buf, f.id, deitada ? [480, 760, 1120] : [320, 480, 640], { q: 72 })
  }
}

// ---------------------------------------------------------------- CTA final: as torres do hero, leves
await variantes(achar('DESKTOP/IMAGEM FUNDO HERO DESKTOP.png'), 'cta-fundo', [800, 1280], { q: 58, avif: { quality: 34, effort: 8, chromaSubsampling: '4:2:0' } })

// o convite final das páginas internas é uma faixa baixa: as mesmas torres, recortadas deitadas
// (a foto inteira ia com o dobro da altura que aparece)
await variantes(await proporcao(await sharp(achar('DESKTOP/IMAGEM FUNDO HERO DESKTOP.png')).toBuffer(), 3, 0.42), 'cta-faixa', [800, 1280, 1600], { q: 56, avif: { quality: 32, effort: 8, chromaSubsampling: '4:2:0' } })

// ---------------------------------------------------------------- páginas internas e soluções
// Fotos de banco de imagem livre (Unsplash e Pexels, licença de uso comercial; créditos em
// Recursos Site/WEB/creditos.md) até chegarem as fotos reais do Danilo: ficam em
// Recursos Site/WEB/<arquivo>.jpg. Foto real com o NOME DO SITE em Recursos Site/PÁGINAS/
// passa na frente (PÁGINAS/sol-gestao.jpg, PÁGINAS/topo-sobre.jpg...). Todas recebem o mesmo
// tratamento de cor: um pouco menos saturadas e com um véu petróleo bem leve, pra conversarem
// com o site. Sem nenhuma das duas, entra um recorte provisório do mockup (só pra montar).
function daPagina(site, web = site) {
  for (const [pasta, nome] of [['PÁGINAS', site], ['WEB', web]])
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const a = achar(`${pasta}/${nome}.${ext}`, false)
      if (a) return { arq: a, provisoria: pasta === 'WEB' ? 'web' : false, nome }
    }
  return null
}
async function tratar(buf) {
  const { width: w, height: h } = await sharp(buf).metadata()
  const veu = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 8, g: 42, b: 62, alpha: 0.16 } } }).png().toBuffer()
  return sharp(buf).modulate({ saturation: 0.88 }).composite([{ input: veu, blend: 'soft-light' }]).toBuffer()
}
const RESERVA = {
  'topo-solucoes': ['DESKTOP/IMAGEM FUNDO HERO DESKTOP.png', 0.45, 0.7],
  'topo-sobre': ['DESKTOP/IMAGEM FUNDO HERO DESKTOP.png', 0.4, 0.82],
  'sol-implantacao': ['SEÇÕES/PROVISÓRIAS/06 - RESIDENCIAL E MISTO.png', 0.45, 0.5],
  'sol-gestao': ['SEÇÕES/PROVISÓRIAS/07 - VISTORIA.png', 0.5, 0.5],
  'sol-sindico': ['SEÇÕES/PROVISÓRIAS/06 - CONSELHO E ASSEMBLEIAS.png', 0.45, 0.5],
}
const reservas = []
async function daPaginaBuf(site, web, foco) {
  const s = daPagina(site, web)
  if (s) {
    if (s.provisoria) provisorias.push(`WEB/${s.nome}`)
    return { buf: await tratar(await sharp(s.arq).rotate().toBuffer()), foco: foco ?? [0.5, 0.5] }
  }
  const [arq, fy, fx] = RESERVA[site]
  reservas.push(site)
  return { buf: await sharp(achar(arq)).rotate().toBuffer(), foco: [fy, fx] }
}
// topo das páginas Soluções e A HS: 4:3 no computador; no celular a mesma foto aparece em
// 16:11 (o cover corta pouco). Cases e Contato não têm foto no topo.
for (const site of ['topo-solucoes', 'topo-sobre']) {
  const { buf, foco } = await daPaginaBuf(site, site, FOCO[site])
  await variantes(await proporcao(buf, 4 / 3, ...foco), site, [480, 640, 760, 960], { q: 70, avif: { quality: 40, effort: 8, chromaSubsampling: '4:2:0' } })
}
// as 3 soluções: a mesma foto no cartão da Home e no bloco da página Soluções, 4:3
// [nome no site, arquivo em WEB]
for (const [site, web] of [['sol-implantacao', 'publico-conselho'], ['sol-gestao', 'vistoria'], ['sol-sindico', 'conselho']]) {
  const { buf, foco } = await daPaginaBuf(site, web, FOCO[site])
  await variantes(await proporcao(buf, 4 / 3, ...foco), site, [400, 600, 800], { q: 72 })
}
if (reservas.length) console.log(`RECORTE PROVISÓRIO (faltam as fotos em Recursos Site/WEB): ${reservas.join(', ')}`)

// ---------------------------------------------------------------- case Sunset View: a foto real (opcional)
// Recursos Site/CASES/sunset-view.(jpg|png|webp). Sem ela, a página Cases fica sem a foto do
// condomínio (o briefing pede foto real; banco de imagem aqui seria mentira).
{
  let a = null
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) a = a || achar(`CASES/sunset-view.${ext}`, false)
  if (a) await variantes(await proporcao(await sharp(a).rotate().toBuffer(), 4 / 3, ...(FOCO['sunset-view'] || [0.5, 0.5])), 'sunset-view', [480, 760, 960], { q: 72 })
  else console.log('sem CASES/sunset-view: o case Sunset View fica sem a foto do condomínio')
}

writeFileSync(path.join(OUT, 'manifesto.json'), JSON.stringify(manifesto, null, 1))
const total = Object.values(manifesto).reduce((s, m) => s + m.kb, 0)
console.log(`${Object.keys(manifesto).length} arquivos em ${OUT} (${total} KB no total), manifesto.json gravado`)
for (const [n, m] of Object.entries(manifesto)) console.log(`  ${n.padEnd(34)} ${String(m.w).padStart(5)}x${String(m.h).padEnd(5)} ${m.kb} KB`)
const doMockup = provisorias.filter((n) => !n.startsWith('WEB/'))
const daWeb = provisorias.filter((n) => n.startsWith('WEB/')).map((n) => n.slice(4))
if (doMockup.length) console.log(`PROVISÓRIAS em uso (ampliadas do mockup): ${doMockup.join(', ')}`)
if (daWeb.length) console.log(`BANCO DE IMAGEM em uso (Recursos Site/WEB, até chegarem as fotos reais): ${daWeb.join(', ')}`)
console.log('favicons em src/raiz:', readdirSync('src/raiz').join(', '))

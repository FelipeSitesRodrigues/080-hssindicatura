/**
 * Teste de cliques e de layout do site, no Chrome da máquina (puppeteer-core).
 * Base do 079, adaptado à HS Sindicatura e às seis páginas (src/paginas.json).
 *
 * - Estouro horizontal e texto maior que a caixa: a Home em 15 larguras, de 320 a 1920, e
 *   as outras páginas em 9.
 * - Abertura: na Home a cortina some e o Danilo e o hexágono aparecem; nas outras, a cortina
 *   da foto do topo some e a foto certa pra tela carrega.
 * - Revelação no scroll em todas as páginas: rola na roda do mouse, como gente de verdade, e
 *   todo [data-revela] e [data-revela-lista] precisa ganhar .visivel (bug do 067). Na Home,
 *   o relatório termina com as barras cheias.
 * - Topo: fica opaco depois de rolar; o WhatsApp flutuante aparece no meio da página e some
 *   no fim (contato da Home, convite final das outras, rodapé).
 * - Menu do celular: abre, marca aria-expanded, põe o foco dentro, deixa o resto inerte,
 *   fecha no Esc (foco volta pro botão) e leva pra página certa, que fica acesa no menu.
 * - Âncoras: o índice do topo das páginas, o "Agendar diagnóstico" da Home e o endereço com
 *   # vindo de outra página param com a seção logo abaixo do header.
 * - Dúvidas: o botão abre e fecha a resposta (aria-expanded, inert e altura), também pelo
 *   teclado, nas três páginas que têm.
 * - Antes e depois: no computador os três comparadores lado a lado; a linha anda arrastando
 *   com o mouse e com o dedo, no clique e no teclado (range com aria-valuetext), e a etiqueta
 *   some quando a linha passa por ela. No celular e no tablet, abas (clique e setas) trocam o
 *   par, e os escondidos ficam inertes.
 * - Jardim renovado: as 18 fotos (9 e a cópia do loop) carregam quando a seção chega; a faixa
 *   anda sozinha, para no mouse e no botão, volta no botão; com "reduzir movimento" fica
 *   parada e rola de lado.
 * - Formulários: vazio mostra os erros e põe o foco no primeiro; preenchido abre o WhatsApp
 *   com todos os dados e mostra o sucesso. Na página Contato, "Solicitar proposta" troca o
 *   botão e a mensagem, e a mensagem opcional vai junto.
 * - Todo link de WhatsApp: número certo, nova aba e mensagem; os das soluções com o nome do
 *   serviço, os dos perfis e dos tipos de condomínio com a mensagem deles (regra da casa).
 * - Links entre páginas respondem 200. Imagens: nenhuma quebrada, todas com alt, nenhuma
 *   esticada. Um h1 por página. Console limpo.
 *
 * Uso: node scripts/serve.mjs  (noutro terminal)  e depois  node scripts/testar.mjs
 *      BASE_URL=http://localhost:3081 node scripts/testar.mjs
 */
import puppeteer from 'puppeteer-core'
import { existsSync, readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3080'
const ler = (arq) => JSON.parse(readFileSync(new URL(arq, import.meta.url), 'utf8'))
const cfg = ler('../site.config.json')
const solucoes = ler('../src/dados/solucoes.json').itens
const publicos = ler('../src/dados/publicos.json').itens
const tipos = ler('../src/dados/tipos.json').itens
const PAGINAS = ler('../src/paginas.json').itens
const NAVEGADOR = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p))

const falhas = []
const ok = (cond, msg) => (cond ? console.log('  ok', msg) : (falhas.push(msg), console.log('  FALHA', msg)))
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const tela = (w) => ({ width: w, height: w < 768 ? 844 : 900, isMobile: w < 768, hasTouch: w < 768 })

const browser = await puppeteer.launch({ executablePath: NAVEGADOR, headless: true, args: ['--no-first-run'] })
try {
  const page = await browser.newPage()
  const erros = []
  page.on('console', (m) => m.type() === 'error' && erros.push(`${m.text()} (${page.url()})`))
  page.on('pageerror', (e) => erros.push(`${e.message} (${page.url()})`))
  // ERR_ABORTED é o srcset/picture trocando de candidato quando a janela muda, não arquivo faltando
  page.on('requestfailed', (r) => !/wa\.me|instagram|google/.test(r.url()) && r.failure()?.errorText !== 'net::ERR_ABORTED' && erros.push(`falhou: ${r.url()} (${r.failure()?.errorText})`))
  page.on('response', (r) => r.status() >= 400 && erros.push(`${r.status()}: ${r.url()}`))
  const abrir = (rota) => page.goto(BASE + rota, { waitUntil: 'networkidle2' })
  const irPara = async (id) => {
    await page.evaluate((i) => {
      document.documentElement.classList.add('cv-pronto')
      document.documentElement.style.scrollBehavior = 'auto'
      document.getElementById(i).scrollIntoView({ behavior: 'instant' })
    }, id)
    await espera(700)
  }
  // a seção ficou logo abaixo do header (ou a página chegou no fim)
  const posicao = (id) => page.evaluate((a) => ({ top: Math.round(document.getElementById(a).getBoundingClientRect().top), y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight, header: document.getElementById('topo').offsetHeight }), id)
  // espera a rolagem suave parar (com a máquina carregada ela passa de 2 s); no máximo 7 s
  const pararDeRolar = async (id) => {
    let antes = null
    let iguais = 0
    for (let t = 0; t < 35 && iguais < 3; t++) {
      await espera(200)
      const agora = await page.evaluate((a) => Math.round(document.getElementById(a).getBoundingClientRect().top), id)
      iguais = agora === antes ? iguais + 1 : 0
      antes = agora
    }
  }
  const debaixoDoHeader = (r) => (r.top >= r.header - 2 && r.top <= r.header + 30) || (r.y >= r.max - 2 && r.top >= r.header - 2)

  console.log('\nLarguras (estouro horizontal e texto que passa da caixa)')
  for (const pag of PAGINAS) {
    const larguras = pag.rota === '/' ? [320, 360, 375, 390, 412, 430, 480, 768, 1024, 1280, 1366, 1440, 1536, 1600, 1920] : [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]
    for (const w of larguras) {
      await page.setViewport(tela(w))
      await abrir(pag.rota)
      const r = await page.evaluate(() => {
        document.documentElement.classList.add('cv-pronto')
        const W = document.documentElement.clientWidth
        const fora = [...document.body.querySelectorAll('*')]
          .filter((el) => {
            const q = el.getBoundingClientRect()
            if (!q.width || q.right <= W + 1) return false
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) return false
            return !el.closest('.pular')
          })
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`)
        // palavra que não cabe na caixa (memória do 079: o culpado se acha pelo scrollWidth)
        const faixa = document.createRange()
        const estouram = [...document.querySelectorAll('h1, h2, h3, h4, p, a, li, span, strong, button, label')]
          .filter((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === 'inline' || !el.clientWidth || el.closest('.relatorio__pilha, .sr-only')) return false
            const caixa = el.getBoundingClientRect()
            const esq = caixa.left + parseFloat(cs.paddingLeft) - 1
            const dir = caixa.right - parseFloat(cs.paddingRight) + 1
            return [...el.childNodes].some((n) => {
              if (n.nodeType !== 3 || !n.textContent.trim()) return false
              faixa.selectNodeContents(n)
              return [...faixa.getClientRects()].some((q) => q.width && (q.right > dir || q.left < esq))
            })
          })
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${el.textContent.trim().slice(0, 24)}"`)
        return { sw: document.documentElement.scrollWidth, iw: W, fora, estouram }
      })
      ok(r.sw <= r.iw && !r.fora.length, `${pag.id} ${w}px sem rolagem lateral (${r.sw}/${r.iw})${r.fora.length ? ' passam da borda: ' + r.fora.join(', ') : ''}`)
      if (r.estouram.length) ok(false, `${pag.id} ${w}px: texto maior que a caixa: ${r.estouram.join(', ')}`)
    }
  }

  console.log('\nAbertura (com animação)')
  for (const pag of PAGINAS) {
    for (const w of [1440, 390]) {
      await page.setViewport(tela(w))
      await abrir(pag.rota)
      await espera(2600)
      if (pag.rota === '/') {
        const h = await page.evaluate(() => {
          const op = (s) => Number(getComputedStyle(document.querySelector(s)).opacity)
          const foto = document.querySelector('.hero__foto img')
          return { cortina: op('.hero__cortina'), hex: op('.hero__hex-pic img'), titulo: op('.hero__titulo .hero__linha'), pilares: op('.pilares'), foto: foto.complete && foto.naturalWidth > 0, atual: foto.currentSrc.split('/').pop() }
        })
        ok(h.cortina === 0 && h.hex === 1 && h.titulo === 1 && h.pilares === 1, `home ${w}px: cortina some e hexágono, título e pilares ficam visíveis (cortina ${h.cortina}, hexágono ${h.hex})`)
        ok(h.foto && (w < 1024 ? /hero-cel/.test(h.atual) : /hero-desk/.test(h.atual)), `home ${w}px: foto do hero certa pra tela (${h.atual})`)
      } else {
        const h = await page.evaluate(() => {
          const op = (s) => (document.querySelector(s) ? Number(getComputedStyle(document.querySelector(s)).opacity) : 1)
          const foto = document.querySelector('.ptopo__foto img')
          return { cortina: document.querySelector('.ptopo__cortina') ? op('.ptopo__cortina') : 0, titulo: op('.ptopo__titulo'), botoes: op('.ptopo__botoes, .cto__form'), foto: foto ? foto.complete && foto.naturalWidth > 0 : null, atual: foto?.currentSrc.split('/').pop() }
        })
        ok(h.cortina === 0 && h.titulo === 1 && h.botoes === 1, `${pag.id} ${w}px: a cortina some e o título e os botões ficam visíveis`)
        if (h.foto !== null) ok(h.foto && /^topo-/.test(h.atual), `${pag.id} ${w}px: foto do topo carregada (${h.atual})`)
      }
    }
  }

  console.log('\nRevelação no scroll, topo e botão flutuante')
  for (const pag of PAGINAS) {
    for (const w of [1440, 390]) {
      await page.setViewport(tela(w))
      await abrir(pag.rota)
      const inicio = await page.evaluate(() => ({ rolado: document.getElementById('topo').classList.contains('topo--rolado'), zap: document.querySelector('.zap-flutuante').classList.contains('visivel') }))
      ok(!inicio.rolado && !inicio.zap, `${pag.id} ${w}px: no topo, header translúcido e sem o WhatsApp flutuante`)
      let viuZap = false
      for (let passo = 0; passo < 800; passo++) {
        await page.mouse.wheel({ deltaY: 140 })
        await espera(20)
        const r = await page.evaluate(() => ({ y: scrollY + innerHeight, h: document.documentElement.scrollHeight, zap: document.querySelector('.zap-flutuante').classList.contains('visivel') }))
        if (!viuZap) viuZap = r.zap
        if (r.y >= r.h - 2) break
      }
      await espera(2400)
      const presos = await page.evaluate(() => [...document.querySelectorAll('[data-revela]:not(.visivel), [data-revela-lista]:not(.visivel)')].filter((e) => e.checkVisibility()).map((e) => `${e.tagName.toLowerCase()}.${e.classList[0] || '?'}`))
      ok(presos.length === 0, `${pag.id} ${w}px: todo elemento animado aparece${presos.length ? ` (presos: ${presos.join(', ')})` : ''}`)
      const fim = await page.evaluate(() => ({ rolado: document.getElementById('topo').classList.contains('topo--rolado'), zap: document.querySelector('.zap-flutuante').classList.contains('visivel') }))
      ok(fim.rolado, `${pag.id} ${w}px: depois de rolar, header opaco`)
      ok(viuZap && !fim.zap, `${pag.id} ${w}px: WhatsApp flutuante aparece no meio da página e some no fim`)
      if (pag.rota === '/') {
        // fora da tela o content-visibility pausa a animação (volta quando a seção reaparece):
        // confere as barras com o relatório na tela
        await irPara('como-reportamos')
        await espera(2300)
        const rel = await page.evaluate(() => {
          const escala = (el) => new DOMMatrix(getComputedStyle(el).transform === 'none' ? '' : getComputedStyle(el).transform).d
          const barras = [...document.querySelectorAll('.grafico__r, .grafico__d')]
          return { barras: barras.length, cheias: barras.filter((b) => Math.abs(escala(b) - 1) < 0.01).length, visivel: document.querySelector('.provas__relatorio').classList.contains('visivel') }
        })
        ok(rel.visivel && rel.barras === 12 && rel.cheias === 12, `home ${w}px: relatório entra e as 12 barras terminam cheias (${rel.cheias}/${rel.barras})`)
      }
    }
  }

  console.log('\nMenu do celular')
  await page.setViewport(tela(390))
  await abrir('/')
  await page.click('.topo__menu')
  await espera(550)
  let e = await page.evaluate(() => {
    const b = document.querySelector('.topo__menu')
    const painel = document.getElementById(b.getAttribute('aria-controls'))
    return { aria: b.getAttribute('aria-expanded'), visivel: painel.checkVisibility({ visibilityProperty: true }), focoDentro: painel.contains(document.activeElement), inerte: document.querySelector('main').inert, alt: Math.round(painel.getBoundingClientRect().height), atual: document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href') }
  })
  ok(e.aria === 'true' && e.visivel && e.alt > 700, `abre em tela cheia e marca aria-expanded=true (painel ${e.alt}px)`)
  ok(e.focoDentro, 'foco vai pra dentro do menu')
  ok(e.inerte, 'o resto da página fica inerte enquanto o menu está aberto')
  ok(e.atual === '/', `na Home, "Home" fica aceso no menu (${e.atual})`)
  await page.keyboard.press('Escape')
  await espera(400)
  e = await page.evaluate(() => ({ aria: document.querySelector('.topo__menu').getAttribute('aria-expanded'), foco: document.activeElement?.matches('.topo__menu'), inerte: document.querySelector('main').inert }))
  ok(e.aria === 'false' && e.foco && !e.inerte, 'Esc fecha, devolve o foco pro botão e a página')
  for (const pag of PAGINAS.filter((p) => p.rota !== '/')) {
    await abrir('/')
    await page.click('.topo__menu')
    await espera(500)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.evaluate((r) => document.querySelector(`#menu a[href="${r}"]`).click(), pag.rota)])
    e = await page.evaluate(() => ({ rota: location.pathname, atual: document.querySelector('#menu a[aria-current="page"]')?.getAttribute('href'), h1: document.querySelector('h1')?.textContent.trim().slice(0, 40), aberto: document.getElementById('topo').classList.contains('topo--aberto') }))
    ok(e.rota === pag.rota && e.atual === pag.rota && !e.aberto, `menu leva a ${pag.rota}, que abre com "${pag.nome}" aceso (${e.h1})`)
  }

  console.log('\nÂncoras')
  for (const w of [1440, 390]) {
    await page.setViewport(tela(w))
    // o "Agendar diagnóstico" do hero da Home desce pro formulário
    await abrir('/')
    await page.evaluate(() => document.querySelector('.hero__cta').click())
    await pararDeRolar('contato')
    ok(debaixoDoHeader(await posicao('contato')), `home ${w}px: "Agendar diagnóstico" para no formulário, logo abaixo do header`)
    // o índice do topo das páginas
    for (const [rota, alvos] of [['/solucoes', solucoes.map((s) => s.id)], ['/para-condominios', ['residencial', 'misto', 'comercial', 'conselho']], ['/para-administradoras', ['integracao']]]) {
      for (const alvo of alvos) {
        await abrir(rota)
        await page.evaluate((a) => document.querySelector(`#inicio a[href="#${a}"]`).click(), alvo)
        await pararDeRolar(alvo)
        const r = await posicao(alvo)
        ok(debaixoDoHeader(r), `${rota} ${w}px: #${alvo} para logo abaixo do header (${r.top}px)`)
      }
    }
    // chegando de outra página com # no endereço (os links do rodapé)
    for (const destino of ['/solucoes#contratos', '/solucoes#conselho', '/para-condominios#comercial']) {
      await abrir(destino)
      await pararDeRolar(destino.split('#')[1])
      const r = await posicao(destino.split('#')[1])
      ok(debaixoDoHeader(r), `${w}px: ${destino} abre com a seção logo abaixo do header (${r.top}px)`)
    }
  }

  console.log('\nDúvidas (acordeão)')
  await page.setViewport(tela(1440))
  for (const rota of ['/', '/para-condominios', '/para-administradoras']) {
    await abrir(rota)
    await irPara('duvidas')
    const estado = (i) =>
      page.evaluate((i) => {
        const b = document.getElementById(`faq-b${i}`)
        const r = document.getElementById(`faq-r${i}`)
        return { aria: b.getAttribute('aria-expanded'), inerte: r.inert, alt: Math.round(r.getBoundingClientRect().height) }
      }, i)
    const s1 = await estado(1)
    let s2 = await estado(2)
    ok(s1.aria === 'true' && !s1.inerte && s1.alt > 40 && s2.aria === 'false' && s2.inerte && s2.alt === 0, `${rota}: a primeira começa aberta e as outras fechadas e inertes (${s1.alt}px / ${s2.alt}px)`)
    await page.click('#faq-b2')
    await espera(700)
    s2 = await estado(2)
    ok(s2.aria === 'true' && !s2.inerte && s2.alt > 40, `${rota}: clicar abre a segunda (${s2.alt}px)`)
    await page.focus('#faq-b2')
    await page.keyboard.press('Enter')
    await espera(700)
    s2 = await estado(2)
    ok(s2.aria === 'false' && s2.inerte && s2.alt === 0, `${rota}: Enter no teclado fecha de novo`)
  }

  console.log('\nAntes e depois (comparador)')
  const comparador = (sel) =>
    page.evaluate((s) => {
      const f = document.querySelector(s)
      const palco = f.querySelector('.ad__palco')
      const r = f.querySelector('.ad__range')
      return {
        pos: Math.round(Number(palco.style.getPropertyValue('--pos') || 50)),
        valor: Number(r.value),
        texto: r.getAttribute('aria-valuetext'),
        recorte: getComputedStyle(f.querySelector('.ad__img--depois')).clipPath,
        antesOculta: f.querySelector('.ad__etiqueta--antes').classList.contains('ad__etiqueta--oculta'),
        depoisOculta: f.querySelector('.ad__etiqueta--depois').classList.contains('ad__etiqueta--oculta'),
        visivel: f.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        inerte: f.inert,
      }
    }, sel)
  const caixa = (sel) => page.evaluate((s) => JSON.parse(JSON.stringify(document.querySelector(s).getBoundingClientRect())), sel)
  // computador: os três lado a lado, sem abas; arrastar, clicar e teclado
  await page.setViewport(tela(1440))
  await abrir('/')
  await irPara('antes-e-depois')
  e = await page.evaluate(() => ({ abas: document.querySelector('.ad__abas').checkVisibility(), visiveis: [...document.querySelectorAll('.ad__par')].filter((f) => f.checkVisibility({ visibilityProperty: true }) && !f.inert).length, fotos: [...document.querySelectorAll('.ad__img')].filter((i) => i.complete && i.naturalWidth).length }))
  ok(!e.abas && e.visiveis === 3, `1440px: os três comparadores lado a lado, sem abas (${e.visiveis} visíveis)`)
  let q = await caixa('#ad-palmeiras .ad__palco')
  await page.mouse.move(q.x + q.width / 2, q.y + q.height / 2)
  await page.mouse.down()
  for (let k = 1; k <= 8; k++) await page.mouse.move(q.x + q.width * (0.5 - 0.03 * k), q.y + q.height / 2)
  await page.mouse.up()
  await espera(250)
  let c = await comparador('#ad-palmeiras')
  ok(Math.abs(c.pos - 26) <= 2 && c.valor === c.pos && c.texto === `${c.pos}% antes, ${100 - c.pos}% depois` && /inset\(0px 0px 0px 2\d%\)/.test(c.recorte), `arrastar com o mouse leva a linha a ~26% e recorta a foto de depois (${c.pos}%, ${c.recorte})`)
  await page.mouse.click(q.x + q.width * 0.97, q.y + q.height * 0.7)
  await espera(600)
  c = await comparador('#ad-palmeiras')
  ok(c.pos >= 95 && c.depoisOculta && !c.antesOculta, `clicar perto da borda leva a linha até lá e a etiqueta "Depois" some (${c.pos}%)`)
  await page.focus('#ad-gradil .ad__range')
  await page.keyboard.press('ArrowRight')
  await espera(350)
  c = await comparador('#ad-gradil')
  ok(c.pos === 55, `teclado: seta pra direita anda 5% (${c.pos}%)`)
  await page.keyboard.press('Home')
  await espera(350)
  c = await comparador('#ad-gradil')
  ok(c.pos === 0 && c.antesOculta && c.texto === '0% antes, 100% depois', `teclado: Home leva a 0% e a etiqueta "Antes" some (${c.texto})`)
  // celular: abas e um palco só; toque arrastando de lado mexe a linha
  await page.setViewport(tela(390))
  await abrir('/')
  await irPara('antes-e-depois')
  e = await page.evaluate(() => ({ abas: document.querySelector('.ad__abas').checkVisibility(), n: document.querySelectorAll('.ad__aba').length, orientacao: document.querySelector('.ad__abas').getAttribute('aria-orientation') }))
  ok(e.abas && e.n === 3 && e.orientacao === 'horizontal', `390px: três abas visíveis (${e.orientacao})`)
  let v = await Promise.all(['#ad-palmeiras', '#ad-gradil', '#ad-escada'].map(comparador))
  ok(v[0].visivel && !v[0].inerte && !v[1].visivel && v[1].inerte && !v[2].visivel && v[2].inerte, '390px: só o primeiro par aparece; os outros ficam escondidos e inertes')
  await page.click('#ad-aba-gradil')
  await espera(700)
  v = await Promise.all(['#ad-palmeiras', '#ad-gradil'].map(comparador))
  e = await page.evaluate(() => document.getElementById('ad-aba-gradil').getAttribute('aria-selected'))
  ok(e === 'true' && v[1].visivel && !v[1].inerte && !v[0].visivel && v[0].inerte, 'tocar na aba "Gradil" troca o par')
  await page.focus('#ad-aba-gradil')
  await page.keyboard.press('ArrowRight')
  await espera(700)
  e = await page.evaluate(() => ({ foco: document.activeElement.id, sel: document.getElementById('ad-aba-escada').getAttribute('aria-selected'), ativo: document.getElementById('ad-escada').classList.contains('ad__par--ativo') }))
  ok(e.foco === 'ad-aba-escada' && e.sel === 'true' && e.ativo, `teclado nas abas: seta pra direita vai pra "Escada" (foco em #${e.foco})`)
  q = await caixa('#ad-escada .ad__palco')
  const meioY = q.y + q.height / 2
  await page.touchscreen.touchStart(q.x + q.width / 2, meioY)
  for (let k = 1; k <= 8; k++) await page.touchscreen.touchMove(q.x + q.width * (0.5 - 0.035 * k), meioY)
  await page.touchscreen.touchEnd()
  await espera(250)
  c = await comparador('#ad-escada')
  ok(c.pos <= 30 && c.pos >= 16, `arrastar com o dedo de lado mexe a linha (${c.pos}%)`)
  await page.setViewport(tela(800))
  await espera(300)
  e = await page.evaluate(() => ({ abas: document.querySelector('.ad__abas').checkVisibility(), orientacao: document.querySelector('.ad__abas').getAttribute('aria-orientation'), lado: document.querySelector('.ad__abas').getBoundingClientRect().right < document.querySelector('.ad__palcos').getBoundingClientRect().left }))
  ok(e.abas && e.orientacao === 'vertical' && e.lado, `800px: abas em coluna à esquerda do palco (${e.orientacao})`)

  console.log('\nJardim renovado (carrossel contínuo)')
  const faixaX = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.jardim__trilho')).transform).m41)
  await page.setViewport(tela(1440))
  await abrir('/')
  await irPara('jardim-renovado')
  await page.mouse.move(5, 5)
  await espera(1500)
  e = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.jardim__foto img')]
    const copia = document.querySelector('.jardim__lista[aria-hidden="true"]')
    return { total: imgs.length, carregadas: imgs.filter((i) => i.complete && i.naturalWidth).length, copiaSemAlt: [...copia.querySelectorAll('img')].every((i) => i.alt === ''), comAlt: [...document.querySelectorAll('.jardim__lista:not([aria-hidden]) img')].every((i) => i.alt.length > 20) }
  })
  ok(e.total === 18 && e.carregadas === 18, `as fotos (e a cópia do loop) carregam todas quando a seção chega (${e.carregadas}/${e.total})`)
  ok(e.copiaSemAlt && e.comAlt, 'a cópia do loop é só desenho (aria-hidden, alt vazio); as fotos de verdade têm alt')
  let x0 = await faixaX()
  await espera(1000)
  let x1 = await faixaX()
  ok(x1 < x0 - 15, `a faixa anda sozinha pra esquerda (${Math.round(x0)} -> ${Math.round(x1)} px em 1 s)`)
  q = await caixa('.jardim__faixa')
  await page.mouse.move(q.x + q.width / 2, q.y + q.height / 2)
  await espera(200)
  x0 = await faixaX()
  await espera(700)
  x1 = await faixaX()
  ok(Math.abs(x1 - x0) < 1, 'o mouse em cima para a faixa')
  await page.mouse.move(5, 5)
  await page.click('.jardim__pausa')
  await espera(200)
  x0 = await faixaX()
  await espera(700)
  x1 = await faixaX()
  e = await page.evaluate(() => ({ texto: document.querySelector('.jardim__pausa').textContent.trim(), rotulo: document.querySelector('.jardim__pausa').getAttribute('aria-label') }))
  ok(Math.abs(x1 - x0) < 1 && e.texto === 'Continuar' && /Continuar/.test(e.rotulo), `o botão pausa ("${e.texto}")`)
  await page.click('.jardim__pausa')
  await espera(900)
  ok((await faixaX()) < x1 - 10, 'e o mesmo botão volta a andar')
  // "reduzir movimento": parada, sem a cópia, rola de lado, sem o botão
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await abrir('/')
  await irPara('jardim-renovado')
  e = await page.evaluate(() => {
    const f = document.querySelector('.jardim__faixa')
    return { anim: getComputedStyle(document.querySelector('.jardim__trilho')).animationName, copia: getComputedStyle(document.querySelector('.jardim__lista[aria-hidden="true"]')).display, rola: f.scrollWidth > f.clientWidth && getComputedStyle(f).overflowX === 'auto', botao: document.querySelector('.jardim__pausa').checkVisibility() }
  })
  ok(e.anim === 'none' && e.copia === 'none' && e.rola && !e.botao, `com "reduzir movimento" a faixa para e rola de lado, sem a cópia e sem o botão (animação: ${e.anim})`)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])

  console.log('\nFormulários')
  for (const [rota, form] of [['/', '#form-diagnostico'], ['/contato', '#form-contato']]) {
    await abrir(rota)
    await page.evaluate(() => {
      window.__abriu = []
      window.open = (u) => (window.__abriu.push(u), { opener: 1 })
    })
    if (rota === '/') await irPara('contato')
    await page.click(`${form} .form__enviar`)
    await espera(300)
    e = await page.evaluate((f) => ({ invalidos: document.querySelectorAll(`${f} [aria-invalid="true"]`).length, foco: document.activeElement?.id, erro: document.getElementById('f-nome-erro').textContent, abriu: window.__abriu.length }), form)
    ok(e.invalidos === 7 && e.foco === 'f-nome' && e.erro && !e.abriu, `${rota} vazio: 7 campos com erro, foco no nome ("${e.erro}") e nada abre`)
    await page.type('#f-nome', 'Maria Teste')
    await page.type('#f-whatsapp', '11987654321')
    await page.type('#f-condominio', 'Edifício Aurora')
    await page.type('#f-cidade', 'São Paulo')
    await page.select('#f-tipo', 'Misto')
    await page.type('#f-unidades', '120')
    await page.click(`${form} .aceite`)
    if (rota === '/contato') {
      await page.type('#f-mensagem', 'Queremos trocar de síndico no fim do ano.')
      await page.click(`${form} .assunto:nth-of-type(2)`)
      const botao = await page.evaluate(() => document.querySelector('#form-contato .form__rotulo').textContent)
      ok(botao === 'Solicitar proposta', `${rota}: escolher "Solicitar proposta" troca o botão ("${botao}")`)
    }
    e = await page.evaluate((f) => ({ zap: document.getElementById('f-whatsapp').value, invalidos: document.querySelectorAll(`${f} [aria-invalid="true"]`).length }), form)
    ok(e.zap === '(11) 98765-4321' && e.invalidos === 0, `${rota}: máscara do WhatsApp (${e.zap}) e os erros somem ao corrigir`)
    await page.click(`${form} .form__enviar`)
    await espera(1000)
    e = await page.evaluate((f) => ({ abriu: window.__abriu, sucesso: !document.querySelector(`${f} .form__sucesso`).hidden }), form)
    const msg = e.abriu[0] ? decodeURIComponent(new URL(e.abriu[0]).searchParams.get('text') || '') : ''
    const dados = /Maria Teste/.test(msg) && /\(11\) 98765-4321/.test(msg) && /Edifício Aurora/.test(msg) && /Misto/.test(msg) && /\*Unidades:\* 120/.test(msg)
    const extra = rota === '/contato' ? /solicitar uma proposta/.test(msg) && /\*Mensagem:\* Queremos trocar/.test(msg) : /agendar um diagnóstico/.test(msg)
    ok(e.abriu.length === 1 && e.abriu[0].startsWith(`https://wa.me/${cfg.whatsapp}?text=`) && dados && extra, `${rota}: preenchido, abre o WhatsApp da HS com os dados${rota === '/contato' ? ', o pedido de proposta e a mensagem' : ''}`)
    ok(e.sucesso, `${rota}: mostra a mensagem de sucesso`)
  }
  // ?assunto=proposta já chega escolhido
  await abrir('/contato?assunto=proposta')
  e = await page.evaluate(() => ({ marcado: document.querySelector('#form-contato input[name="assunto"]:checked')?.value, botao: document.querySelector('#form-contato .form__rotulo').textContent }))
  ok(e.marcado === 'proposta' && e.botao === 'Solicitar proposta', `/contato?assunto=proposta já chega com a proposta escolhida (${e.marcado})`)

  console.log('\nLinks de WhatsApp')
  for (const pag of PAGINAS) {
    await abrir(pag.rota)
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => ({ href: a.href, origem: a.dataset.zap || '', servico: a.dataset.servico || '', alvo: a.target, texto: (a.getAttribute('aria-label') || a.textContent).replace(/\s+/g, ' ').trim() })),
    )
    const origens = links.map((l) => l.origem)
    ok(new Set(origens).size === origens.length && !origens.includes(''), `${pag.id}: todo link tem data-zap único${new Set(origens).size !== origens.length ? ': repetidos ' + origens.filter((o, i) => origens.indexOf(o) !== i).join(', ') : ''}`)
    if (pag.id === 'home' || pag.id === 'solucoes') ok(links.filter((l) => l.origem.startsWith('solucao-')).length === solucoes.length, `${pag.id}: ${solucoes.length} soluções com WhatsApp próprio`)
    if (pag.id === 'home') ok(links.filter((l) => l.origem.startsWith('publico-')).length === publicos.length, `home: ${publicos.length} perfis com WhatsApp próprio`)
    if (pag.id === 'condominios') ok(links.filter((l) => l.origem.startsWith('tipo-')).length === tipos.length, `condominios: ${tipos.length} tipos de condomínio com WhatsApp próprio`)
    let ruins = 0
    for (const l of links) {
      const u = new URL(l.href)
      const numero = u.pathname.replace(/\//g, '')
      const m = u.searchParams.get('text') || ''
      const s = solucoes.find((x) => x.nome === l.servico)
      const p = publicos.find((x) => x.nome === l.servico)
      const t = tipos.find((x) => x.nome === l.servico)
      const proprio = !l.servico || (s && m.includes(`*${s.mensagem}*`)) || (p && m === p.mensagem) || (t && m === t.mensagem)
      if (!(numero === cfg.whatsapp && l.alvo === '_blank' && m && proprio)) {
        ruins++
        ok(false, `${pag.id} ${l.origem} "${l.texto.slice(0, 28)}" -> ${m.slice(0, 70)}`)
      }
    }
    ok(ruins === 0, `${pag.id}: ${links.length} links de WhatsApp com o número certo, nova aba e a mensagem certa`)
  }

  console.log('\nLinks entre páginas, âncoras, h1 e imagens')
  const internos = new Set()
  for (const pag of PAGINAS) {
    await page.setViewport(tela(1440))
    await abrir(pag.rota)
    // a imagem adiada (o hexágono do hero) só ganha src depois do LCP e do carregamento
    await page.waitForFunction(() => [...document.querySelectorAll('picture[data-adiada]')].every((p) => p.classList.contains('adiada--pronta')), { timeout: 6000 }).catch(() => ok(false, `${pag.id}: a imagem adiada não carregou`))
    await page.evaluate(async () => {
      document.documentElement.classList.add('cv-pronto')
      const imgs = [...document.images]
      imgs.forEach((i) => (i.loading = 'eager'))
      await Promise.race([Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r })))), new Promise((r) => setTimeout(r, 8000))])
    })
    ;(await page.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]))).forEach((h) => internos.add(h))
    const ancoras = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')))].filter((h) => h.length > 1).map((h) => [h, !!document.querySelector(h)]))
    const semDestino = ancoras.filter(([, existe]) => !existe).map(([h]) => h)
    ok(!semDestino.length, `${pag.id}: ${ancoras.length} âncoras com destino${semDestino.length ? ' (sem: ' + semDestino.join(', ') + ')' : ''}`)
    const estrutura = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      semAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      quebradas: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-40)),
      esticadas: [...document.images]
        .filter((i) => i.naturalWidth > 1 && i.getBoundingClientRect().width > 0 && !['cover', 'contain'].includes(getComputedStyle(i).objectFit))
        .map((i) => ({ src: i.currentSrc.split('/').pop(), dif: Math.abs(i.offsetWidth / i.offsetHeight - i.naturalWidth / i.naturalHeight) / (i.naturalWidth / i.naturalHeight) }))
        .filter((x) => x.dif > 0.03)
        .map((x) => `${x.src} (${(x.dif * 100).toFixed(0)}%)`),
    }))
    ok(estrutura.h1 === 1, `${pag.id}: um h1 só (${estrutura.h1})`)
    ok(estrutura.semAlt === 0 && estrutura.quebradas.length === 0 && estrutura.esticadas.length === 0, `${pag.id}: imagens com alt, nenhuma quebrada, nenhuma esticada${estrutura.quebradas.length ? ' (quebradas: ' + estrutura.quebradas.join(', ') + ')' : ''}${estrutura.esticadas.length ? ' (esticadas: ' + estrutura.esticadas.join(', ') + ')' : ''}`)
  }
  for (const h of [...internos].filter((x) => !x.startsWith('/assets/'))) {
    const r = await fetch(BASE + h)
    ok(r.status === 200, `${h} responde ${r.status}`)
  }

  console.log('\nConsole')
  ok(erros.length === 0, `sem erros no console${erros.length ? ': ' + [...new Set(erros)].slice(0, 5).join(' | ') : ''}`)
} finally {
  await browser.close()
}
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo.')
process.exitCode = falhas.length ? 1 : 0

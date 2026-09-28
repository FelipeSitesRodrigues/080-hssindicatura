/**
 * Build do site da HS Sindicatura. HTML, CSS e JS estático em dist/ (base do 079).
 * Seis páginas: Home, Soluções, Para Condomínios, Para Administradoras, Sobre e Contato.
 *
 *   node build.mjs                          todas as páginas em dist/ (index.html, solucoes.html...)
 *   node build.mjs --preview 03-solucoes    só aquela seção, em dist/preview/03-solucoes.html
 *   node build.mjs --preview 00-header,01-hero
 *   node build.mjs --publicar               tudo do zero, sem os previews (antes de subir)
 *
 * Como funciona:
 * - src/paginas.json lista as páginas: arquivo, rota, título, descrição, textos de
 *   compartilhamento e as seções (parciais) de cada uma, na ordem. A Vercel serve
 *   solucoes.html em /solucoes (cleanUrls no vercel.json).
 * - src/molde.html é o esqueleto comum: head, header, rodapé e WhatsApp flutuante.
 *   <!-- @parcial NOME --> puxa src/partials/NOME.html. Parcial pode puxar parcial e pode
 *   receber parâmetros (<!-- @parcial x-cta titulo="..." -->, lidos lá dentro como {{p.titulo}}).
 *   {{pag.campo}} puxa um campo da página; {{inicio}} é o link do logo (na Home, o topo).
 * - CSS: src/css/_*.css (base e fontes), depois o arquivo de cada parcial usado na página
 *   (mesmo nome) e os que o parcial pede com <!-- @usa nome, nome -->, em ordem de nome, e
 *   99-*.css por último. Entra minificado num <style>: cada página leva só o que usa.
 * - JS: mesma regra, em src/js, num <script> no fim do <body>. Cada arquivo é um IIFE.
 * - Dados em src/dados/*.json viram HTML no build (sai tudo no HTML, pro Google ler):
 *   <!-- @solucoes --> os 6 cartões da Home, cada um com o WhatsApp do próprio serviço;
 *   <!-- @solucoes-detalhe --> as 6 frentes da página Soluções (o que é, o que resolve, como
 *   funciona e entregáveis); <!-- @solucoes-rodape --> a lista do rodapé; <!-- @publicos -->
 *   os 4 perfis da Home; <!-- @tipos --> residencial, misto e comercial; <!-- @faq --> e
 *   <!-- @faq nome --> o acordeão (faq.json ou faq-nome.json, e o FAQPage do schema);
 *   <!-- @antes-depois --> os 3 comparadores e as abas; <!-- @jardim --> a faixa de fotos.
 * - {{wa:chave}} vira o link do WhatsApp com a mensagem mensagens.chave do config (todo link
 *   de WhatsApp abre em outra aba). {{cfg.caminho}} puxa qualquer valor do config; {{ano}}
 *   é o ano atual.
 * - <i data-i="nome" data-w="light" class="..."></i> vira <svg><use> apontando pro
 *   sprite de ícones (Phosphor), montado em cada página só com os ícones dela.
 * - <img data-img="nome" sizes="..." alt="..."> vira <picture> com AVIF e WebP em
 *   srcset, width e height, a partir de src/assets/img/manifesto.json.
 *   data-img-max="640" limita o src de reserva. Direção de arte: data-desk="nome"
 *   (+ data-desk-sizes e data-desk-media, padrão (min-width: 64em)) põe outra imagem
 *   a partir daquela largura de tela. data-preload: é o LCP da página, e o pedido sai no
 *   topo do <head> com a mesma lista e o mesmo sizes (o navegador não baixa dois arquivos).
 *   data-adiar: decorativa, só baixa depois do LCP (_base.js).
 * - <!-- @schema --> recebe o JSON-LD da página (serviço local, página, migalhas, e o
 *   fundador e as dúvidas onde aparecem).
 * - Avisa: travessão no texto, img sem alt/width/height, id repetido, âncora sem
 *   destino (também as de outra página), link pra página que não existe, marcador {{...}}
 *   que sobrou, CSS com chave desbalanceada, mais de um h1 e o que falta o cliente confirmar.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, copyFileSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const P = (...a) => path.join(RAIZ, ...a)
const DIST = P('dist')
const cfg = JSON.parse(readFileSync(P('site.config.json'), 'utf8'))
const ler = (arq) => JSON.parse(readFileSync(arq, 'utf8')).itens
const dados = (nome) => ler(P('src/dados', `${nome}.json`))
const solucoes = dados('solucoes')
const publicos = dados('publicos')
const tipos = dados('tipos')
const antesDepois = dados('antes-depois')
const jardim = dados('jardim')
const paginas = ler(P('src/paginas.json'))
const manifesto = existsSync(P('src/assets/img/manifesto.json')) ? JSON.parse(readFileSync(P('src/assets/img/manifesto.json'), 'utf8')) : {}
const avisos = []
const BASE = (cfg.dominio || '').replace(/\/$/, '')

const argPreview = (() => {
  const i = process.argv.indexOf('--preview')
  return i > -1 ? process.argv[i + 1].split(',').map((s) => s.trim()) : null
})()

// ---------------------------------------------------------------- utilidades
function gravar(arq, conteudo) {
  mkdirSync(path.dirname(arq), { recursive: true })
  const tmp = `${arq}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  writeFileSync(tmp, conteudo)
  for (let t = 0; t < 20; t++) {
    try {
      renameSync(tmp, arq)
      return
    } catch (e) {
      if (t === 19) throw e
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
    }
  }
}

function copiarPasta(de, para) {
  if (!existsSync(de)) return
  mkdirSync(para, { recursive: true })
  for (const nome of readdirSync(de)) {
    if (nome.startsWith('.') || nome === 'manifesto.json') continue
    const a = path.join(de, nome)
    const b = path.join(para, nome)
    const st = statSync(a)
    if (st.isDirectory()) copiarPasta(a, b)
    else if (!existsSync(b) || statSync(b).size !== st.size || statSync(b).mtimeMs < st.mtimeMs) {
      try {
        copyFileSync(a, b)
      } catch {
        /* outro processo copiando o mesmo arquivo: ignora */
      }
    }
  }
}

function lerParcial(nome) {
  const arq = P('src/partials', `${nome}.html`)
  if (!existsSync(arq)) {
    avisos.push(`parcial ausente: ${nome}`)
    return `<!-- parcial ${nome} ainda não existe -->`
  }
  return readFileSync(arq, 'utf8')
}

// os arquivos de CSS ou JS de uma página: base (_*), os dos parciais e dependências dela, e 99-* no fim
function arquivos(pasta, ext, nomes) {
  if (!existsSync(P(pasta))) return []
  const todos = readdirSync(P(pasta)).filter((f) => f.endsWith(ext))
  const nome = (f) => f.slice(0, -ext.length)
  const base = todos.filter((f) => f.startsWith('_')).sort()
  const fim = todos.filter((f) => f.startsWith('99-')).sort()
  const meio = todos.filter((f) => !f.startsWith('_') && !f.startsWith('99-') && nomes.has(nome(f))).sort()
  return [...base, ...meio, ...fim]
}

function juntar(pasta, ext, nomes) {
  return arquivos(pasta, ext, nomes)
    .map((f) => {
      const c = readFileSync(P(pasta, f), 'utf8')
      if (ext === '.css') {
        const abre = (c.match(/{/g) || []).length
        const fecha = (c.match(/}/g) || []).length
        if (abre !== fecha) avisos.push(`CSS com chaves desbalanceadas: ${f} (${abre} abre, ${fecha} fecha)`)
      }
      return c
    })
    .join(ext === '.js' ? '\n;\n' : '\n')
}

// Minificação conservadora: só comentário e espaço redundante. Não mexe em espaço
// perto de ":" ou ">", que muda o sentido de seletor (".a :is(.b)").
function minCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .replace(/,\s+/g, ',')
    .replace(/;}/g, '}')
    .trim()
}

function minJs(js) {
  // só tira comentário de linha inteira e linhas em branco; o JS é pequeno
  return js
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .join('\n')
}

function valor(caminho, avisar = true) {
  const v = caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), cfg)
  if (v === undefined && avisar) avisos.push(`config sem o caminho: ${caminho}`)
  return v ?? ''
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const wa = (msg) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`
function linkWa(chave) {
  const msg = cfg.mensagens[chave]
  if (!msg) avisos.push(`mensagem de WhatsApp sem chave no config: ${chave}`)
  return wa(msg || '')
}
// mensagem de proposta de um serviço (regra da casa: cada serviço com a sua)
const waServico = (s) => wa(cfg.mensagens.servico.replace('{servico}', s.mensagem))
const url = (rota) => `${BASE}${rota}`

// ---------------------------------------------------------------- ícones (sprite com <use>, um por página)
let usados = new Map()
function icone(nome, peso = 'light', classe = '') {
  const id = `i-${nome}-${peso}`
  if (!usados.has(id)) {
    const arq = P('node_modules/@phosphor-icons/core/assets', peso, `${nome}${peso === 'regular' ? '' : '-' + peso}.svg`)
    if (!existsSync(arq)) {
      avisos.push(`ícone não existe: ${nome} (${peso})`)
      return ''
    }
    const miolo = readFileSync(arq, 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim()
    usados.set(id, `<symbol id="${id}" viewBox="0 0 256 256">${miolo}</symbol>`)
  }
  const cls = ['i', classe].filter(Boolean).join(' ')
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`
}

// ---------------------------------------------------------------- imagens (<picture> com AVIF e WebP)
function versoes(nome, ext) {
  return Object.entries(manifesto)
    .map(([arq, m]) => ({ arq, m, w: Number((arq.match(new RegExp(`^${nome}-(\\d+)\\.${ext}$`)) || [])[1]) }))
    .filter((v) => v.w)
    .sort((a, b) => a.w - b.w)
}
const srcset = (vs) => vs.map((v) => `/assets/img/${v.arq} ${v.m.w}w`).join(', ')
const attr = (s, nome) => (s.match(new RegExp(`\\s${nome}="([^"]*)"`)) || [])[1]
const semAttr = (s, ...nomes) => nomes.reduce((t, n) => t.replace(new RegExp(`\\s${n}="[^"]*"`, 'g'), ''), s)

function fontesDe(nome, sizes, media = '') {
  const va = versoes(nome, 'avif')
  const vw = versoes(nome, 'webp')
  if (!vw.length) avisos.push(`imagem sem arquivo no manifesto: ${nome}`)
  const maior = vw[vw.length - 1]?.m || { w: 1, h: 1 }
  const mq = media ? ` media="${media}"` : ''
  return [
    va.length ? `<source${mq} type="image/avif" srcset="${srcset(va)}" sizes="${sizes}" width="${maior.w}" height="${maior.h}">` : '',
    `<source${mq} type="image/webp" srcset="${srcset(vw)}" sizes="${sizes}" width="${maior.w}" height="${maior.h}">`,
  ].join('')
}

function imagens(html, preloads) {
  return html.replace(/<img\b([^>]*?)\sdata-img="([\w-]+)"([^>]*)>/g, (tag, antes, nome, depois) => {
    let attrs = antes + depois
    const sizes = attr(attrs, 'sizes') || '100vw'
    const desk = attr(attrs, 'data-desk')
    const deskSizes = attr(attrs, 'data-desk-sizes') || sizes
    const deskMedia = attr(attrs, 'data-desk-media') || '(min-width: 64em)'
    const max = Number(attr(attrs, 'data-img-max') || Infinity)
    const classePicture = attr(attrs, 'data-picture')
    const lcp = /\sdata-preload(?=[\s/]|$)/.test(attrs)
    attrs = semAttr(attrs, 'data-desk', 'data-desk-sizes', 'data-desk-media', 'data-img-max', 'data-picture', 'sizes').replace(/\sdata-preload(?=[\s/]|$)/, '')
    const fontes = desk ? [fontesDe(desk, deskSizes, deskMedia)] : []
    const vw = versoes(nome, 'webp')
    const va = versoes(nome, 'avif')
    if (!vw.length) {
      avisos.push(`data-img sem arquivo no manifesto: ${nome}`)
      return tag
    }
    if (lcp) preloads.push({ nome, sizes, desk, deskSizes, deskMedia })
    const principal = [...vw].reverse().find((v) => v.w <= max) || vw[0]
    if (va.length) fontes.push(`<source type="image/avif" srcset="${srcset(va)}" sizes="${sizes}">`)
    const img = `<img src="/assets/img/${principal.arq}" srcset="${srcset(vw)}" sizes="${sizes}" width="${principal.m.w}" height="${principal.m.h}"${attrs}>`
    return `<picture${classePicture ? ` class="${classePicture}"` : ''}>${fontes.join('')}${img}</picture>`
  })
}

// A imagem do LCP de cada página (data-preload): o pedido sai no topo do <head>, antes dos
// ~60 KB de CSS embutido. Mesma lista e mesmo sizes da <picture>, pro navegador escolher o
// mesmo arquivo (e não baixar dois). Com direção de arte, um preload por faixa de tela.
function linksPreload(lista) {
  const inversa = (m) => {
    const x = /\(min-width:\s*([\d.]+)em\)/.exec(m)
    return x ? `(max-width: ${(Number(x[1]) - 0.01).toFixed(2)}em)` : ''
  }
  const link = (nome, sizes, media) => {
    const va = versoes(nome, 'avif')
    return va.length ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset(va)}" imagesizes="${sizes}"${media ? ` media="${media}"` : ''} fetchpriority="high">` : ''
  }
  return lista
    .flatMap((p) => (p.desk ? [link(p.nome, p.sizes, inversa(p.deskMedia)), link(p.desk, p.deskSizes, p.deskMedia)] : [link(p.nome, p.sizes, '')]))
    .filter(Boolean)
    .join('\n  ')
}

// ---------------------------------------------------------------- soluções (src/dados/solucoes.json)
// Home: cada cartão tem o botão "Solicitar proposta" com o WhatsApp daquele serviço (regra da casa).
const cardSolucao = (s, i) => `
          <li class="sol" style="--i:${i}">
            <span class="sol__icone">${icone(s.icone, 'light')}</span>
            <div class="sol__corpo">
              <h3 class="sol__nome">${esc(s.nome)}</h3>
              <p class="sol__desc">${esc(s.descricao)}</p>
              <a class="btn btn--contorno-dourado btn--p sol__zap" href="${esc(waServico(s))}" target="_blank" rel="noopener" data-zap="solucao-${s.id}" data-servico="${esc(s.nome)}" aria-label="Solicitar proposta de ${esc(s.nome.toLowerCase())} pelo WhatsApp">Solicitar proposta${icone('arrow-right', 'regular', 'i--anda')}</a>
            </div>
          </li>`
const htmlSolucoes = () => `<ul class="sols" role="list" data-revela-lista>${solucoes.map(cardSolucao).join('')}
        </ul>`
const htmlSolucoesRodape = () => solucoes.map((s) => `<li><a href="/solucoes#${s.id}">${esc(s.rodape || s.nome)}</a></li>`).join('\n              ')

// Página Soluções: uma seção por frente, alternando claro e escuro. À esquerda o número, o
// nome, o que é e os botões (o WhatsApp do serviço e o diagnóstico); à direita o painel com o
// que resolve, como funciona e a folha dos entregáveis.
const blocoServico = (s, i) => {
  const clara = i % 2 === 0
  const n = String(i + 1).padStart(2, '0')
  const lista = (itens, classe, ic) => itens.map((t, k) => `<li class="${classe}" style="--i:${k}">${ic ? icone(ic, 'light', `${classe}-i`) : `<span class="hex ${classe}-n" aria-hidden="true">${k + 1}</span>`}<span>${esc(t)}</span></li>`).join('')
  return `
    <section class="secao ${clara ? 'secao--clara' : 'secao--escura'} servico" id="${s.id}" aria-labelledby="servico-${s.id}">
      <div class="container servico__grade">
        <div class="servico__intro" data-revela>
          <p class="servico__num"><span class="servico__n">${n}</span><span class="servico__de">de 06</span></p>
          <div class="servico__cab">
            <span class="${clara ? 'icone-bola' : 'icone-caixa'} servico__icone">${icone(s.icone, 'light')}</span>
            <h2 class="titulo servico__nome" id="servico-${s.id}">${esc(s.nome)}</h2>
          </div>
          <p class="servico__oque"><strong>O que é.</strong> ${esc(s.oQueE)}</p>
          <div class="servico__botoes">
            <a class="btn btn--dourado" href="${esc(waServico(s))}" target="_blank" rel="noopener" data-zap="solucao-${s.id}" data-servico="${esc(s.nome)}" aria-label="Solicitar proposta de ${esc(s.nome.toLowerCase())} pelo WhatsApp">Solicitar proposta${icone('arrow-right', 'regular', 'i--anda')}</a>
            <a class="btn ${clara ? 'btn--contorno-petroleo' : 'btn--contorno'}" href="/contato">Agendar diagnóstico</a>
          </div>
        </div>
        <div class="servico__painel" data-revela-lista>
          <div class="servico__bloco" style="--i:0">
            <h3 class="servico__sub">${icone('warning-circle', 'light')}O que resolve</h3>
            <ul class="servico__lista" role="list">${lista(s.resolve, 'servico__item', 'x-circle')}</ul>
          </div>
          <div class="servico__bloco" style="--i:1">
            <h3 class="servico__sub">${icone('path', 'light')}Como funciona</h3>
            <ol class="servico__lista" role="list">${lista(s.comoFunciona, 'servico__passo', null)}</ol>
          </div>
          <div class="servico__bloco folha" style="--i:2">
            <div class="folha__topo">
              <img data-img="logo-hs" data-img-max="96" sizes="28px" alt="" loading="lazy" decoding="async" class="folha__logo">
              <h3 class="folha__titulo">Entregáveis</h3>
              <span class="folha__tag">o que o conselho recebe</span>
            </div>
            <ul class="folha__lista" role="list">${s.entregaveis.map((t, k) => `<li style="--i:${k}">${icone('check-square', 'light', 'folha__i')}<span>${esc(t)}</span></li>`).join('')}</ul>
          </div>
        </div>
      </div>
    </section>`
}
const htmlSolucoesDetalhe = () => solucoes.map(blocoServico).join('\n')

// índice das frentes no topo da página Soluções (âncoras)
const htmlIndiceSolucoes = () =>
  solucoes.map((s, i) => `<li><a href="#${s.id}"><span class="indice__n">${String(i + 1).padStart(2, '0')}</span><span>${esc(s.curto || s.rodape || s.nome)}</span></a></li>`).join('\n            ')

// ---------------------------------------------------------------- públicos (src/dados/publicos.json)
// Quatro perfis, cada um com a foto, o texto e o botão com a frase dele ("Sou do conselho").
// O botão abre o WhatsApp com a mensagem daquele perfil.
const cardPublico = (p, i) => `
          <li class="pub" id="${p.ancora || `publico-${p.id}`}" style="--i:${i}">
            <span class="pub__foto"><img data-img="publico-${p.id}" data-img-max="640" sizes="(min-width: 80em) 285px, (min-width: 64em) 22vw, (min-width: 40em) 45vw, 92vw" alt="${esc(p.alt)}" loading="lazy" decoding="async"></span>
            <div class="pub__corpo">
              <h3 class="pub__nome">${esc(p.nome)}</h3>
              <p class="pub__desc">${esc(p.descricao)}</p>
              <a class="btn btn--dourado btn--p pub__cta" href="${esc(wa(p.mensagem))}" target="_blank" rel="noopener" data-zap="publico-${p.id}" data-servico="${esc(p.nome)}"><span>${esc(p.cta)}</span>${icone('arrow-right', 'regular', 'i--anda')}</a>
            </div>
          </li>`
const htmlPublicos = () => `<ul class="pubs" role="list" data-revela-lista>${publicos.map(cardPublico).join('')}
        </ul>`

// ---------------------------------------------------------------- tipos de condomínio (src/dados/tipos.json)
// Página Para Condomínios: residencial, misto e comercial, cada um com a foto, as dores
// específicas, como a HS atua e o "Solicitar proposta" com a mensagem daquele tipo.
const blocoTipo = (t, i) => {
  const clara = i % 2 === 0
  return `
    <section class="secao ${clara ? 'secao--clara' : 'secao--escura'} tipo${i % 2 ? ' tipo--inverso' : ''}" id="${t.id}" aria-labelledby="tipo-${t.id}">
      <div class="container tipo__grade">
        <div class="tipo__cab" data-revela>
          <p class="rotulo">${esc(t.rotulo)}</p>
          <h2 class="titulo" id="tipo-${t.id}">${esc(t.titulo)} <span class="destaque">${esc(t.destaque)}</span></h2>
        </div>
        <figure class="tipo__foto" data-revela="${i % 2 ? 'direita' : 'esquerda'}">
          <span class="tipo__moldura" aria-hidden="true"></span>
          <img data-img="tipo-${t.id}-cel" data-desk="tipo-${t.id}" data-desk-sizes="(min-width: 80em) 460px, 36vw" data-img-max="640" sizes="(min-width: 40em) 620px, calc(100vw - 54px)" alt="${esc(t.alt)}" loading="lazy" decoding="async">
        </figure>
        <div class="tipo__corpo">
          <p class="apoio tipo__intro" data-revela>${esc(t.intro)}</p>
          <div class="tipo__colunas" data-revela-lista>
            <div class="tipo__col" style="--i:0">
              <h3 class="tipo__sub">${icone('warning-circle', 'light')}Dores mais comuns</h3>
              <ul class="tipo__lista" role="list">${t.dores.map((d) => `<li>${icone('x-circle', 'light', 'tipo__i tipo__i--dor')}<span>${esc(d)}</span></li>`).join('')}</ul>
            </div>
            <div class="tipo__col" style="--i:1">
              <h3 class="tipo__sub">${icone('seal-check', 'light')}Como a HS atua</h3>
              <ul class="tipo__lista" role="list">${t.atuacao.map((d) => `<li>${icone('check-circle', 'light', 'tipo__i')}<span>${esc(d)}</span></li>`).join('')}</ul>
            </div>
          </div>
          <a class="btn btn--dourado tipo__cta" href="${esc(wa(t.mensagem))}" target="_blank" rel="noopener" data-zap="tipo-${t.id}" data-servico="${esc(t.nome)}" data-revela>${esc(t.cta)}${icone('arrow-right', 'regular', 'i--anda')}</a>
        </div>
      </div>
    </section>`
}
const htmlTipos = () => tipos.map(blocoTipo).join('\n')

// ---------------------------------------------------------------- antes e depois (src/dados/antes-depois.json)
// Três comparadores de arrastar (base do 069). No computador, lado a lado; no celular e no
// tablet, as abas e um palco só (quem liga as abas é o JS; sem ele, os três aparecem). O range
// invisível dá o teclado e o leitor de tela; a linha e o botão são só desenho. O par é uma div
// com o figure dentro: nas abas ela vira tabpanel, papel que o figure não aceita.
const TAM_AD = '(min-width: 80em) 384px, (min-width: 64em) calc(29.7vw - 16px), (min-width: 40em) calc(49.6vw - 18px), calc(100vw - 40px)'
const htmlAntesDepois = () => {
  const abas = antesDepois
    .map(
      (p, i) => `
          <button class="ad__aba" type="button" role="tab" id="ad-aba-${p.id}" aria-controls="ad-${p.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}><span class="ad__aba-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="ad__aba-nome">${esc(p.aba)}</span></button>`,
    )
    .join('')
  const pares = antesDepois
    .map(
      (p, i) => `
          <div class="ad__par${i === 0 ? ' ad__par--ativo' : ''}" id="ad-${p.id}" data-nome="${esc(p.nome)}" style="--i:${i}">
            <figure class="ad__figura">
            <div class="ad__palco">
              <img class="ad__img" data-img="ad-${p.id}-antes" sizes="${TAM_AD}" alt="${esc(p.altAntes)}" loading="lazy" decoding="async" draggable="false">
              <img class="ad__img ad__img--depois" data-img="ad-${p.id}-depois" sizes="${TAM_AD}" alt="${esc(p.altDepois)}" loading="lazy" decoding="async" draggable="false">
              <input class="ad__range" type="range" min="0" max="100" step="1" value="50" aria-label="Comparar antes e depois: ${esc(p.nome)}" aria-valuetext="50% antes, 50% depois">
              <span class="ad__etiqueta ad__etiqueta--antes" aria-hidden="true">Antes</span>
              <span class="ad__etiqueta ad__etiqueta--depois" aria-hidden="true">Depois</span>
              <span class="ad__cursor" aria-hidden="true"><span class="ad__linha"></span><span class="ad__botao">${icone('caret-left', 'bold')}${icone('caret-right', 'bold')}</span></span>
            </div>
            <figcaption class="ad__legenda"><strong class="ad__legenda-nome">${esc(p.nome)}</strong> <span class="ad__legenda-linha">${esc(p.linha)}</span></figcaption>
            </figure>
          </div>`,
    )
    .join('')
  return `<div class="ad__abas" role="tablist" aria-label="Canteiros do antes e depois">${abas}
        </div>
        <div class="ad__palcos" data-revela-lista>${pares}
        </div>`
}

// ---------------------------------------------------------------- jardim renovado (src/dados/jardim.json)
// Carrossel contínuo: a lista duas vezes seguidas, e a faixa anda o comprimento de uma lista
// em loop. A segunda cópia é só desenho (aria-hidden, alt vazio). A altura da faixa é
// clamp(280px, 24vw + 40px, 420px): daí os sizes.
const TAM_JARDIM = {
  'em-pe': '(min-width: 99em) 315px, (min-width: 62.5em) calc(18vw + 30px), 210px',
  deitada: '(min-width: 99em) 560px, (min-width: 62.5em) calc(32vw + 53px), 374px',
}
const fotoJardim = (copia) => (f) =>
  `<li class="jardim__foto jardim__foto--${f.formato}"><img data-img="${f.id}" sizes="${TAM_JARDIM[f.formato]}" alt="${copia ? '' : esc(f.alt)}" loading="lazy" decoding="async"></li>`
const htmlJardim = () =>
  [false, true].map((copia) => `<ul class="jardim__lista" role="list"${copia ? ' aria-hidden="true"' : ''}>${jardim.map(fotoJardim(copia)).join('')}</ul>`).join('\n          ')

// ---------------------------------------------------------------- dúvidas (src/dados/faq*.json)
// Botão de verdade com aria-expanded e aria-controls; a resposta abre pela grade (0fr -> 1fr),
// sem medir altura em JS. A primeira começa aberta, como no mockup. Sem JS, todas abertas
// (o inert das fechadas é o JS que põe).
function htmlFaq(itens) {
  return itens
    .map(
      (q, i) => `
            <div class="faq__item${i === 0 ? ' faq__item--aberto' : ''}">
              <h3 class="faq__pergunta">
                <button class="faq__botao" type="button" id="faq-b${i + 1}" aria-expanded="${i === 0}" aria-controls="faq-r${i + 1}"><span>${esc(q.pergunta)}</span><span class="faq__mais" aria-hidden="true"></span></button>
              </h3>
              <div class="faq__resposta" id="faq-r${i + 1}" role="region" aria-labelledby="faq-b${i + 1}">
                <div class="faq__miolo"><p>${esc(q.resposta)}</p></div>
              </div>
            </div>`,
    )
    .join('')
}

// ---------------------------------------------------------------- dados estruturados (GEO e Google)
function schema(pag, faqItens) {
  const id = (h) => `${BASE}/#${h}`
  const negocio = {
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': id('negocio'),
    name: cfg.nome,
    description:
      'A HS Sindicatura é uma empresa de sindicatura profissional e gestão condominial em São Paulo. O fundador, Danilo Ricardo Dias, atua como síndico profissional em condomínios residenciais, mistos e comerciais da capital e da Grande São Paulo, com foco em organização administrativa, controle financeiro, gestão de contratos e comunicação clara entre conselho, moradores e administradora.',
    slogan: 'Gestão condominial com método, governança e responsabilidade.',
    url: url('/'),
    image: url('/assets/img/og-hs.jpg'),
    logo: url('/icon-512.png'),
    telephone: cfg.telefone,
    email: cfg.email,
    founder: { '@id': id('danilo') },
    areaServed: [
      { '@type': 'City', name: 'São Paulo' },
      { '@type': 'AdministrativeArea', name: 'Grande São Paulo' },
    ],
    address: { '@type': 'PostalAddress', addressLocality: 'São Paulo', addressRegion: 'SP', addressCountry: 'BR' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: cfg.telefone, email: cfg.email, areaServed: 'BR', availableLanguage: 'Portuguese' },
    sameAs: [cfg.instagramUrl],
    knowsAbout: ['síndico profissional', 'sindicatura profissional', 'gestão condominial', 'administração de condomínio', 'prestação de contas de condomínio', 'gestão de contratos e fornecedores', 'assembleia de condomínio', 'manutenção predial preventiva', 'Código Civil, art. 1.348'],
    makesOffer: solucoes.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.nome, description: s.oQueE || s.descricao, url: url(`/solucoes#${s.id}`), areaServed: 'São Paulo e Grande São Paulo' } })),
  }
  const danilo = {
    '@type': 'Person',
    '@id': id('danilo'),
    name: cfg.dono,
    jobTitle: 'Síndico profissional e fundador da HS Sindicatura',
    description: 'Administrador e empresário, fundador da HS Sindicatura. Atua como síndico profissional em condomínios residenciais, mistos e comerciais de São Paulo.',
    worksFor: { '@id': id('negocio') },
    image: url('/assets/img/og-hs.jpg'),
    url: url('/sobre#fundador'),
    alumniOf: ['Exame e Saint Paul Escola de Negócios', 'FIA Business School'],
    knowsAbout: ['gestão condominial', 'governança', 'gestão financeira', 'negociação', 'organização de processos'],
  }
  const site = { '@type': 'WebSite', '@id': id('site'), name: cfg.nome, url: url('/'), inLanguage: 'pt-BR', publisher: { '@id': id('negocio') } }
  const endereco = url(pag.rota)
  const pagina = {
    '@type': pag.tipoSchema || 'WebPage',
    '@id': `${endereco}#pagina`,
    url: endereco,
    name: pag.titulo,
    description: pag.descricao,
    inLanguage: 'pt-BR',
    isPartOf: { '@id': id('site') },
    about: { '@id': id('negocio') },
  }
  const grafo = [negocio, site, pagina]
  if (pag.rota !== '/') {
    const migalhas = {
      '@type': 'BreadcrumbList',
      '@id': `${endereco}#migalhas`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: url('/') },
        { '@type': 'ListItem', position: 2, name: pag.nome, item: endereco },
      ],
    }
    pagina.breadcrumb = { '@id': migalhas['@id'] }
    grafo.push(migalhas)
  }
  if (pag.fundador) {
    grafo.push(danilo)
    if (pag.tipoSchema === 'AboutPage') pagina.mainEntity = { '@id': id('danilo') }
  }
  if (faqItens) grafo.push({ '@type': 'FAQPage', '@id': `${endereco}#duvidas`, mainEntity: faqItens.map((q) => ({ '@type': 'Question', name: q.pergunta, acceptedAnswer: { '@type': 'Answer', text: q.resposta } })) })
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo })}</script>`
}

// ---------------------------------------------------------------- montagem de uma página
function montar(pag, preview = null) {
  usados = new Map()
  let faqItens = null
  const preloads = []
  const nomes = new Set()
  let html = readFileSync(P('src/molde.html'), 'utf8')
  const secoes = (preview || pag.secoes).filter((n) => n !== '00-header' && n !== '12-rodape')
  html = html.replace('<!-- @conteudo -->', secoes.map((n) => `    <!-- @parcial ${n} -->`).join('\n'))
  if (preview) {
    // preview: só o(s) parcial(is) pedido(s); header e rodapé só se pedidos
    if (!preview.includes('00-header')) html = html.replace(/<!--\s*@parcial 00-header\s*-->/, '')
    if (!preview.includes('12-rodape')) html = html.replace(/<!--\s*@parcial 12-rodape\s*-->/, '')
  }
  // parciais (aninhados e com parâmetros)
  for (let n = 0; n < 5 && /<!--\s*@parcial\s/.test(html); n++)
    html = html.replace(/<!--\s*@parcial\s+([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g, (_, nome, params) => {
      nomes.add(nome)
      const ps = Object.fromEntries([...params.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
      return lerParcial(nome).replace(/\{\{p\.([\w-]+)\}\}/g, (_, k) => {
        if (!(k in ps)) avisos.push(`[${pag.id}] parcial ${nome} sem o parâmetro ${k}`)
        return ps[k] ?? ''
      })
    })
  // dependências de CSS e JS que o parcial pede
  html = html.replace(/[ \t]*<!--\s*@usa\s+([\w\s,-]+?)\s*-->\n?/g, (_, lista) => {
    for (const d of lista.split(/[\s,]+/).filter(Boolean)) {
      if (!existsSync(P('src/css', `${d}.css`)) && !existsSync(P('src/js', `${d}.js`))) avisos.push(`[${pag.id}] @usa ${d}: não existe css nem js com esse nome`)
      nomes.add(d)
    }
    return ''
  })
  html = html
    .replace('<!-- @solucoes -->', htmlSolucoes)
    .replace('<!-- @solucoes-detalhe -->', htmlSolucoesDetalhe)
    .replace('<!-- @solucoes-indice -->', htmlIndiceSolucoes)
    .replace('<!-- @solucoes-rodape -->', htmlSolucoesRodape)
    .replace('<!-- @publicos -->', htmlPublicos)
    .replace('<!-- @tipos -->', htmlTipos)
    .replace('<!-- @antes-depois -->', htmlAntesDepois)
    .replace('<!-- @jardim -->', htmlJardim)
    .replace(/<!--\s*@faq(?:\s+([\w-]+))?\s*-->/g, (_, nome) => {
      faqItens = dados(nome ? `faq-${nome}` : 'faq')
      return htmlFaq(faqItens)
    })
  // <!-- @se-img nome --> ... <!-- /@se-img -->: só fica se a imagem existir (foto opcional)
  html = html.replace(/<!--\s*@se-img\s+([\w-]+)\s*-->([\s\S]*?)<!--\s*\/@se-img\s*-->/g, (_, nome, dentro) => (versoes(nome, 'webp').length ? dentro : ''))
  // o relatório de exemplo é sempre do mês que acabou de fechar
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const ref = new Date()
  ref.setDate(1)
  ref.setMonth(ref.getMonth() - 1)
  const mesRel = `${MESES[ref.getMonth()][0].toUpperCase()}${MESES[ref.getMonth()].slice(1)} de ${ref.getFullYear()}`
  const ultimos = Array.from({ length: 6 }, (_, k) => MESES[(ref.getMonth() - 5 + k + 12) % 12].slice(0, 3))
  html = html.replace(/\{\{mes-relatorio\}\}/g, mesRel).replace(/\{\{mes-(\d)\}\}/g, (_, k) => ultimos[Number(k)])
  const cabeca = []
  html = html.replace(/<!--\s*@head\s*-->([\s\S]*?)<!--\s*\/@head\s*-->/g, (_, c) => {
    cabeca.push(c.trim())
    return ''
  })
  html = html.replace('<!-- @head-parciais -->', cabeca.join('\n  '))
  // o JS entra antes dos marcadores, pra ele também poder usar {{cfg.caminho}}
  html = html.replace('<!-- @js -->', () => `<script>${minJs(juntar('src/js', '.js', nomes))}</script>`)
  html = html.replace('<!-- @css -->', () => `<style>${minCss(juntar('src/css', '.css', nomes))}</style>`)
  html = html.replace(/<i data-i="([\w-]+)"(?: data-w="(\w+)")?(?: class="([^"]*)")?><\/i>/g, (_, nome, peso, classe) => icone(nome, peso || 'light', classe || ''))
  html = html.replace(/\{\{pag\.([\w-]+)\}\}/g, (_, k) => {
    if (pag[k] === undefined) avisos.push(`[${pag.id}] página sem o campo ${k}`)
    return esc(pag[k] ?? '')
  })
  html = html.replace(/\{\{inicio\}\}/g, pag.rota === '/' ? '#inicio' : '/')
  // o diagnóstico: na Home é o formulário no fim da própria página; nas outras, a página Contato
  html = html.replace(/\{\{diagnostico\}\}/g, pag.rota === '/' ? '#contato' : '/contato')
  html = html.replace(/\{\{wa:([\w-]+)\}\}/g, (_, chave) => esc(linkWa(chave)))
  html = html.replace(/\{\{cfg\.([\w.]+)\}\}/g, (_, c) => esc(valor(c)))
  html = html.replace(/\{\{ano\}\}/g, String(new Date().getFullYear()))
  // menu: a página atual acesa (aria-current)
  html = html.replace(/<a ([^>]*?)\s*data-pag="([\w-]+)"/g, (_, a, id) => `<a ${a}${id === pag.id ? ' aria-current="page"' : ''}`)
  // todo WhatsApp abre em outra aba
  html = html.replace(/<a\b(?![^>]*\starget=)([^>]*\shref="https:\/\/wa\.me\/)/g, '<a target="_blank" rel="noopener"$1')
  html = html.replace('<!-- @schema -->', () => schema(pag, faqItens))
  html = imagens(html, preloads)
  // imagem adiada (data-adiar no parcial): srcset e src viram data-srcset e data-src, e o
  // _base.js devolve depois do carregamento (o hexágono do hero não disputa banda com o LCP)
  html = html.replace(/<picture([^>]*)>((?:(?!<\/picture>)[\s\S])*?)<\/picture>/g, (tag, a, miolo) =>
    miolo.includes(' data-adiar') ? `<picture${a} data-adiada>${miolo.replace(/ (srcset|src)="/g, ' data-$1="').replace(' data-adiar', '')}</picture>` : tag,
  )
  html = html.replace('<!-- @sprite -->', () => `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;overflow:hidden">${[...usados.values()].join('')}</svg>`)
  html = html.replace('<!-- @preload-hero -->', () => linksPreload(preloads))
  html = html.replace(
    '<!-- @meta-dominio -->',
    BASE
      ? `<link rel="canonical" href="${url(pag.rota)}">\n  <meta property="og:url" content="${url(pag.rota)}">\n  <meta property="og:image" content="${url('/assets/img/og-hs.jpg')}">`
      : '<meta property="og:image" content="/assets/img/og-hs.jpg">',
  )
  return html
}

// ---------------------------------------------------------------- conferência
const idsPorRota = new Map()
const linksPorPagina = []
function verificar(html, pag) {
  const rotulo = pag.id
  const $ = cheerio.load(html)
  const ids = {}
  $('[id]').each((_, el) => {
    const id = $(el).attr('id')
    ids[id] = (ids[id] || 0) + 1
  })
  idsPorRota.set(pag.rota, new Set(Object.keys(ids)))
  $('a[href^="/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href.startsWith('/assets/')) linksPorPagina.push({ de: rotulo, href })
  })
  $('script, style').remove()
  const texto = $('body').text()
  const tracos = texto.match(/.{0,30}[—–].{0,30}/g)
  if (tracos) avisos.push(`[${rotulo}] travessão no texto (regra da casa): ${tracos.slice(0, 4).map((s) => JSON.stringify(s.trim())).join(' | ')}`)
  const sobrou = html.match(/\{\{[^}]+\}\}/g)
  if (sobrou) avisos.push(`[${rotulo}] marcadores sem valor: ${[...new Set(sobrou)].join(', ')}`)
  $('img').each((_, el) => {
    const src = ($(el).attr('src') || $(el).attr('data-src') || '?').slice(0, 60)
    if ($(el).attr('alt') === undefined) avisos.push(`[${rotulo}] img sem alt: ${src}`)
    if (!$(el).attr('width') || !$(el).attr('height')) avisos.push(`[${rotulo}] img sem width/height (salto de layout): ${src}`)
  })
  for (const [id, n] of Object.entries(ids)) if (n > 1) avisos.push(`[${rotulo}] id repetido: #${id} (${n}x)`)
  if (!argPreview)
    $('a[href^="#"]').each((_, el) => {
      const alvo = $(el).attr('href').slice(1)
      if (alvo && !ids[alvo]) avisos.push(`[${rotulo}] âncora sem destino: #${alvo}`)
    })
  if (!argPreview && $('h1').length !== 1) avisos.push(`[${rotulo}] ${$('h1').length} h1 na página (precisa ser 1)`)
}
// links entre páginas: a página existe e, com #, a âncora existe nela
function verificarLinks() {
  for (const { de, href } of linksPorPagina) {
    const [rota, hash] = href.split('#')
    const ids = idsPorRota.get(rota)
    if (!ids) avisos.push(`[${de}] link pra página que não existe: ${href}`)
    else if (hash && !ids.has(hash)) avisos.push(`[${de}] link com âncora que não existe na página: ${href}`)
  }
}

// ---------------------------------------------------------------- execução
// No --publicar, dist sai do zero: a cópia só acrescenta, então arquivo que saiu de
// src/assets ficaria esquecido em dist e iria pro GitHub.
if (process.argv.includes('--publicar')) rmSync(DIST, { recursive: true, force: true })
copiarPasta(P('src/assets'), path.join(DIST, 'assets'))
copiarPasta(P('src/raiz'), DIST)

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`
if (!argPreview) {
  const hoje = new Date().toISOString().slice(0, 10)
  for (const pag of paginas) {
    const html = montar(pag)
    verificar(html, pag)
    gravar(path.join(DIST, pag.arquivo), html)
    console.log(`ok dist/${pag.arquivo.padEnd(26)} ${kb(html).padStart(9)} (${usados.size} ícones no sprite)`)
  }
  verificarLinks()
  gravar(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /preview/\n${BASE ? `Sitemap: ${BASE}/sitemap.xml\n` : ''}`)
  if (BASE) gravar(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paginas.map((p) => `  <url><loc>${url(p.rota)}</loc><lastmod>${hoje}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  if (!BASE) avisos.push('dominio vazio no site.config.json: sem canonical, sem sitemap e og:image relativo')
  for (const p of cfg.pendencias || []) avisos.push(`pendente: ${p}`)
  if (process.argv.includes('--publicar')) rmSync(path.join(DIST, 'preview'), { recursive: true, force: true })
} else {
  const nome = argPreview.join('+')
  const pag = { id: 'preview', nome: 'Preview', rota: '/preview/', titulo: 'Preview', descricao: '', ogTitulo: 'Preview', ogDescricao: '', ogAlt: '', zap: 'proposta', secoes: [] }
  const html = montar(pag, argPreview)
  verificar(html, pag)
  gravar(path.join(DIST, `preview/${nome}.html`), html)
  console.log(`ok /preview/${nome}.html ${kb(html)}`)
}
if (avisos.length) console.log(`AVISOS:\n  ${[...new Set(avisos)].join('\n  ')}`)

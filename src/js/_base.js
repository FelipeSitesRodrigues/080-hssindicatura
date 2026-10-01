// HS Sindicatura: comportamento comum a todas as páginas. Sem biblioteca e sem ouvir o
// scroll da janela: o que depende de rolagem vai por IntersectionObserver (base do 079).
// Cada seção com comportamento próprio tem o seu arquivo (mesmo nome do parcial).
;(() => {
  const temIO = 'IntersectionObserver' in window

  // ---------------------------------------------------------------- revelação no scroll
  const alvos = document.querySelectorAll('[data-revela], [data-revela-lista]')
  if (!temIO) {
    alvos.forEach((el) => el.classList.add('visivel'))
  } else {
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue
          e.target.classList.add('visivel')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    alvos.forEach((el) => io.observe(el))
  }

  // ---------------------------------------------------------------- imagens adiadas
  // O hexágono do hero é decorativo: baixa só depois do carregamento, pra não disputar banda
  // com a foto do fundo (o LCP). O build troca srcset/src por data-srcset/data-src
  // (data-adiar no parcial); aqui eles voltam, e a imagem entra com um fade quando chega.
  // Espera o carregamento E a pintura da foto do fundo (o LCP), com limite de 1,5 s: assim o
  // hexágono nunca divide banda com ela, nem em conexão rápida.
  const adiadas = document.querySelectorAll('picture[data-adiada]')
  let lcpPintou = false
  let carregou = document.readyState === 'complete'
  let feito = false
  const tentarAdiadas = () => {
    if (feito || !lcpPintou || !carregou) return
    feito = true
    carregarAdiadas()
  }
  // Safari não mede LCP: lá o hexágono só espera o carregamento
  if (!(window.PerformanceObserver && PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint'))) lcpPintou = true
  else
    new PerformanceObserver((l) => {
      if (!l.getEntries().length) return
      lcpPintou = true
      tentarAdiadas()
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  setTimeout(() => {
    lcpPintou = true
    tentarAdiadas()
  }, 1500)
  if (!carregou)
    addEventListener(
      'load',
      () => {
        carregou = true
        tentarAdiadas()
      },
      { once: true },
    )
  const carregarAdiadas = () =>
    adiadas.forEach((pic) => {
      const img = pic.querySelector('img')
      if (!img) return
      img.addEventListener('load', () => pic.classList.add('adiada--pronta'), { once: true })
      pic.querySelectorAll('[data-srcset]').forEach((el) => {
        el.srcset = el.dataset.srcset
        el.removeAttribute('data-srcset')
      })
      if (img.dataset.src) {
        img.src = img.dataset.src
        img.removeAttribute('data-src')
      }
      if (img.complete && img.naturalWidth) pic.classList.add('adiada--pronta')
    })
  tentarAdiadas()

  // ---------------------------------------------------------------- topo e botão flutuante
  // O topo fica quase opaco quando a página sai do começo (sentinela a 40 px do topo). O
  // WhatsApp flutuante só aparece depois que os botões do topo saem da tela, e some de novo
  // no fim: em cima do convite final de cada página, que já leva pro WhatsApp, e no rodapé,
  // que tem o número.
  const topo = document.getElementById('topo')
  const hero = document.getElementById('inicio')
  const zap = document.querySelector('.zap-flutuante')
  const botoesHero = hero?.querySelector('.hero__botoes, .ptopo__botoes, [data-zap-depois]')
  const fim = document.querySelector('[data-zap-some]') || document.getElementById('rodape')
  if (temIO && hero) {
    const sentinela = document.createElement('div')
    sentinela.setAttribute('aria-hidden', 'true')
    sentinela.style.cssText = 'position:absolute;top:40px;left:0;width:1px;height:1px;pointer-events:none'
    hero.prepend(sentinela)
    new IntersectionObserver(([e]) => topo?.classList.toggle('topo--rolado', !e.isIntersecting)).observe(sentinela)
    let botoesFora = false
    let noFim = false
    const zapVisivel = () => zap?.classList.toggle('visivel', botoesFora && !noFim)
    new IntersectionObserver(([e]) => {
      botoesFora = !e.isIntersecting && e.boundingClientRect.top < 0
      zapVisivel()
    }).observe(botoesHero || hero)
    if (fim)
      new IntersectionObserver(
        ([e]) => {
          noFim = e.isIntersecting || e.boundingClientRect.top < 0
          zapVisivel()
        },
        { rootMargin: '0px 0px -35% 0px' },
      ).observe(fim)
  } else {
    zap?.classList.add('visivel')
  }

  // ---------------------------------------------------------------- âncoras
  // As seções abaixo da dobra usam content-visibility (layout só perto da tela) e, até
  // aparecerem, têm altura estimada: a rolagem até uma âncora distante parava no lugar
  // errado. No primeiro clique numa âncora (ou chegando com #algo no endereço, vindo de
  // outra página) a página desenha tudo uma vez e só então rola; no fim da rolagem, confere
  // e acerta de uma vez (bug do 076). Vale pra "#id" e pra "/esta-pagina#id".
  const desenharTudo = () => document.documentElement.classList.add('cv-pronto')
  const folga = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  const alvoDe = (hash) => {
    try {
      return hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    } catch {
      return null
    }
  }
  const chegada = alvoDe(location.hash)
  if (chegada) {
    desenharTudo()
    // o navegador pula pro # antes das seções terem a altura de verdade: confere no carregamento
    const conferir = () =>
      requestAnimationFrame(() => {
        const dif = chegada.getBoundingClientRect().top - folga()
        if (Math.abs(dif) > 3) scrollBy({ top: dif, behavior: 'instant' })
      })
    if (document.readyState === 'complete') conferir()
    else addEventListener('load', conferir, { once: true })
  }
  let pendente = null
  const acertar = () => {
    if (!pendente || Date.now() > pendente.ate) return (pendente = null)
    const alvo = pendente.alvo
    pendente = null
    const dif = alvo.getBoundingClientRect().top - folga()
    if (Math.abs(dif) > 3) scrollBy({ top: dif, behavior: 'instant' })
  }
  if ('onscrollend' in window) addEventListener('scrollend', acertar)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]')
    if (!a || e.defaultPrevented) return
    const destino = new URL(a.href, location.href)
    if (destino.origin !== location.origin || destino.pathname !== location.pathname) return
    const alvo = alvoDe(destino.hash)
    if (!alvo) return
    const id = alvo.id
    e.preventDefault()
    desenharTudo()
    requestAnimationFrame(() => {
      pendente = { alvo, ate: Date.now() + 4000 }
      alvo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      if (!('onscrollend' in window)) setTimeout(acertar, 1400)
      history.pushState(null, '', '#' + id)
      // o foco acompanha (teclado e leitor de tela continuam de onde a página parou)
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1')
      alvo.focus({ preventScroll: true })
    })
  })

  // ---------------------------------------------------------------- rastreio dos cliques no WhatsApp
  // Todo botão de WhatsApp manda evento com a origem (data-zap) e, nos cartões, o serviço ou
  // o perfil. Vai pro dataLayer (GA4 / Tag Manager) e pro Pixel, se um dia forem instalados.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="https://wa.me/"]')
    if (!a) return
    const origem = a.dataset.zap || a.closest('section, header, footer')?.id || 'pagina'
    const servico = a.dataset.servico
    ;(window.dataLayer = window.dataLayer || []).push({ event: 'whatsapp_clique', origem, servico, pagina: location.pathname })
    if (typeof window.fbq === 'function') window.fbq('track', 'Contact', { origem, servico })
  })
})()

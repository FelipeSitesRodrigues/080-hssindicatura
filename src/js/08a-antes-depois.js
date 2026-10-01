// Antes e depois: comparadores de arrastar (mouse, toque e teclado) e, no celular e no
// tablet, as abas que trocam o par no mesmo palco (base do 069 Paraíso do Gesso).
// A posição da linha vive em --pos (0 a 100) no .ad__palco; o CSS recorta a foto de depois
// e anda com a linha. Toda escrita no DOM passa por requestAnimationFrame.
;(() => {
  const secao = document.getElementById('antes-e-depois')
  if (!secao) return
  const figuras = [...secao.querySelectorAll('.ad__par')]
  if (!figuras.length) return
  const abas = [...secao.querySelectorAll('.ad__aba')]
  const listaAbas = secao.querySelector('.ad__abas')
  const modoAbas = matchMedia('(max-width: 63.99em)')
  const modoColuna = matchMedia('(min-width: 40em)')
  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)')

  const limitar = (v) => Math.min(100, Math.max(0, v))
  const sai = (t) => 1 - Math.pow(1 - t, 3)
  const vaiVem = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  let interagiu = false
  let ativo = 0

  const pares = figuras.map((fig, i) => ({
    fig,
    i,
    palco: fig.querySelector('.ad__palco'),
    range: fig.querySelector('.ad__range'),
    antes: fig.querySelector('.ad__etiqueta--antes'),
    depois: fig.querySelector('.ad__etiqueta--depois'),
    pos: 50,
    destino: 50,
    texto: -1,
    quadro: 0,
    anim: 0,
    largura: 0,
    limAntes: 0,
    limDepois: Infinity,
    rect: null,
    ponteiro: null,
    x0: 0,
    y0: 0,
    arrastando: false,
    dica: false,
  }))

  // ---------------------------------------------------------------- desenho
  function desenhar(c) {
    if (c.quadro) cancelAnimationFrame(c.quadro)
    c.quadro = 0
    const p = Math.round(c.pos * 100) / 100
    c.palco.style.setProperty('--pos', p)
    const inteiro = Math.round(p)
    if (inteiro !== c.texto) {
      c.texto = inteiro
      c.range.value = String(inteiro)
      c.range.setAttribute('aria-valuetext', `${inteiro}% antes, ${100 - inteiro}% depois`)
    }
    // a etiqueta some quando a linha passa por cima dela
    if (!c.largura) return
    const x = (p / 100) * c.largura
    c.antes.classList.toggle('ad__etiqueta--oculta', x < c.limAntes)
    c.depois.classList.toggle('ad__etiqueta--oculta', x > c.limDepois)
  }
  const pedir = (c) => {
    if (!c.quadro) c.quadro = requestAnimationFrame(() => desenhar(c))
  }
  function parar(c) {
    if (c.anim) cancelAnimationFrame(c.anim)
    c.anim = 0
  }
  // arrastando: resposta imediata, sem transição
  function mover(c, pos) {
    parar(c)
    c.pos = c.destino = limitar(pos)
    pedir(c)
  }
  // clique, toque, teclado e a dica: transição curta até o destino
  function animar(c, destino, dur, curva = sai, fim) {
    parar(c)
    c.destino = limitar(destino)
    if (semMovimento.matches || dur <= 0 || Math.abs(c.destino - c.pos) < 0.2) {
      c.pos = c.destino
      pedir(c)
      if (fim) fim()
      return
    }
    const de = c.pos
    const t0 = performance.now()
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / dur)
      c.pos = de + (c.destino - de) * curva(t)
      desenhar(c)
      if (t < 1) c.anim = requestAnimationFrame(passo)
      else {
        c.anim = 0
        if (fim) fim()
      }
    }
    c.anim = requestAnimationFrame(passo)
  }
  function medir(c) {
    c.largura = c.palco.clientWidth
    c.limAntes = c.antes.offsetLeft + c.antes.offsetWidth + 8
    c.limDepois = c.depois.offsetLeft - 8
    desenhar(c)
  }
  const marcar = () => {
    interagiu = true
  }

  // ---------------------------------------------------------------- ponteiro e teclado
  pares.forEach((c) => {
    const pct = (x) => ((x - c.rect.left) / c.rect.width) * 100
    c.palco.addEventListener('pointerdown', (e) => {
      if (c.ponteiro !== null || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
      c.ponteiro = e.pointerId
      c.rect = c.palco.getBoundingClientRect()
      c.x0 = e.clientX
      c.y0 = e.clientY
      c.arrastando = false
      // no toque, espera saber se o gesto é de arrastar (horizontal) ou de rolar a página
      if (e.pointerType === 'touch') return
      e.preventDefault()
      marcar()
      try {
        c.palco.setPointerCapture(e.pointerId)
      } catch {}
      c.palco.classList.add('ad__palco--pegando')
      animar(c, pct(e.clientX), 360)
    })
    c.palco.addEventListener('pointermove', (e) => {
      if (e.pointerId !== c.ponteiro) return
      const dx = e.clientX - c.x0
      if (!c.arrastando) {
        if (e.pointerType === 'touch') {
          if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - c.y0)) return
          marcar()
          c.palco.classList.add('ad__palco--pegando')
        } else if (Math.abs(dx) < 3) return
        c.arrastando = true
      }
      mover(c, pct(e.clientX))
    })
    const soltar = (e) => {
      if (e.pointerId !== c.ponteiro) return
      // toque curto sem arrastar: leva a linha até o dedo
      if (e.type === 'pointerup' && e.pointerType === 'touch' && !c.arrastando && Math.hypot(e.clientX - c.x0, e.clientY - c.y0) < 10) {
        marcar()
        animar(c, pct(e.clientX), 360)
      }
      c.ponteiro = null
      c.arrastando = false
      c.palco.classList.remove('ad__palco--pegando')
    }
    c.palco.addEventListener('pointerup', soltar)
    c.palco.addEventListener('pointercancel', soltar)

    c.range.addEventListener('input', () => {
      marcar()
      mover(c, Number(c.range.value))
    })
    c.range.addEventListener('keydown', (e) => {
      const passos = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }
      const base = c.anim ? c.destino : c.pos
      let alvo
      if (e.key in passos) alvo = Math.round(base + passos[e.key] * (e.shiftKey ? 2 : 1))
      else if (e.key === 'Home') alvo = 0
      else if (e.key === 'End') alvo = 100
      else return
      e.preventDefault()
      marcar()
      animar(c, alvo, 200)
    })
  })

  // medida inicial e a cada mudança de tamanho do palco (fora da tela, com o
  // content-visibility, a largura é zero; o observador mede de novo quando a seção aparece)
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entradas) => {
      for (const en of entradas) {
        const c = pares.find((p) => p.palco === en.target)
        if (c) medir(c)
      }
    })
    pares.forEach((c) => ro.observe(c.palco))
  } else {
    pares.forEach(medir)
    addEventListener('resize', () => pares.forEach(medir), { passive: true })
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => pares.forEach(medir))

  // ---------------------------------------------------------------- abas (celular e tablet)
  function ativar(i, { foco = false } = {}) {
    const n = pares.length
    ativo = ((i % n) + n) % n
    abas.forEach((a, k) => {
      const sel = k === ativo
      a.setAttribute('aria-selected', String(sel))
      a.tabIndex = sel ? 0 : -1
    })
    pares.forEach((c, k) => {
      c.fig.classList.toggle('ad__par--ativo', k === ativo)
      c.fig.inert = modoAbas.matches && k !== ativo
    })
    if (foco && abas[ativo]) abas[ativo].focus()
  }

  function aplicarModo() {
    const comAbas = modoAbas.matches
    pares.forEach((c, k) => {
      if (comAbas && abas[k]) {
        c.fig.setAttribute('role', 'tabpanel')
        c.fig.setAttribute('aria-labelledby', abas[k].id)
      } else {
        c.fig.removeAttribute('role')
        c.fig.removeAttribute('aria-labelledby')
      }
      c.fig.inert = comAbas && k !== ativo
    })
    if (listaAbas) listaAbas.setAttribute('aria-orientation', modoColuna.matches ? 'vertical' : 'horizontal')
  }

  abas.forEach((a, k) => {
    a.addEventListener('click', () => ativar(k))
    a.addEventListener('keydown', (e) => {
      const setas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
      let alvo
      if (e.key in setas) alvo = ativo + setas[e.key]
      else if (e.key === 'Home') alvo = 0
      else if (e.key === 'End') alvo = abas.length - 1
      else return
      e.preventDefault()
      ativar(alvo, { foco: true })
    })
  })

  aplicarModo()
  modoAbas.addEventListener('change', aplicarModo)
  modoColuna.addEventListener('change', aplicarModo)

  // ---------------------------------------------------------------- dica de interação
  // Na primeira vez que um comparador aparece, a linha faz 50 → 42 → 58 → 50 e para. Uma vez
  // só por palco (nas abas, uma vez pra seção), escalonado quando os três entram juntos no
  // computador, nunca com "reduzir movimento" e nunca depois que a pessoa já mexeu.
  function dica(c) {
    if (c.dica || interagiu || semMovimento.matches) return
    if (modoAbas.matches) pares.forEach((p) => (p.dica = true))
    else c.dica = true
    const roteiro = [
      [42, 460],
      [58, 700],
      [50, 520],
    ]
    let i = 0
    const seguir = () => {
      if (interagiu || c.ponteiro !== null || i >= roteiro.length) return
      const [pos, dur] = roteiro[i++]
      animar(c, pos, dur, vaiVem, seguir)
    }
    setTimeout(seguir, 850 + (modoAbas.matches ? 0 : c.i * 260))
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (!en.isIntersecting) continue
          const c = pares.find((p) => p.palco === en.target)
          if (!c || c.dica) {
            io.unobserve(en.target)
            continue
          }
          if (modoAbas.matches && c !== pares[ativo]) continue
          io.unobserve(en.target)
          dica(c)
        }
      },
      { threshold: 0.7 },
    )
    pares.forEach((c) => io.observe(c.palco))
  }
})()

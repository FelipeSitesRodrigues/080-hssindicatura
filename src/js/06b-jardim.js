// Jardim renovado: a faixa anda sozinha, em loop, só com transform (CSS). Aqui: a
// velocidade (a duração sai do comprimento da lista, pra andar igual em qualquer tela), o
// botão de pausa (WCAG 2.2.2), a pausa fora da tela e as fotos, que carregam todas quando a
// seção chega perto: as que estão fora da faixa, à direita, o lazy do navegador só pediria
// quando entrassem, e a foto chegaria em branco.
;(() => {
  const secao = document.getElementById('jardim-renovado')
  if (!secao) return
  const faixa = secao.querySelector('.jardim__faixa')
  const lista = secao.querySelector('.jardim__lista')
  const botao = secao.querySelector('.jardim__pausa')
  const texto = botao?.querySelector('.jardim__pausa-texto')
  const VELOCIDADE = 32 // px por segundo

  const medir = () => {
    const w = lista.getBoundingClientRect().width
    if (w) faixa.style.setProperty('--jardim-duracao', `${(w / VELOCIDADE).toFixed(1)}s`)
  }
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(lista)

  let pausado = false
  botao?.addEventListener('click', () => {
    pausado = !pausado
    secao.classList.toggle('jardim--pausado', pausado)
    if (texto) texto.textContent = pausado ? 'Continuar' : 'Pausar'
    botao.setAttribute('aria-label', pausado ? 'Continuar as fotos do jardim' : 'Pausar as fotos do jardim')
  })

  const carregar = () => secao.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'))
  if (!('IntersectionObserver' in window)) return carregar()
  const perto = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return
      perto.disconnect()
      carregar()
    },
    { rootMargin: '600px 0px' },
  )
  perto.observe(secao)
  new IntersectionObserver(([e]) => secao.classList.toggle('jardim--fora', !e.isIntersecting)).observe(faixa)
})()

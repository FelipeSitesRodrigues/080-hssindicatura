// Acordeão das dúvidas: cada pergunta abre e fecha a própria resposta (as outras ficam
// como estão). O botão diz o estado (aria-expanded) e a resposta fechada fica inert, fora
// do Tab e do leitor de tela. A altura anima pelo CSS (grade 0fr -> 1fr).
;(() => {
  const itens = document.querySelectorAll('.faq__item')
  itens.forEach((item) => {
    const botao = item.querySelector('.faq__botao')
    const resposta = item.querySelector('.faq__resposta')
    if (!botao || !resposta) return
    resposta.inert = botao.getAttribute('aria-expanded') !== 'true'
    botao.addEventListener('click', () => {
      const abrir = botao.getAttribute('aria-expanded') !== 'true'
      botao.setAttribute('aria-expanded', String(abrir))
      item.classList.toggle('faq__item--aberto', abrir)
      resposta.inert = !abrir
    })
  })
})()

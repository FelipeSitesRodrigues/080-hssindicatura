// Formulário da página Contato ("Agendar uma conversa", o CTA do briefing final). Ele mora
// num <template> e entra logo depois da primeira pintura: no HTML, os campos e o
// preenchimento automático do Chrome dobravam o custo do primeiro layout.
// Depois de montado: valida no envio (e de novo a cada campo corrigido), monta a mensagem
// com os dados e abre o WhatsApp da HS numa aba nova. Estados: erro (aria-invalid e texto
// embaixo do campo), carregando no botão e sucesso com o link de reserva, caso o navegador
// bloqueie a aba. Os dados ficam no formulário.
;(() => {
  const numero = '{{cfg.whatsapp}}'
  const INTRO = 'Olá, conheci a HS Sindicatura pelo site e gostaria de agendar uma conversa sobre a gestão do meu condomínio.'

  // os que já vêm no HTML
  document.querySelectorAll('form.form').forEach(ligar)

  // o da página Contato: entra logo depois da primeira pintura (o rAF cai no primeiro quadro e
  // o setTimeout, depois dele). Enquanto isso ele está na espera da animação de entrada.
  const molde = document.getElementById('form-molde-contato')
  if (molde) {
    const lugar = molde.parentElement
    requestAnimationFrame(() =>
      setTimeout(() => {
        lugar.append(molde.content.cloneNode(true))
        lugar.classList.add('cto__form--montado')
        ligar(lugar.querySelector('form'))
      }, 0),
    )
  }

  function ligar(form) {
    const f = form.elements
    const sucesso = form.querySelector('.form__sucesso')
    const reserva = form.querySelector('.form__link')
    const digitos = (s) => s.replace(/\D/g, '')

    // máscara do WhatsApp: (11) 91234-5678
    f.whatsapp.addEventListener('input', () => {
      const d = digitos(f.whatsapp.value).slice(0, 11)
      let v = d
      if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`
      if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
      f.whatsapp.value = v
    })
    f.unidades.addEventListener('input', () => (f.unidades.value = digitos(f.unidades.value).slice(0, 5)))

    const regras = {
      nome: (v) => v.trim().length >= 3 || 'Digite seu nome.',
      whatsapp: (v) => [10, 11].includes(digitos(v).length) || 'Digite o WhatsApp com DDD.',
      condominio: (v) => v.trim().length >= 2 || 'Digite o nome do condomínio.',
      cidade: (v) => v.trim().length >= 2 || 'Digite a cidade.',
      tipo: (v) => !!v || 'Escolha o tipo de condomínio.',
      unidades: (v) => Number(digitos(v)) > 0 || 'Digite o número de unidades.',
      aceite: (_, el) => el.checked || 'Marque a autorização para receber o retorno.',
    }
    const conferir = (nome) => {
      const el = f[nome]
      const r = regras[nome](el.value, el)
      const erro = document.getElementById(`f-${nome}-erro`)
      const ok = r === true
      el.setAttribute('aria-invalid', String(!ok))
      if (erro) erro.textContent = ok ? '' : r
      return ok
    }
    // depois do primeiro envio, cada campo se confere de novo quando muda
    let tentou = false
    form.addEventListener('input', (e) => tentou && e.target.name in regras && conferir(e.target.name))
    form.addEventListener('change', (e) => tentou && e.target.name in regras && conferir(e.target.name))

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      tentou = true
      const invalidos = Object.keys(regras).filter((n) => !conferir(n))
      if (invalidos.length) {
        f[invalidos[0]].focus()
        return
      }
      const obs = f.mensagem?.value.trim()
      const texto = [
        INTRO,
        '',
        `*Nome:* ${f.nome.value.trim()}`,
        `*WhatsApp:* ${f.whatsapp.value.trim()}`,
        `*Condomínio:* ${f.condominio.value.trim()}`,
        `*Cidade:* ${f.cidade.value.trim()}`,
        `*Tipo:* ${f.tipo.value}`,
        `*Unidades:* ${digitos(f.unidades.value)}`,
        ...(obs ? [`*Mensagem:* ${obs}`] : []),
      ].join('\n')
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
      reserva.href = url
      form.classList.add('form--enviando')
      const aba = window.open(url, '_blank')
      if (aba) aba.opener = null
      const origem = form.dataset.origem || 'contato'
      ;(window.dataLayer = window.dataLayer || []).push({ event: 'formulario_conversa', origem, tipo: f.tipo.value })
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead', { origem, tipo: f.tipo.value })
      setTimeout(() => {
        form.classList.remove('form--enviando')
        sucesso.hidden = false
        sucesso.focus({ preventScroll: true })
        // aba bloqueada (celular às vezes bloqueia): segue na mesma aba
        if (!aba) location.href = url
      }, 700)
    })
  }
})()

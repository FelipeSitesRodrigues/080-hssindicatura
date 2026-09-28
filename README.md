# 080 HS Sindicatura

Site institucional da HS Sindicatura, sindicatura profissional e gestão condominial do Danilo
Ricardo Dias em São Paulo. HTML, CSS e JavaScript estáticos, montados por um `build.mjs` em
Node e servidos de `dist/`. Seis páginas, como pede o briefing (seção 10): Home, Soluções,
Para Condomínios, Para Administradoras, Sobre e Contato.

A Home segue os mockups aprovados, desktop e celular (`../080 - HS Sindicatura/Recursos
Site/DESKTOP/` e `MOBILE/`). As internas não têm mockup: usam o mesmo sistema visual (paleta,
fontes, hexágono, cartões de vidro e brancos, alternância de claro e escuro) e o conteúdo que o
briefing pede pra cada uma (seções 13 a 17). A copy vem do briefing
(`Recursos Site/BRIEFING DO PROJETO (BEM IMPORTANTE)/`); o que ele não escreve saiu da
apresentação comercial e da proposta do Piazza (`Recursos Site/DOCS DA EMPRESA/`).

## Rodar

```bash
npm install          # só na primeira vez (sharp, puppeteer-core, cheerio, phosphor, lighthouse)
npm run build        # monta as seis páginas em dist/
npm run serve        # http://localhost:3080 (ou dois cliques em ABRIR-SITE.bat)
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run build` | monta `dist/` a partir de `src/` e avisa o que está pendente |
| `npm run publicar` | o mesmo, do zero, apagando os previews (antes de subir) |
| `npm run serve` | servidor local na porta 3080, com gzip como a Vercel |
| `npm run testar` | as seis páginas: larguras de 320 a 1920, abertura, animações no scroll, relatório, menu, âncoras (índices e # vindo de outra página), antes e depois (mouse, dedo, teclado e abas), carrossel do jardim (anda, pausa, reduzir movimento), dúvidas, os dois formulários, todo WhatsApp, links entre páginas, imagens e console |
| `npm run lighthouse` | Lighthouse de celular e de computador da Home; `node scripts/lighthouse.mjs ambos todas` mede as seis páginas (`METODO=devtools` pra limitação real) |
| `npm run imagens` | gera as imagens (AVIF e WebP) a partir da pasta de recursos do cliente |
| `npm run fontes` | baixa e recorta as fontes (Montserrat e Inter) |
| `node scripts/og.mjs` | refaz a imagem de compartilhamento (1200 x 630) |
| `node scripts/alturas.mjs` | mede as seções pro `99-desempenho.css` |
| `node scripts/print.mjs / --largura 390 --inteira` | print da página (movimento reduzido; `--movimento` liga) |
| `node scripts/perfil.mjs` | trace da thread principal com a CPU 4x mais lenta |

## Estrutura

- `src/paginas.json` lista as páginas (arquivo, rota, título, descrição, textos de
  compartilhamento e seções). `src/molde.html` é o esqueleto comum (head, header, rodapé e
  WhatsApp flutuante). Cada seção é um parcial em `src/partials/`, com CSS e JS de mesmo nome
  em `src/css/` e `src/js/`; cada página leva só o CSS, o JS e os ícones que usa.
- Prefixos: `00` a `12` são as seções da Home (ordem do mockup; `06a-antes-depois` e
  `06b-jardim` entraram depois, entre os diferenciais e a base legal); `20-topo` é o topo das
  páginas internas; `sol-`, `con-`, `adm-`, `sob-` e `cto-` são de Soluções, Para Condomínios,
  Para Administradoras, Sobre e Contato; `x-` são peças repetidas entre páginas (convite
  final, como começa, dúvidas, texto do fundador, passos do método). Um parcial pede o CSS de
  outro com `<!-- @usa nome -->` e recebe parâmetros (`<!-- @parcial x-cta titulo="..." -->`).
- `99-desempenho.css` guarda as alturas reservadas das seções.
- `src/dados/solucoes.json` gera os 6 cartões de soluções da Home, as 6 frentes da página
  Soluções (o que é, o que resolve, como funciona, entregáveis) e a lista do rodapé, cada
  uma com o WhatsApp do próprio serviço; `publicos.json` os 4 perfis de "Para quem atuamos";
  `tipos.json` residencial, misto e comercial (Para Condomínios), cada um com a mensagem dele;
  `faq.json`, `faq-condominios.json` e `faq-administradoras.json` os acordeões e o FAQPage de
  cada página; `antes-depois.json` os 3 pares do comparador (textos, alts e o alinhamento das
  fotos) e `jardim.json` as fotos do carrossel, na ordem em que passam.
- `site.config.json` guarda contato, domínio e as mensagens de WhatsApp. O build lista as
  `pendencias` a cada execução.
- `dist/` vai versionado: a Vercel só serve a pasta, sem instalar nem buildar (`vercel.json`).
  Depois de mexer em `src/`, rodar `npm run publicar` e commitar.

## Imagens

- Hero: as torres na hora azul (fundo), o hexágono do logo e o Danilo recortado, sempre os
  arquivos do cliente. O recorte guardava um brilho laranja escondido nos pixels
  transparentes, e o símbolo do logo uma franja vermelha e um acento solto: o
  `processar-imagens.mjs` limpa os dois toda vez.
- **Provisórias:** as 4 fotos de "Para quem atuamos" e a da vistoria saíram do próprio mockup,
  ampliadas por IA (Swin2SR 4x), porque as imagens das seções não vieram. As definitivas se
  geram no mesmo chat do mockup (`../080 - HS Sindicatura/prompt-imagens-secoes.md`), vão em
  `Recursos Site/SEÇÕES/` com o nome indicado lá, e o `npm run imagens` pega sozinho.
- O fundo da seção legal (biblioteca) só aparece quando `SEÇÕES/08 - FUNDO LEGAL` existir.
- **Páginas internas:** 8 fotos de banco de imagem livre (Unsplash e Pexels, uso comercial sem
  atribuição) em `Recursos Site/WEB/`, com os créditos em `creditos.md`. Todas recebem o mesmo
  tratamento de cor (menos saturação e um véu petróleo leve). Foto real com o mesmo nome em
  `Recursos Site/PÁGINAS/` passa na frente. O recorte de cada uma (foco e zoom) fica em
  `scripts/focos.json`: foi assim que os letreiros de loja da foto comercial saíram do quadro.
- O convite final das páginas internas usa as torres do hero recortadas deitadas no computador
  (`cta-faixa`), porque a faixa é baixa.
- **Antes e depois e jardim renovado:** fotos reais do condomínio (`Recursos Site/ANTES X
  DEPOIS/` e `JARDIM RENOVAD- CARROSEL/`), sem tratamento de cor, porque são a prova do
  serviço. As duas fotos de cada par não foram tiradas do mesmo ponto nem com o mesmo zoom:
  o `processar-imagens.mjs` recorta as duas no mesmo quadro 4:5, alinhadas por um ponto em
  comum (o canto do canteiro, a escada) e pela escala, que ficam em `antes-depois.json`. Par
  novo: achar o mesmo ponto nas duas fotos, medir a escala entre elas e conferir o print com
  a linha no meio. Do carrossel ficaram de fora a foto igual ao DEPOIS 1 e a do canteiro do
  gradil com a rua atrás (anotado no `jardim.json`).
- O relatório mensal da seção "Como reportamos" é HTML (tabela e gráfico em CSS), não imagem:
  por isso anima. O mês é sempre o último fechado, calculado no build.

## Decisões que não estão no mockup

- **Copy:** onde o mockup tem outro texto, vale o briefing (H1, subtítulo, bullets, títulos,
  texto completo do fundador, missão, visão e valores, perguntas do FAQ, 9 atribuições). O que
  o briefing não escreve (descrições dos cards, respostas do FAQ) veio do `prompt-mockup.md` e
  da apresentação comercial da HS. As descrições dos 3 pilares são do mockup, com o "Saúde"
  corrigido (o mockup repetia "mais seguros").
- **Seção 03:** no mockup os 5 cards dividem a linha com o título; em tamanho de leitura não
  cabem, então vão na largura toda, logo abaixo (como pede o prompt de execução).
- **Botão do FAQ:** verde no mockup; aqui é contorno petróleo (o briefing guarda o verde só pro
  WhatsApp flutuante).
- **Destaque dourado no claro:** o dourado puro no fundo gelo dá 2,5:1 e reprova; nos títulos
  das seções claras ele vai em #A7762B (3,7:1).
- **Hero no celular:** título, figura, subtítulo e botões (regra da casa). O cartão com o nome
  do Danilo fica no pé da figura.
- **Formulário:** abre o WhatsApp com os 6 dados já escritos (não há servidor de e-mail). Ele
  mora num `<template>` e entra na página quando o contato chega perto da tela: no HTML, o
  preenchimento automático do Chrome forçava um layout inteiro no carregamento.
- **Menu:** leva às páginas, e a atual fica acesa (`aria-current`, marcado no build). A Home
  ganhou três links discretos pras páginas novas (em Soluções, em Para quem atuamos e em
  Missão, visão e valores).
- **Páginas internas no celular:** o topo segue a regra da casa (título, foto, subtítulo e
  botões). Na página Contato o formulário fica no topo, com a escolha entre agendar o
  diagnóstico e pedir a proposta (`/contato?assunto=proposta` já chega com a proposta).
- **Antes e depois:** o comparador é o do 069 (Paraíso do Gesso): a foto de depois recortada
  por `clip-path` a partir de `--pos`, um range invisível pro teclado e o leitor de tela, e a
  dica 50, 42, 58, 50 na primeira vez. As fotos são em pé, então o palco é 4:5 e, no
  computador, os três ficam lado a lado; no tablet e no celular, abas e um palco só.
- **Jardim renovado:** carrossel contínuo, como pediu o cliente. Tem botão de pausa (WCAG
  2.2.2) e para no mouse; com "reduzir movimento" fica parado e rola de lado. O botão
  "Solicitar proposta" abre o WhatsApp dizendo que a pessoa viu o antes e depois.
- **URLs limpas:** `solucoes.html` é servido em `/solucoes` (`cleanUrls` na Vercel e no
  `serve.mjs`).

## Desempenho

- CSS e JS embutidos no HTML, fontes próprias recortadas no português (Montserrat 600 a 700,
  22 KB, pré-carregada; Inter 400 a 500, 24 KB), imagens em AVIF com WebP de reserva.
- A foto do fundo do hero é o LCP: é pedida no topo do `<head>` (preload com a mesma lista da
  `<picture>`); o sprite de ícones e o JSON-LD ficam no fim do `<body>`.
- O hexágono do hero é decorativo e só baixa depois do carregamento (`data-adiar`).
- As seções abaixo do hero usam `content-visibility: auto`, com a altura reservada medida (sem
  o padding). A seção do relatório fica de fora no computador, porque a folha invade a seção
  do fundador. O primeiro clique numa âncora desenha tudo e confere a posição no fim.
- Abertura do hero só com `transform` e `opacity`; o fio que se desenha em volta do hexágono
  (stroke) roda só no computador.
- Páginas internas: a foto do topo é o LCP (`data-preload`); ela não entra com opacidade, quem
  some é a cortina petróleo por cima. No celular a abertura para antes de ~1,3 s (Speed Index).
  As seções abaixo do topo também usam `content-visibility`, com as alturas medidas.
- Jardim renovado: só `transform`, a duração sai do comprimento da lista (32 px/s em qualquer
  tela) e a faixa para fora da tela. As fotos da faixa pedem `loading="lazy"`, mas viram
  `eager` quando a seção chega a 600 px: as que estão à direita, fora da faixa, o navegador só
  pediria quando entrassem, e apareceriam em branco.
- Página Contato: o formulário completo mora num `<template>` e entra logo depois da primeira
  pintura, com a altura reservada (no HTML, os campos dobravam o custo do primeiro layout).

A copy, os mockups e a memória do projeto ficam na pasta `sites/080 - HS Sindicatura/`.

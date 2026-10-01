# 080 HS Sindicatura

Site institucional da HS Sindicatura, sindicatura profissional e gestão condominial do Danilo
Ricardo Dias, com sede em São Paulo. HTML, CSS e JavaScript estáticos, montados por um
`build.mjs` em Node e servidos de `dist/`. Cinco páginas, como pedem o briefing final e o áudio
do Danilo (2026-09-30, "no máximo cinco páginas, menos texto e mais resultado"): Início, A HS,
Soluções, Cases e Contato.

A fonte de verdade é o briefing final (`../080 - HS Sindicatura/Recursos Site/ALTERAÇÕES/01/`),
que substituiu o primeiro briefing em 2026-10-01. A Home segue a estrutura dele em 9 blocos;
o sistema visual (paleta, fontes, hexágono, cartões, alternância de claro e escuro) é o dos
mockups aprovados (`Recursos Site/DESKTOP/` e `MOBILE/`).

Código: https://github.com/FelipeSitesRodrigues/080-hssindicatura

## Rodar

```bash
npm install          # só na primeira vez (sharp, puppeteer-core, cheerio, phosphor, lighthouse)
npm run build        # monta as cinco páginas em dist/
npm run serve        # http://localhost:3080 (ou dois cliques em ABRIR-SITE.bat)
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run build` | monta `dist/` a partir de `src/` e avisa o que está pendente |
| `npm run publicar` | o mesmo, do zero, apagando os previews (antes de subir) |
| `npm run serve` | servidor local na porta 3080, com gzip como a Vercel |
| `npm run testar` | as cinco páginas: larguras de 320 a 1920, abertura, animações no scroll, os gráficos do case terminando desenhados, menu, âncoras (índice, "Ver os números" e # vindo de outra página), antes e depois (mouse, dedo, teclado e abas), carrossel do jardim (anda, pausa, reduzir movimento), dúvidas, o formulário, todo WhatsApp, links entre páginas, imagens e console |
| `npm run lighthouse` | Lighthouse de celular e de computador da Home; `node scripts/lighthouse.mjs ambos todas` mede as cinco páginas (`METODO=devtools` pra limitação real) |
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
- Home, os 9 blocos do briefing final: `01-hero`, `02-quem` (frase e as 4 palavras-chave),
  `03-solucoes` (3 cartões com foto), `04-metodo`, `05-resultado` (case Sunset View com o
  gráfico), `06-filosofia`, `07-lideranca` (Danilo), `08-experiencia` (antes e depois e
  jardim, com o CSS e o JS em `08a-antes-depois` e `08b-jardim`) e `09-fim` (convite).
- Prefixos das internas: `20-topo` é o topo delas; `sob-`, `sol-`, `cas-` e `cto-` são de A
  HS, Soluções, Cases e Contato; `x-` são peças repetidas (convite final, como começa,
  dúvidas, texto do fundador, passos do método, peças do case). Um parcial pede o CSS de
  outro com `<!-- @usa nome -->` e recebe parâmetros (`<!-- @parcial x-cta titulo="..." -->`).
- `99-desempenho.css` guarda as alturas reservadas das seções.
- `src/dados/solucoes.json` gera os 3 cartões da Home, os 3 blocos da página Soluções (foto,
  o que é, o que resolve, como funciona, entregáveis, com o WhatsApp do próprio serviço), o
  índice e a lista do rodapé; `sunset-view.json` os indicadores e os dois gráficos do case
  (Home e Cases); `faq.json` o acordeão e o FAQPage da página Soluções; `antes-depois.json`
  os 3 pares do comparador e `jardim.json` as fotos do carrossel.
- `site.config.json` guarda contato, domínio e as mensagens de WhatsApp (a principal é a do
  briefing: "Olá, conheci a HS Sindicatura pelo site e gostaria de conversar sobre a gestão do
  meu condomínio."). O build lista as `pendencias` a cada execução.
- `dist/` vai versionado: a Vercel só serve a pasta, sem instalar nem buildar (`vercel.json`).
  Depois de mexer em `src/`, rodar `npm run publicar` e commitar.

## Imagens

- Hero: as torres na hora azul (fundo) e o hexágono do logo, sempre os arquivos do cliente. O
  símbolo do logo tinha uma franja vermelha e um acento solto: o `processar-imagens.mjs` limpa
  os dois toda vez.
- Danilo: a foto dele (`02 - IMAGEM DANILO.jpg`) no bloco Liderança e na página A HS.
- **As 3 soluções** (cartões da Home e blocos da página Soluções) e o topo das páginas
  Soluções e A HS: fotos de banco de imagem livre em `Recursos Site/WEB/` (créditos em
  `creditos.md`), com o mesmo tratamento de cor. Foto real com o nome do site em
  `Recursos Site/PÁGINAS/` passa na frente (`sol-implantacao`, `sol-gestao`, `sol-sindico`,
  `topo-solucoes`, `topo-sobre`). O briefing final pede foto real da operação (seção 5).
- **Case Sunset View**: a foto real do condomínio é opcional (`Recursos Site/CASES/sunset-view`).
  Sem ela, o topo da página Cases mostra a ficha do case; com ela, a foto entra em cima.
- **Antes e depois e jardim renovado:** fotos reais do condomínio (`Recursos Site/ANTES X
  DEPOIS/` e `JARDIM RENOVAD- CARROSEL/`), sem tratamento de cor, porque são a prova do
  serviço. As duas fotos de cada par não foram tiradas do mesmo ponto nem com o mesmo zoom:
  o `processar-imagens.mjs` recorta as duas no mesmo quadro 4:5, alinhadas por um ponto em
  comum e pela escala, que ficam em `antes-depois.json`.
- O convite final usa as torres do hero recortadas deitadas no computador (`cta-faixa`).

## Decisões

- **Briefing final (2026-10-01):** menos texto, mais imagem e mais evidência. Saíram da Home os
  desafios, os 4 públicos, os diferenciais, a base legal (art. 1.348), o relatório ilustrativo,
  as dúvidas e o formulário; saíram as páginas Para Condomínios e Para Administradoras; Sobre
  virou A HS (`/a-hs`). Conteúdo (artigos) entra quando houver artigo.
- **CTA:** "Agendar uma conversa" em todo lugar, levando à página Contato; o WhatsApp é o
  complementar. O formulário tem um pedido só (a escolha entre diagnóstico e proposta saiu).
- **Soluções na Home sem WhatsApp por cartão:** o briefing pede uma frase por cartão e um CTA
  só ("Conheça nossas soluções"). O WhatsApp de cada serviço (regra da casa) fica nos blocos
  da página Soluções.
- **Case Sunset View:** números da apresentação comercial da HS (slides 10 e 11). O saldo mês a
  mês e as despesas por categoria foram lidos dos gráficos (imagens) da apresentação. O briefing
  pede validação nos balancetes antes de publicar: está nas pendências.
- **Gráficos em HTML e SVG**, não imagem: a curva do saldo é uma cúbica monótona (não inventa
  vale nem pico); grade, pontos e rótulos são HTML em %, pra não distorcer. Uma tabela
  escondida (dentro de um `div.sr-only`: tabela ignora `width: 1px` e estourava a página no
  celular) leva os valores pro leitor de tela e pro Google.
- **Rodapé só com o símbolo:** o nome escrito ao lado saiu a pedido do Danilo (o símbolo já diz
  HS). No topo fica o símbolo e "SINDICATURA" digitado, porque o logo oficial escreve
  "SÍNDICATURA".
- **Destaque dourado no claro:** o dourado puro no gelo dá 2,5:1. Título grande e ícone usam
  #A7762B (3,7:1); texto pequeno (rótulo, número) usa #87601F (5,2:1).
- **Hero no celular:** título, hexágono, frase, botão e linha geográfica (regra da casa).
- **Formulário:** abre o WhatsApp com os dados já escritos (não há servidor de e-mail). Mora
  num `<template>` e entra logo depois da primeira pintura, com a altura reservada.
- **Antes e depois:** o comparador do 069 (Paraíso do Gesso). No computador os três lado a
  lado; no tablet e no celular, abas e um palco só.
- **Jardim renovado:** carrossel contínuo com botão de pausa (WCAG 2.2.2); com "reduzir
  movimento" fica parado e rola de lado (a faixa recebe foco pelo teclado).
- **URLs limpas:** `solucoes.html` é servido em `/solucoes` (`cleanUrls` na Vercel e no
  `serve.mjs`).

## Desempenho

- CSS e JS embutidos no HTML, fontes próprias recortadas no português (Montserrat 600 a 700,
  pré-carregada; Inter 400 a 500), imagens em AVIF com WebP de reserva.
- A foto do fundo do hero é o LCP: é pedida no topo do `<head>`; o sprite de ícones e o
  JSON-LD ficam no fim do `<body>`. O hexágono do hero só baixa depois do carregamento.
- As seções abaixo do topo usam `content-visibility: auto`, com a altura reservada medida (sem
  o padding). O primeiro clique numa âncora desenha tudo e confere a posição no fim.
- Animações só em `transform` e `opacity`; a curva do gráfico se revela por um retângulo de
  recorte que cresce em `transform`.
- Lighthouse local (2026-10-01, CPU normal): 100 em desempenho, acessibilidade, boas práticas e
  SEO nas cinco páginas, no celular e no computador.

A memória do projeto, o briefing e os mockups ficam na pasta `sites/080 - HS Sindicatura/`.

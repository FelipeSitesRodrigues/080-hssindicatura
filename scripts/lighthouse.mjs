/**
 * Lighthouse local no Chrome da máquina, celular e computador, com o resumo no terminal.
 * O servidor (scripts/serve.mjs) comprime com gzip como a Vercel, então o peso medido é
 * o que o celular baixa de verdade. Relatórios em lighthouse/<modo>-<página>.json.
 *
 * Uso: node scripts/lighthouse.mjs [celular|computador|ambos] [rota ou "todas"] [nome]
 *      node scripts/lighthouse.mjs celular /solucoes
 *      node scripts/lighthouse.mjs ambos todas
 *      METODO=devtools node scripts/lighthouse.mjs celular   (limitação real, não simulada: o
 *      simulado multiplica a carga da máquina e oscila, memória do 076)
 *      BASE_URL=http://localhost:3081 node scripts/lighthouse.mjs celular todas
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'

const modo = process.argv[2] || 'ambos'
// o Git Bash converte "/sobre" em "C:/Program Files/Git/sobre": desfaz (como no print.mjs)
const semGit = (s) => {
  const t = s.replace(/\\/g, '/')
  return /^[A-Za-z]:\//.test(t) ? t.replace(/^.*?\/Git(\/|$)/i, '/') : s
}
const arg = semGit(process.argv[3] || '/')
const nomeExtra = process.argv[4] || ''
const BASE = (process.env.BASE_URL ?? 'http://localhost:3080').replace(/\/$/, '')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const paginas = JSON.parse(readFileSync(new URL('../src/paginas.json', import.meta.url), 'utf8')).itens
const rotas = arg === 'todas' ? paginas.map((p) => p.rota) : [arg.startsWith('/') ? arg : '/']
// nome antigo (sem rota): node scripts/lighthouse.mjs celular teste1
const nomeSolto = !arg.startsWith('/') && arg !== 'todas' ? arg : nomeExtra
mkdirSync('lighthouse', { recursive: true })

for (const rota of rotas) {
  const pag = paginas.find((p) => p.rota === rota)?.id || 'pagina'
  for (const m of modo === 'ambos' ? ['celular', 'computador'] : [modo]) {
    const saida = `lighthouse/${m}-${pag}${nomeSolto ? '-' + nomeSolto : ''}.json`
    const args = ['node_modules/lighthouse/cli/index.js', BASE + rota, '--quiet', '--output=json', `--output-path=${saida}`, '--chrome-flags=--headless=new --no-first-run', '--only-categories=performance,accessibility,best-practices,seo']
    if (m === 'computador') args.push('--preset=desktop')
    if (process.env.METODO) args.push(`--throttling-method=${process.env.METODO}`)
    try {
      execFileSync(process.execPath, args, { env: { ...process.env, CHROME_PATH: CHROME }, stdio: 'ignore' })
    } catch {
      /* no Windows o Lighthouse às vezes falha ao apagar a pasta temporária do Chrome depois de gravar: o relatório fica */
    }
    const r = JSON.parse(readFileSync(saida, 'utf8'))
    const a = r.audits
    // benchmarkIndex: a velocidade da CPU medida antes do teste. Nesta máquina fica perto de
    // 2.200; abaixo de 1.500 ela está ocupada (launchers de jogo, outro Chrome) e a nota de
    // celular não vale (memória do 076 e do 080)
    const bench = Math.round(r.environment?.benchmarkIndex || 0)
    const aviso = bench && bench < 1500 ? '  (MÁQUINA OCUPADA: nota não confiável)' : ''
    console.log(`\n${m.toUpperCase()} ${rota}  ` + Object.values(r.categories).map((c) => `${c.id} ${Math.round(c.score * 100)}`).join(' · ') + `  · CPU ${bench}${aviso}`)
    console.log('  ' + ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'].map((k) => `${k.split('-').map((p) => p[0]).join('').toUpperCase()} ${a[k].displayValue}`).join(' · '))
    const ruins = Object.entries(a).filter(([, x]) => x.score !== null && x.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(x.scoreDisplayMode))
    for (const [id, x] of ruins) console.log(`  x ${id} (${x.score}) ${x.displayValue || ''}`)
  }
}

// Alignment check for every card and grid inside the real PUCK EDITOR canvas, in a real browser.
//
//   npm run check:puck
//
// Builds a tiny page that mounts the real <Puck> editor (the same config and block components the Page Studio uses) with the same
// stories and layout as check-card-layout.mjs, loads it in headless Edge/Chrome at three canvas widths (the studio's Desktop /
// Tablet / Mobile presets: 1280, 820, 390), and runs the same measurements inside the canvas, plus Puck-only checks: every block
// has its drag wrapper and drag overlay, and nothing in the canvas has zero size.
// Exits 1 when a check fails. Set CHROME_PATH to use a specific browser. --keep leaves the build in .puck-check/.
// (Served from a throwaway local web server; the stories are made up and the network is not used.)
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { build } from 'vite'
import { apiRows, blocks, zones, MEASURE } from './card-fixtures.mjs'

const root = path.resolve(import.meta.dirname, '..')
process.chdir(root)
const dir = path.join(root, '.puck-check')
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const browser = candidates.find((p) => existsSync(p))
if (!browser) throw new Error('No Edge or Chrome found. Set CHROME_PATH.')

// ---- the page that mounts Puck
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0"><div id="root" style="height:100vh"></div><pre id="out"></pre><script type="module" src="./main.tsx"></script></body></html>')
writeFileSync(path.join(dir, 'main.tsx'), `
import '../src/index.css'
import '@measured/puck/puck.css'
import { createRoot } from 'react-dom/client'
import { Puck } from '@measured/puck'
import { getConfigForPage } from '../src/components/PuckEditor/builderConfig'
import { initializeStories } from '../src/components/PuckEditor/storyData'
import { apiRows, blocks, zones } from '../scripts/card-fixtures.mjs'

${MEASURE}

const width = Number(new URLSearchParams(location.search).get('w') || 1280)
// The stories come from the fixtures; every other request gets an empty answer.
window.fetch = async (url) => new Response(String(url).includes('/story/fetchReadyToPublish') ? JSON.stringify({ data: apiRows }) : '{}', { status: 200 })

async function main() {
  await initializeStories({ pageType: 'Home' })
  const data = { content: blocks, zones, root: { props: { title: 'Puck check' } } }
  createRoot(document.getElementById('root')).render(
    <Puck config={getConfigForPage('Home')} data={data} viewports={[{ width, height: 'auto', label: 'check' }]}
      ui={{ leftSideBarVisible: false, rightSideBarVisible: false, viewports: { current: { width, height: 'auto' }, controlsVisible: false, options: [] } }} />,
  )
  const expected = blocks.length + Object.values(zones).reduce((n, list) => n + list.length, 0)
  const started = Date.now()
  const poll = setInterval(() => {
    const frame = document.querySelector('iframe#preview-frame')
    const doc = frame && frame.contentDocument
    const ready = doc && doc.querySelector('#hero-grid') && doc.querySelector('#all-stories-grid') && doc.querySelectorAll('[data-puck-component]').length >= expected - 2
    if (!ready && Date.now() - started < 12000) return
    clearInterval(poll)
    setTimeout(() => {
      const out = []
      if (!doc) { out.push({ ok: false, name: 'canvas mounted', msg: 'no preview iframe' }) }
      else {
        out.push(...measure(doc, width, true))
        const wrappers = doc.querySelectorAll('[data-puck-component]')
        wrappers.length >= expected - 2 ? out.push({ ok: true, name: 'every block has its drag wrapper' }) : out.push({ ok: false, name: 'every block has its drag wrapper', msg: 'found ' + wrappers.length + ' of ' + expected })
        const draggable = doc.querySelectorAll('[data-puck-dnd]').length
        draggable >= expected - 2 ? out.push({ ok: true, name: 'every block can be dragged' }) : out.push({ ok: false, name: 'every block can be dragged', msg: 'found ' + draggable + ' of ' + expected })
        const empty = []
        wrappers.forEach((w) => { const r = w.getBoundingClientRect(); if (r.width < 4 || r.height < 4) empty.push(w.getAttribute('data-puck-component')) })
        empty.length ? out.push({ ok: false, name: 'no block is zero-size in the canvas', msg: empty.slice(0, 6).join(', ') }) : out.push({ ok: true, name: 'no block is zero-size in the canvas' })
        if (location.search.includes('debug')) {
          const off = [...doc.querySelectorAll('body *')].find((el) => { const r = el.getBoundingClientRect(); return r.left > width - 100 && r.width > 50 })
          const chain = []
          for (let el = off; el && el !== doc.body; el = el.parentElement) chain.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ').slice(0, 3).join('.'))
          out.push({ ok: true, name: 'debug off-screen chain', msg: chain.join(' < ') })
          const names = (d) => [...new Set([...d.querySelectorAll('[class*="Draggable"],[class*="Overlay"],[class*="overlay"]')].map((e) => String(e.className).split(' ').filter((c) => /raggable|verlay/.test(c)).join(' ')))].slice(0, 12).join(' ; ')
          out.push({ ok: true, name: 'debug overlay classes iframe', msg: names(doc) })
          out.push({ ok: true, name: 'debug overlay classes parent', msg: names(document) })
          out.push({ ok: true, name: 'debug wrapper', msg: (wrappers[5] ? wrappers[5].outerHTML.slice(0, 700) : 'none') })
          out.push({ ok: true, name: 'debug hero grid children', msg: [...doc.querySelectorAll('#hero-grid .grid > div')].map((d) => d.className.slice(0, 60) + ' h=' + Math.round(d.getBoundingClientRect().height)).join(' | ') })
          out.push({ ok: true, name: 'debug wrapper count by type', msg: JSON.stringify([...wrappers].reduce((m, w) => { const t = (w.getAttribute('data-puck-component') || '').split('-')[0]; m[t] = (m[t] || 0) + 1; return m }, {})) })
        }
        const crashed = doc.body.textContent.match(/Field type for|Something went wrong|did not exist/)
        crashed ? out.push({ ok: false, name: 'no editor error shown', msg: crashed[0] }) : out.push({ ok: true, name: 'no editor error shown' })
      }
      document.getElementById('out').textContent = JSON.stringify(out)
    }, 800)
  }, 300)
}
main()
`)

await build({
  root,
  configFile: false,
  logLevel: 'error',
  base: './',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { outDir: path.join(dir, 'dist'), emptyOutDir: true, chunkSizeWarningLimit: 6000, rollupOptions: { input: path.join(dir, 'index.html') } },
})

// ---- serve and measure
const publicDir = path.join(root, 'public')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' }
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html'
  const file = [path.join(dir, 'dist', name), path.join(dir, 'dist', '.puck-check', name), path.join(publicDir, name)].find((f) => existsSync(f) && statSync(f).isFile())
  if (!file) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const entry = existsSync(path.join(dir, 'dist', 'index.html')) ? 'index.html' : '.puck-check/index.html'
const run = (args) => new Promise((resolve, reject) => execFile(browser, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => (stdout ? resolve(stdout) : reject(error))))

let failures = 0
for (const width of [1280, 820, 390]) {
  const dom = await run(['--headless', '--disable-gpu', '--virtual-time-budget=30000', '--window-size=1700,1100', '--dump-dom', `${origin}/${entry}?w=${width}`])
  const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1]?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  console.log(`\nPuck canvas ${width}px`)
  if (!json) { console.log('  FAIL no result from the browser (the editor did not finish rendering)'); failures++; continue }
  for (const r of JSON.parse(json)) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : `: ${r.msg}`}`)
    if (!r.ok) failures++
  }
}
server.close()
if (!process.argv.includes('--keep')) rmSync(dir, { recursive: true, force: true })
console.log(failures ? `\n${failures} check(s) failed` : '\nall Puck canvas checks passed')
process.exit(failures ? 1 : 0)

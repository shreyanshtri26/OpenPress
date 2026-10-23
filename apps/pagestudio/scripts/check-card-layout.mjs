// Alignment check for every card and grid on the PUBLISHED page, in a real browser.
//
//   npm run check:layout          (builds the publish renderer first)
//
// Renders a page with every layout grid (hero, latest, ranked list, multimedia, all stories, advertisement grid) and every card
// placed straight on the page, with stories that have long headlines and no image, then loads it in headless Edge/Chrome at
// 1440, 1024, 768 and 390 px wide and measures what a reader would see (see MEASURE in card-fixtures.mjs): nothing outside the
// viewport, every image loaded, no headline spilling out, no placeholder text, and the grid alignment checks.
// The same fixtures and measurements run against the Puck editor canvas in check-puck-canvas.mjs.
// Exits 1 when a check fails. Set CHROME_PATH to use a specific browser. --keep leaves the generated pages in .card-check/.
// (The pages are served from a throwaway local web server; nothing leaves the machine.)
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { apiRows, blocks, zones, MEASURE } from './card-fixtures.mjs'

const here = import.meta.dirname
const bundle = path.resolve(here, '../dist/publish-renderer.js')
if (!existsSync(bundle)) throw new Error('Build the renderer first: npm run build:publish-renderer')
const { renderHomePage, buildStoriesById } = await import(pathToFileURL(bundle).href)

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

const { html } = renderHomePage({ content: blocks, zones, root: { props: { title: 'Card check' } } }, { storiesById: buildStoriesById(apiRows), sections: ['News', 'Business', 'Sports'], campaigns: [] })

const dir = path.resolve(here, '../.card-check')
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
const script = `<script>${MEASURE}\nwindow.addEventListener('load', function () { setTimeout(function () { parent.postMessage({ cardcheck: measure(document, window.innerWidth) }, '*') }, 400) })</script>`
writeFileSync(path.join(dir, 'page.html'), html.replace('</body>', `${script}</body>`))

// Serve the generated pages plus the site's own public files, so root-absolute images (/openpress-share.png ...) load as they do live.
const publicDir = path.resolve(here, '../public')
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' }
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '')
  const file = [path.join(dir, name), path.join(publicDir, name)].find((f) => existsSync(f) && statSync(f).isFile())
  if (!file) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const run = (args) => new Promise((resolve, reject) => execFile(browser, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => (stdout ? resolve(stdout) : reject(error))))

let failures = 0
for (const width of [1440, 1024, 768, 390]) {
  const wrapper = `<!doctype html><body style="margin:0"><iframe src="page.html" style="border:0;width:${width}px;height:7000px"></iframe><pre id="out"></pre><script>addEventListener('message', function (e) { if (e.data && e.data.cardcheck) document.getElementById('out').textContent = JSON.stringify(e.data.cardcheck) })</script></body>`
  writeFileSync(path.join(dir, `wrap-${width}.html`), wrapper)
  const dom = await run(['--headless', '--disable-gpu', '--virtual-time-budget=9000', `--window-size=${Math.max(width + 40, 540)},1000`, '--dump-dom', `${origin}/wrap-${width}.html`])
  const json = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1]?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  if (!json) { console.log(`\n${width}px  no result from the browser`); failures++; continue }
  console.log(`\n${width}px`)
  for (const r of JSON.parse(json)) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : `: ${r.msg}`}`)
    if (!r.ok) failures++
  }
}
server.close()
if (!process.argv.includes('--keep')) rmSync(dir, { recursive: true, force: true })
console.log(failures ? `\n${failures} check(s) failed` : '\nall published-page layout checks passed')
process.exit(failures ? 1 : 0)

// Audits the production build (never the dev server, whose unbundled modules
// distort every metric) with Lighthouse in mobile mode and prints the scores.
// Usage: pnpm web lighthouse [label]   (reports go to lighthouse-reports/)
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const port = 4173
const origin = `http://localhost:${port}`
const routes = ['/login', '/cadastro']
const label = process.argv[2] ?? 'report'
const outDir = 'lighthouse-reports'

mkdirSync(outDir, { recursive: true })

const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--port', `${port}`, '--strictPort'], {
  shell: true,
  stdio: 'ignore',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(origin)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await sleep(500)
  }
  throw new Error(`Preview server did not start on ${origin}`)
}

function stopPreview() {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', `${preview.pid}`, '/T', '/F'], { stdio: 'ignore' })
  } else {
    preview.kill()
  }
}

try {
  await waitForServer()

  for (const route of routes) {
    const base = `${outDir}/${label}${route.replace('/', '-')}`
    const result = spawnSync(
      'pnpm',
      [
        'exec',
        'lighthouse',
        `${origin}${route}`,
        '--form-factor=mobile',
        '--output=json',
        '--output=html',
        `--output-path=${base}`,
        '--chrome-flags="--headless=new --disable-extensions"',
        '--quiet',
      ],
      { shell: true, stdio: 'inherit' },
    )
    if (result.status !== 0) throw new Error(`Lighthouse failed for ${route}`)

    const report = JSON.parse(readFileSync(`${base}.report.json`, 'utf8'))
    const scores = Object.entries(report.categories)
      .map(([id, category]) => `${id} ${Math.round(category.score * 100)}`)
      .join(' | ')
    console.log(`\n${route}: ${scores}`)
    for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']) {
      console.log(`  ${id}: ${report.audits[id].displayValue}`)
    }
  }
} finally {
  stopPreview()
}

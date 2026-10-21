import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const routes = ['api/organization/branding/route', 'api/orders/[id]/document/route']
let failed = false
for (const route of routes) {
  const filename = path.resolve('.next/server/app', `${route}.js.nft.json`)
  if (!existsSync(filename)) { console.error(`Missing production trace for ${route}; run npm run build first.`); failed = true; continue }
  const trace = JSON.parse(readFileSync(filename, 'utf8'))
  const libraries = trace.files.filter(file => /sharp-libvips-[^/]+\/lib\/.*(?:\.dylib|\.so(?:\.\d+)*)$/.test(file))
  if (libraries.length === 0 || libraries.some(file => !existsSync(path.resolve(path.dirname(filename), file)))) {
    console.error(`${route}: libvips shared library is missing from the production bundle.`)
    failed = true
  } else console.log(`${route}: native image libraries included.`)
  if (route.includes('/document/') && !trace.files.some(file => file.endsWith('assets/fonts/NotoSans-Regular.ttf'))) {
    console.error(`${route}: Unicode font is missing from the production bundle.`)
    failed = true
  }
}
process.exitCode = failed ? 1 : 0

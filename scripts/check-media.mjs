#!/usr/bin/env node
// Fails if the site references an image that is not on disk.
//
// The migration re-encodes and renames the library (Offgrid-7.png became
// Offgrid-7.jpg). A stale reference does not throw — next/image returns 400 and
// the page renders a blank column, which is exactly how the homepage hero
// silently disappeared. This turns that into a build failure.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC = path.join(ROOT, 'site', 'public')

const sources = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(tsx?|jsx?|json)$/.test(e.name)) sources.push(p)
  }
}
walk(path.join(ROOT, 'site', 'src'))

const missing = new Map()
for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/["'`](\/(?:media|downloads|brand)\/[A-Za-z0-9._@-]+)["'`]/g)) {
    const ref = m[1]
    if (!fs.existsSync(path.join(PUBLIC, ref))) {
      if (!missing.has(ref)) missing.set(ref, new Set())
      missing.get(ref).add(path.relative(ROOT, file))
    }
  }
}

if (!missing.size) {
  console.log('media check: every referenced asset exists')
  process.exit(0)
}

console.error('\nmedia check FAILED — referenced assets that do not exist:\n')
for (const [ref, files] of missing) {
  console.error(`  ${ref}`)
  for (const f of files) console.error(`      ${f}`)
}
console.error('\nRun `npm run migrate` to rebuild the library, or update the reference.\n')
process.exit(1)

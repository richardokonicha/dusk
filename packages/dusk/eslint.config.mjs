import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tseslint from '@electron-toolkit/eslint-config-ts'
import eslint from '@eslint/js'
import eslintReact from '@eslint-react/eslint-plugin'
import { defineConfig } from 'eslint/config'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import importZod from 'eslint-plugin-import-zod'
import oxlint from 'eslint-plugin-oxlint'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// --- renderer dependency-direction boundary gate (import-x/no-restricted-paths) ---
const RENDERER_DIRNAME = path.dirname(fileURLToPath(import.meta.url))
const PAGE_DOMAINS = fs
  .readdirSync(path.join(RENDERER_DIRNAME, 'src/renderer/pages'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

// A page must not import a sibling page domain; its own subtree is allowed via `except` (resolved relative to `from`).
const pageSiblingZones = PAGE_DOMAINS.map((p) => ({
  target: `src/renderer/pages/${p}`,
  from: 'src/renderer/pages',
  except: [`./${p}`],
  message: 'A page must not import another page (cross-page coupling). architecture/renderer.md §7.'
}))

// Topic barrels under services/: a services/<topic>/ exposes exactly one curated index.ts as its sole
// external entry (architecture/renderer.md §3.1/§5). Auto-discovered from the filesystem so a new topic dir
// needs zero rule edits — mirrors pageSiblingZones above. A topic's own subtree is excluded from `target`
// (extglob negation), so internal `./sibling` imports stay legal while every outside importer is limited to
// the barrel. Applied in every renderer importer region via blocks L/P/B below.
const SERVICES_DIR = path.join(RENDERER_DIRNAME, 'src/renderer/services')
const serviceTopics = fs
  .readdirSync(SERVICES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '__tests__' && d.name !== '__mocks__')
  .filter((d) => fs.existsSync(path.join(SERVICES_DIR, d.name, 'index.ts')))
  .map((d) => d.name)

const serviceBarrelZones = serviceTopics.map((topic) => ({
  target: [
    `src/renderer/!(services)/**/*`, // importers outside services/ entirely
    `src/renderer/services/!(${topic})/**/*`, // sibling topic dirs
    `src/renderer/services/*` // flat files at the services/ root
  ],
  from: [
    `src/renderer/services/${topic}/!(index).{ts,tsx,js,jsx}`,
    `src/renderer/services/${topic}/!(index)/**/*`
  ],
  message: `services/${topic}/ is a topic barrel — import @renderer/services/${topic} (its index.ts), not its internals. architecture/renderer.md §3.1/§5.`
}))

// Each block's `files` is scoped so the three no-restricted-paths instances (L/P/B) never both apply to one
// file — flat config merges rules by key (last-wins), which would otherwise drop one block silently.
const SHARED_BUCKET_FILES = [
  'src/renderer/components/**/*.{ts,tsx,js,jsx}',
  'src/renderer/hooks/**/*.{ts,tsx,js,jsx}',
  'src/renderer/services/**/*.{ts,tsx,js,jsx}',
  'src/renderer/utils/**/*.{ts,tsx,js,jsx}'
]
const PAGE_FILES = ['src/renderer/pages/**/*.{ts,tsx,js,jsx}']
const RENDERER_IGNORES = ['src/renderer/**/*.test.*', 'src/renderer/**/__tests__/**', 'src/renderer/**/__mocks__/**']
const boundarySettings = {
  'import-x/resolver-next': [
    createTypeScriptImportResolver({ project: path.join(RENDERER_DIRNAME, 'tsconfig.web.json'), alwaysTryTypes: true })
  ]
}
// Two independent gates: block1 (layer edges) is enforced as error — Stage 1 cleared it; block2 (sibling pages) stays warn until features-ization.
const RENDERER_BOUNDARY = 'error'
const PAGE_SIBLING = process.env.RENDERER_PAGE_SIBLING_ERROR ? 'error' : 'warn'

// --- import bans (@typescript-eslint/no-restricted-imports) ---
// Flat config replaces a rule wholesale rather than merging it, so every ban that
// applies to the same files must live in ONE `patterns` array under ONE rule name.
// To add a ban: define it here and list it in the scope block(s) below — never reach
// for a second rule name (e.g. the base `no-restricted-imports`) to dodge the override.
// To exempt a single sanctioned call site, put an eslint-disable comment on its import.
const BAN_RENDERER_FROM_MAIN = {
  group: ['@renderer', '@renderer/**', '**/renderer/**'],
  message:
    'Main/preload must not import renderer code. Use `@shared` for cross-process types, or `src/main` for main-only types. See docs/references/architecture/shared-layer.md.'
}
// Only reaches src/main + src/preload (below). `tests/**` is globally ignored by this
// config, so the out-of-src harness is not covered — it goes through applyMigrations by
// convention, not by enforcement.
const BAN_DRIZZLE_MIGRATOR = {
  group: ['drizzle-orm/*/migrator'],
  message:
    "Do not call drizzle's migrate() directly — its transaction makes drizzle-kit's `PRAGMA foreign_keys=OFF` a no-op, so any table-recreate migration silently cascades child rows away. Use applyMigrations() from @data/db/applyMigrations."
}

// --- barrel / module-boundary rules (naming-conventions.md §6.4) ---
// An inline custom plugin (like the `lifecycle` plugin below), not no-restricted-paths:
// full-src barrel closure needs a private boundary per directory at arbitrary depth, which
// no-restricted-paths cannot express without per-level target globs. Barrel discovery reuses
// the same "pure re-export index.ts" classifier the audit validated. All rules are `warn`.
const SRC_DIR = path.join(RENDERER_DIRNAME, 'src')
const BARREL_BUCKET_ROOT_RE = /[\\/]src[\\/](?:main|renderer|shared)[\\/](?:types|utils|services)[\\/]index\.tsx?$/

const stripCodeComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const isPureReexportIndex = (content) => {
  if (!/\bexport\b[^;]*?\bfrom[ \t]*['"]/.test(content)) return false
  const rest = stripCodeComments(content)
    .replace(/(?:^|\n)[ \t]*(?:import|export)\b[^;]*?from[ \t]*['"][^'"]+['"];?/g, '\n')
    .replace(/(?:^|\n)[ \t]*import[ \t]*['"][^'"]+['"];?/g, '\n')
  return !/\bexport\b/.test(rest)
}
const collectIndexTs = (dir, out = []) => {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name === '__mocks__') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) collectIndexTs(p, out)
    else if (e.name === 'index.ts') out.push(p)
  }
  return out
}
const BARREL_DIRS = new Set()
for (const idx of collectIndexTs(SRC_DIR)) {
  try {
    if (isPureReexportIndex(fs.readFileSync(idx, 'utf8'))) BARREL_DIRS.add(path.dirname(idx))
  } catch {}
}
const BARREL_DIRS_DEEPEST_FIRST = [...BARREL_DIRS].sort((a, b) => b.length - a.length)
const innermostBarrelDir = (file) => {
  for (const d of BARREL_DIRS_DEEPEST_FIRST) if (file === d || file.startsWith(d + path.sep)) return d
  return null
}
// The boundary a reference crosses is the OUTERMOST barrel dir containing the target but not
// the importer — the innermost would let `A/B` (an inner barrel's index) bypass A's door when
// barrels are nested.
const BARREL_DIRS_SHALLOWEST_FIRST = [...BARREL_DIRS_DEEPEST_FIRST].reverse()
const outermostCrossedBarrelDir = (tgt, from) => {
  for (const d of BARREL_DIRS_SHALLOWEST_FIRST)
    if (tgt.startsWith(d + path.sep) && from !== d && !from.startsWith(d + path.sep)) return d
  return null
}
const BARREL_RESOLVE_CACHE = new Map()
// Unresolved specs are skipped — misses only, never false positives. Deliberately unresolved:
// `@logger` (single-file target, cannot hide a deep import), `@application` (bare-only usage,
// zero `@application/` deep paths in src), `@test-helpers`/`@test-mocks` (tests are exempt),
// `@dusk/*` (packages/*, outside src).
const resolveBarrelSpec = (spec, fromFile) => {
  const key = `${fromFile}\0${spec}`
  if (BARREL_RESOLVE_CACHE.has(key)) return BARREL_RESOLVE_CACHE.get(key)
  const proc = fromFile.includes(`${path.sep}src${path.sep}main${path.sep}`) ? 'main' : 'renderer'
  let base = null
  if (spec.startsWith('./') || spec.startsWith('../')) base = path.resolve(path.dirname(fromFile), spec)
  else if (spec.startsWith('@renderer/')) base = path.join(SRC_DIR, 'renderer', spec.slice(10))
  else if (spec.startsWith('@main/')) base = path.join(SRC_DIR, 'main', spec.slice(6))
  else if (spec.startsWith('@shared/')) base = path.join(SRC_DIR, 'shared', spec.slice(8))
  else if (spec.startsWith('@data/')) base = path.join(SRC_DIR, proc === 'main' ? 'main' : 'renderer', 'data', spec.slice(6))
  let resolved = null
  if (base) {
    for (const c of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'), base]) {
      try {
        if (fs.statSync(c).isFile()) {
          resolved = c
          break
        }
      } catch {}
    }
  }
  BARREL_RESOLVE_CACHE.set(key, resolved)
  return resolved
}
const barrelFilename = (ctx) => ctx.filename ?? ctx.getFilename()

const barrelPlugin = {
  rules: {
    // 1a — no `export *`; barrels use explicit named re-exports.
    'no-export-star': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        return {
          ExportAllDeclaration(node) {
            if (node.source) ctx.report({ node, message: 'No `export *` — use explicit named re-exports (naming-conventions.md §6.4 rule 1).' })
          }
        }
      }
    },
    // 1b — an index.ts barrel is pure re-export: no default impl, no local declarations/bindings,
    // no side-effect imports, no top-level logic.
    'index-no-impl': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        const f = barrelFilename(ctx)
        if (!/[\\/]index\.ts$/.test(f)) return {}
        return {
          Program(node) {
            const stmt = node.body.find((s) => !/^(?:Import|Export)/.test(s.type))
            if (stmt) ctx.report({ node: stmt, message: 'A barrel is pure re-export — no top-level statements; move logic to a named file (naming-conventions.md §6.4 rule 1).' })
          },
          ImportDeclaration(node) {
            if (!node.specifiers.length)
              ctx.report({ node, message: 'A barrel is pure re-export — no side-effect imports; registration belongs in a named module (naming-conventions.md §6.4 rule 1).' })
          },
          ExportDefaultDeclaration(node) {
            ctx.report({ node, message: 'A barrel is pure re-export — no `export default` implementation; use a named file (naming-conventions.md §6.4).' })
          },
          ExportNamedDeclaration(node) {
            if (node.declaration)
              ctx.report({ node, message: 'A barrel is pure re-export — no local declarations; move implementation to a named file (naming-conventions.md §6.4).' })
            else if (!node.source && node.specifiers.length)
              ctx.report({ node, message: 'A barrel re-exports from other modules — it must not export local bindings (naming-conventions.md §6.4).' })
          }
        }
      }
    },
    // 1c — no `index.tsx` anywhere: a barrel is `index.ts` (no JSX), a component uses a named
    // file, and a TanStack index route uses the flat dot form (`<segment>.index.tsx`).
    'no-index-tsx': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        const f = barrelFilename(ctx)
        if (!/[\\/]index\.tsx$/.test(f)) return {}
        return {
          Program(node) {
            ctx.report({ node, message: 'No `index.tsx` — a barrel is `index.ts` (re-export has no JSX); a component uses a named file; a TanStack index route uses the flat dot form `<segment>.index.tsx` (naming-conventions.md §6.4).' })
          }
        }
      }
    },
    // 1d — a barrel exposes named exports, not a forwarded bare default.
    'named-only': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        const f = barrelFilename(ctx)
        if (!/[\\/]index\.tsx?$/.test(f)) return {}
        return {
          ExportNamedDeclaration(node) {
            if (!node.source) return
            for (const s of node.specifiers)
              if (s.exported && s.exported.name === 'default')
                ctx.report({ node: s, message: 'A barrel exposes named exports — name it (`export { default as Foo } from`), do not forward a bare default (naming-conventions.md §6.4 rule 1).' })
          }
        }
      }
    },
    // 2 — closed boundary: outside code must import a barrel's index, never its internals.
    'closed': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        const f = barrelFilename(ctx)
        const check = (node, spec) => {
          const tgt = resolveBarrelSpec(spec, f)
          if (!tgt) return
          const d = outermostCrossedBarrelDir(tgt, f)
          if (!d || tgt === path.join(d, 'index.ts')) return
          ctx.report({ node, message: `Deep import into barrel \`${path.relative(SRC_DIR, d)}\` — import its index, not its internals (naming-conventions.md §6.4 rule 2).` })
        }
        return {
          ImportDeclaration(node) {
            if (node.source) check(node, node.source.value)
          },
          ExportNamedDeclaration(node) {
            if (node.source) check(node, node.source.value)
          },
          ExportAllDeclaration(node) {
            if (node.source) check(node, node.source.value)
          },
          ImportExpression(node) {
            if (node.source && node.source.type === 'Literal') check(node, node.source.value)
          }
        }
      }
    },
    // 3a — no nesting: a barrel index must not re-export another barrel.
    'no-nesting': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        const f = barrelFilename(ctx)
        if (!/[\\/]index\.ts$/.test(f) || !BARREL_DIRS.has(path.dirname(f))) return {}
        const db = path.dirname(f)
        const check = (node, spec) => {
          const tgt = resolveBarrelSpec(spec, f)
          if (!tgt) return
          const d2 = innermostBarrelDir(tgt)
          if (!d2 || d2 === db) return
          ctx.report({ node, message: `A barrel must not re-export another barrel \`${path.relative(SRC_DIR, d2)}\` — let each unit own its door (naming-conventions.md §6.4 rule 3).` })
        }
        return {
          ExportNamedDeclaration(node) {
            if (node.source) check(node, node.source.value)
          },
          ExportAllDeclaration(node) {
            if (node.source) check(node, node.source.value)
          },
          ImportDeclaration(node) {
            if (node.source) check(node, node.source.value)
          }
        }
      }
    },
    // 3b — bucket roots (types/utils/services) carry no barrel.
    'no-bucket-root': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        if (!BARREL_BUCKET_ROOT_RE.test(barrelFilename(ctx))) return {}
        return {
          Program(node) {
            ctx.report({ node, message: 'Bucket roots (types/utils/services) carry no barrel — import the specific file/topic (naming-conventions.md §6.4 rule 3 / §4.8).' })
          }
        }
      }
    }
  }
}

// --- directory & file naming rules (naming-conventions.md §3–§4, §6.6) ---
// Inline custom plugin (like `barrel` above). ESLint is per-file, so a directory name is checked by
// deriving each ancestor segment from the linted file's path (a dir with no linted file is thus
// invisible — acceptable: every code dir has a .ts/.tsx). Only zones where path → role is
// deterministic are enforced; the semantic splits left to review are bucket-vs-domain plural/singular
// (§4.9) and class-file PascalCase vs function-file camelCase (§3.2). Acronym-internal casing (§6.1)
// is also out of scope here.
const isKebabName = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)
const isCamelName = (s) => /^[a-z][a-zA-Z0-9]*$/.test(s)
const isPascalName = (s) => /^[A-Z][a-zA-Z0-9]*$/.test(s)
const isRouteToken = (s) => s.startsWith('$') || s.startsWith('_') // $appId, $, __root, _pathless
const isModuleFileStem = (s) => {
  const b = s.replace(/^_+/, '') // _columnHelpers.ts: leading-underscore shared construct (§3.2)
  return isCamelName(b) || isPascalName(b)
}
const NAMING_EXEMPT_DIRS = new Set(['__tests__', '__mocks__', '__snapshots__'])
// First matching prefix wins; unmanaged zones bail before the generic renderer/src zones.
const NAMING_ZONES = [
  { prefix: 'packages/ui/', root: 2, label: 'packages/ui', dir: isKebabName, dirExpect: 'kebab-case', file: isKebabName, fileExpect: 'kebab-case' },
  { prefix: 'src/renderer/routes/', root: 3, label: 'routes', dir: (s) => isKebabName(s) || isRouteToken(s), dirExpect: 'kebab-case', file: (s) => isKebabName(s) || isRouteToken(s), fileExpect: 'kebab-case' },
  { prefix: 'src/renderer/assets/', unmanaged: true },
  { prefix: 'src/renderer/', root: 2, label: 'src/renderer', dir: (s) => isCamelName(s) || isPascalName(s), dirExpect: 'camelCase (module) or PascalCase (component)', file: isModuleFileStem, fileExpect: 'camelCase or PascalCase' },
  { prefix: 'src/main/', root: 2, label: 'src/main', dir: isCamelName, dirExpect: 'camelCase', file: isModuleFileStem, fileExpect: 'camelCase or PascalCase' },
  { prefix: 'src/shared/', root: 2, label: 'src/shared', dir: isCamelName, dirExpect: 'camelCase', file: isModuleFileStem, fileExpect: 'camelCase or PascalCase' },
  { prefix: 'src/preload/', root: 2, label: 'src/preload', dir: isCamelName, dirExpect: 'camelCase', file: isModuleFileStem, fileExpect: 'camelCase or PascalCase' }
]
const namingReportedDirs = new Set()

const namingPlugin = {
  rules: {
    'path-case': {
      meta: { type: 'problem', schema: [] },
      create(ctx) {
        const abs = ctx.filename ?? ctx.getFilename()
        const rel = path.relative(RENDERER_DIRNAME, abs).split(path.sep).join('/')
        const zone = NAMING_ZONES.find((z) => rel.startsWith(z.prefix))
        if (!zone || zone.unmanaged) return {}
        return {
          Program(node) {
            const parts = rel.split('/')
            const fileName = parts[parts.length - 1]
            const dirSegs = parts.slice(zone.root, parts.length - 1)
            for (let i = 0; i < dirSegs.length; i++) {
              const seg = dirSegs[i]
              if (seg.startsWith('.') || NAMING_EXEMPT_DIRS.has(seg) || zone.dir(seg)) continue // dotdirs (.storybook, .github) are tool conventions
              const dirRel = parts.slice(0, zone.root + i + 1).join('/')
              if (namingReportedDirs.has(dirRel)) continue
              namingReportedDirs.add(dirRel)
              ctx.report({ node, message: `Directory \`${dirRel}\`: segment \`${seg}\` must be ${zone.dirExpect} under ${zone.label} (naming-conventions.md §4).` })
            }
            if (/^index\.tsx?$/.test(fileName) || /\.d\.ts$/.test(fileName)) return // index.* owned by barrel/*; *.d.ts by §3.5
            const stem = fileName.split('.')[0]
            if (!stem || zone.file(stem)) return
            ctx.report({ node, message: `File \`${fileName}\`: name \`${stem}\` must be ${zone.fileExpect} under ${zone.label} (naming-conventions.md §3).` })
          }
        }
      }
    }
  }
}

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintReact.configs['recommended-typescript'],
  reactHooks.configs['recommended-latest'],
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'import-zod': importZod
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      '@eslint-react/no-prop-types': 'error',
      'import-zod/prefer-zod-namespace': 'error'
    }
  }

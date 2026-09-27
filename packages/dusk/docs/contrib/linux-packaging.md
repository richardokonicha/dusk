---
description: Linux packaging flow with better-sqlite3 N-API prebuilds embedded in the npm package, with build commands
sources:
  - electron-builder.yml
---

# Linux Packaging

Linux builds use the `better-sqlite3` prebuilt binaries that ship inside the
npm package itself (v13+ is N-API): one prebuild per platform/arch
(`linux-x64`, `linux-arm64`, including musl) is installed by `pnpm install`
and bundled as-is. There is no custom prebuild repository, no pinned Release
download, and no Docker/QEMU step.

## Build

```bash
# Build both architectures
pnpm build:linux

# Build one architecture
pnpm build:linux:x64
pnpm build:linux:arm64
```

## Native-module handling

`better-sqlite3` resolves its prebuild via `fs.existsSync` at require time,
so the `node_modules/better-sqlite3/**` entry in `asarUnpack`
(electron-builder.yml) keeps the binary on disk instead of inside the asar
archive, where that lookup would fail.

The upstream prebuilds are built against glibc 2.34 / GLIBCXX 3.4.29 — that is
the oldest Linux runtime the packages support.

When upgrading `better-sqlite3`, nothing packaging-specific needs to change:
bump the dependency, and the new prebuilds arrive with `pnpm install`.

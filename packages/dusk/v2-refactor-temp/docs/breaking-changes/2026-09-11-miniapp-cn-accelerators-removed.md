---
title: Mini app China update accelerators (urlCn) no longer accepted
category: removed
severity: breaking
introduced_in_pr: TBD
date: 2026-09-11
---

## What changed

Mini app manifests no longer accept the `update.urlCn` and `package.urlCn` accelerator fields. A manifest carrying them is rejected at validation with an "Unrecognized key" error. Every mini app now has exactly one update endpoint, whose origin is pinned at install.

## Why this matters to the user

Previewing, installing or updating a mini app whose packaged or distribution manifest still declares `urlCn` fails with a validation error. Apps already installed keep working and keep checking the address they were installed from; if that address later goes away, installing over the app from its primary address moves it.

## What the user should do

Authors: remove `urlCn` from the packaged and distribution manifests and serve one endpoint. Users: nothing, unless an install or update fails — the app's author must then republish without the field.

## Notes for release manager

Fill in `introduced_in_pr` when the change lands. The dropped columns (`mini_app.supported_regions`, `mini_app_installation.source_origin_cn`) are removed by an automatic database migration; existing installation rows and their pinned addresses are kept.

# Pixel Blog Integration Implementation Plan

> **For agentic workers:** Execute inline with checkpoints; executing-plans is unavailable in this environment. Independent final review uses requesting-code-review.

**Goal:** Publish the approved mushroom pixel scene and game with a maintainable source/output boundary.
**Architecture:** Keep Hexo/Stellar and existing homepage data. One browser module owns shared sprites and the homepage game; existing space controls remain responsible for music, search and article tools.
**Tech Stack:** Hexo 7, Stellar, native JavaScript/CSS, Node fs/path.
**Spec:** `docs/superpowers/specs/2026-09-17-pixel-blog-integration.md`

## Global Constraints

- No new framework, dependency, test file or test layer.
- Preserve articles, personal files, music/search/theme/TOC/back-to-top behavior.
- Keep Pages main/root and .nojekyll; do not run hexo deploy.
- Only delete confirmed unused custom.css source/output; generated roots are not redundant source.

## Task 1: Pixel feature integration

- [ ] Create `source/js/pixel-world.js`: expose `PixelWorld.paintSprite(element, name, document)` and `PixelWorld.mount(document)`; CommonJS export supports the existing Node test environment. Reuse 12x12 mushroom rows from the approved preview. Mount returns a destroy function, removes listeners/cancels animation frames on navigation, and mounts only once.
- [ ] Create `source/css/pixel-world.css`: scope scene, game controls and pocket decoration; reuse scrapbook color tokens; stop ambient animation for reduced motion; keep 320px layout usable.
- [ ] Update `scripts/scrapbook/render-home.js` to render real scene controls and load pixel assets before space JS. Preserve existing model data and data-space/audio selectors. Use native buttons for question block/start/jump/exit.
- [ ] Replace the inline mushroom matrix in `source/js/scrapbook-space.js` with `PixelWorld.paintSprite`; inject shared JS before space JS in `_config.stellar.yml`.
- [ ] Remove visible homepage “手账” copy from configuration/render/CSS, without renaming public CSS classes.
- [ ] Run `npm run verify`; browser-check question block, start/jump/pause/retry/exit, search, theme, article pipe/TOC at desktop and 390/320 widths.

## Task 2: Cleanup and publishing boundary

- [ ] Confirm no live references to custom.css; delete `source/css/custom.css` and `css/custom.css` only.
- [ ] Add `tools/sync-static.cjs` outside Hexo auto-loaded scripts. Build a complete copy list before writes, allow only generated output families, reject symlinks and paths outside the repository, reject protected source targets; copy with `fs.copyFileSync`, do not recursively remove directories.
- [ ] Add `"sync:static": "node tools/sync-static.cjs"` to package.json. Replace misleading README deployment instructions with verify -> sync -> review diff -> explicit commit/push. Preserve `.nojekyll`.
- [ ] Run `npm run verify` then `npm run sync:static`; verify a second sync leaves the same Git diff and byte-check output resources against public.

## Task 3: Review and release

- [ ] Independent read-only code review against spec, fix important findings.
- [ ] Commit only task files, leave `.workbuddy/memory/2026-07-24.md` untouched; push origin/main as authorized.
- [ ] Verify live HTML, pixel JS/CSS and browser behavior. If deployment fails, inspect actual error; never label push as deployment proof.

## Execution evidence

- 2026-09-17: Task 1 and Task 2 implemented. `npm run verify` passed all 40 existing tests and generated 69 files after removing unused custom.css.
- `npm run sync:static` succeeded; a second run left the same Git diff. Source/public/root pixel-world.js SHA256 matched.
- Browser checked desktop, 390px and 320px: question block, start, jump, pause/resume, collision, retry, exit; no horizontal overflow at mobile widths. Search Deadline returned 3 matches; light/dark toggled; empty audio disabled; toolbox opened; article TOC opened and pipe returned scrollY to 0 with 144 mushroom pixels.
- Independent read-only review found one issue: dangling destination symlinks escaped an existsSync guard. Changed to direct lstatSync with throwIfNoEntry:false; reviewer confirmed it closed. No remaining blocking findings.
- Generated tags/index.html retains template whitespace on three added blank lines; source diffs are whitespace-clean. No theme template change was made merely to reformat generated HTML.
- Removed only unused source/css/custom.css and its published copy (recoverable from Git). Existing personal .workbuddy edit remains excluded.
- Live release check remains to be recorded after push.

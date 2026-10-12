# Changelog

## [Unreleased]

## [1.1.0] - 2026-10-12

### Added

- Unit and regression tests with Vitest browser mode using Playwright in Chromium, Firefox, and WebKit
- End-to-end tests of the built examples, drag/snapping, scroll alignment, high DPI rendering, resize, and stress controls
- Installed-package smoke tests for ESM and CommonJS imports
- Optional shared Canvas2D renderer (`canvas: true`)
- Stress test example (`examples/stress-test.html`) with FPS counter, click-to-connect ports
- Shared example stylesheet (`examples/style.css`)
- CHANGELOG.md
- `static` config option — when `true`, cables use page coordinates so they don't respond to scroll
- Performance profiling script (`scripts/profile.mjs`)

### Changed

- Bumped Vite from `^4.3.9` to `^6.4.3`
- Bumped Prettier from `^3.3.3` to `^3.9.6`
- Updated test tooling to patched Vitest 4.1.11 and refreshed transitive dependencies
- Bumped `.nvmrc` from Node 20 to Node 24 LTS
- Updated `package.json` exports to remove unreachable UMD condition
- Examples rewritten without Tailwind CDN — use shared `style.css` instead
- Stress test defaults to 50×50 grid with adaptive cell sizing
- `Patchbay._createCable()` deduplicates cable creation logic
- Segment length computed once per frame, not once per constraint iteration
- Segment rendering uses `transform: translate()` + `contain: layout style paint` instead of `left`/`top`

### Performance

- **Dormant cable detection**: cables whose endpoints haven't moved skip physics after settling (30 frames). 300-cable stress test went from 21 FPS → 120 FPS after settle.
- **Frame-level `getBoundingClientRect` cache**: same element queried by multiple cables only triggers one reflow per frame.
- **Shared global event listeners**: exactly 2 `mousemove`/`mouseup` handlers regardless of cable count.
- Profiling script (`scripts/profile.mjs`) captures Playwright traces from the stress test.

### Fixed

- `patchbay.stop()` was broken: `cancelAnimationFrame` received a function not a handle; `loop()` now checks `isRunning`
- `patchbay.clear()` leaked DOM nodes: iterated forward while splicing, skipping every other cable
- Every cable was adding duplicate global `mousemove`/`mouseup` listeners — now uses a single shared listener set
- `patchbay.startCable()` now correctly passes the `"end"` drag target
- Fixed import casing in `src/index.js` (`./PatchBay.js` → `./Patchbay.js`)
- CDN example used `new Patchbay.Patchbay()` — fixed to `new Patchbay()`
- Rectangle caches now refresh for new cables, direct updates, and independent patchbay instances
- Static coordinates, canvas drag handles, and snap targets now stay aligned while scrolling
- Snap radius is respected exactly, including a radius of zero
- Dormant cables settle again after releasing a dragged endpoint
- Canvas destruction unregisters the actual resize listener; removing a cable repaints a stopped canvas
- Image anchors use their element centers instead of their `x`/`y` properties
- CommonJS output uses a `.cjs` extension so `require("patchbay.js")` returns the constructor
- Drag-to-create example anchors to the source port and avoids creating a second cable on release
- Stress controls apply changed gravity/iterations, report actual segment counts, and clear pending selections
- Generated profiles and test artifacts are excluded from Git and npm packages
- README badges share one row and link to their corresponding resources

### Removed

- Bundlephobia badge from README

## [1.0.2] - 2024-09-28

### Added

- Initial public release
- Core Patchbay class with physics-based cable simulation
- Cable class with Verlet integration, draggable handles, and snap-to-target
- Point class with Verlet integration
- Vite library build (ES, CJS, UMD formats)
- Example pages (basic usage, snapping, configurations, CDN, click-to-add)

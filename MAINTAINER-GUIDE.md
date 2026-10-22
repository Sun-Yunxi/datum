# Datum — Grid Paper Generator · Maintainer Guide

A concise maintainer-facing reference: tech stack, feature inventory, dependencies, CSS variables, and component inventory. Styles live in `src/App.css` (~1,380 lines) and `src/index.css`.

Stack: React 19 + TypeScript + Vite 8. UI is built on mdui 2 (Web Components, on-demand imports + global design tokens). State is managed with Zustand. PDFs are produced by pdfmake (lazy-loaded on export).

---

## 1. Feature Inventory

### 1.1 Layout
- **Flex-first**: `.app`, `.app__header`, `.app__main`, `.app__sidebar`, `.element-add-bar`, `.element-list`, `.element-panel__field`, and `.app__header-actions` all use Flex layout.
- **Grid for fixed grids and collapse animation**: the template grid uses `repeat(3, 1fr)`, the four-edge margin grid uses `repeat(2, 240px)`, and colour presets use `repeat(7, 1fr)`. All collapse effects use `grid-template-rows: 0fr ↔ 1fr` (`.md3-collapse`, `.element-item--leaving`).
- **No float layout.**

### 1.2 Responsive adaptation
- **Width breakpoint `@media (max-width: 900px)`**: the sidebar drops `max-width: 800px`, the template grid goes from 3 to 2 columns, and header padding tightens to `--md-spacing-md`. Inside module panels, multi-option segmented pills (for example the 4-option page-number style control in the Text module) switch from "label left + control right" to "label on its own row, control filling the next row, all options equal width", so they no longer break the module card on narrow screens such as iPhone SE.
- **UA-detected mobile branch**: `main.tsx` adds a `.mobile` class to `<html>` based on `navigator.userAgent`, overriding fixed sizes that do not work on phones — the four-edge margin field changes from a fixed `240px` to fluid `100%`, the margin grid switches to `minmax(0, 1fr)`, the title becomes single-line with ellipsis, and the download button padding is narrowed via `::part(button)`.
- Target devices: desktop browsers plus phones/tablets.

### 1.3 Animation / transitions
- **Preset template collapse**: height transition handled inside `mdui-collapse-item`; the chevron rotates 180°.
- **Module card add/remove**: entry uses `@keyframes element-item-in` (fade-in + slight slide/scale, `backwards` fill so no residual `transform` affects overlay positioning); exit uses `grid-template-rows 1fr → 0fr` + fade-out + a negative `margin-bottom` to cancel the list gap. The item is removed from the store only after the animation ends (300 ms).
- **Generic collapse container `.md3-collapse`**: `grid-template-rows` 0fr↔1fr; `inert` removes collapsed content from the interactive tree.
- **Segmented pill `.md3-toggle__indicator`**: an absolutely positioned indicator transitions `transform` + `width`; the first frame temporarily sets `transition: none` to avoid growing from zero.
- **Colour picker popover entry** `@keyframes md3-color-picker-enter` (`scale(0.85) → 1` + fade-in).
- **Others**: dropdown/chevron rotation, hover state layers, input focus border 1px→2px with padding compensation to avoid text shift.
- Durations and easings uniformly reference **mdui motion tokens** (see 3.3 below).

### 1.4 Theme switching
- **No dark mode or multi-theme switching**: `:root` defines a single light theme; there is no `prefers-color-scheme` and no `[data-theme]` branch.
- However, colours, shapes, font sizes, and spacing are all centralised as **CSS variables** (`--md-*` + mdui tokens), giving the structure needed for future theming.

### 1.5 Other notable behaviours
- **Scrollbar styling**: native scrollbars are not customised; only dropdown menus use `max-height` + `overflow-y: auto` + `overscroll-behavior: contain` to constrain inner scrolling.
- **Print styles**: no `@media print` (PDFs are drawn by pdfmake in JS, not via browser printing).
- **Text selection highlight**: `::selection` / `::-moz-selection` uniformly use translucent purple (`rgba(102,80,164,.35)`).
- **Fonts**: local MiSans in two common weights (400 Regular / 500 Medium, loaded via `@font-face` + `url()` woff2). **No external fonts or CDNs are used.**
- **Icons**: regular icons are inline SVG; dropdown chevrons are embedded as `url("data:image/svg+xml,...")`. Only the warning icon in the font-error dialog comes from `@mdui/icons` (`<mdui-icon-warning>`, single-icon on-demand import).
- **Accessibility**: `role` / `aria-*` annotations, keyboard operation (arrow keys, Home/End), `focus-visible` rings, and `inert` collapsed regions.
- **Internationalisation**: Chinese/English, with `?lang=en|zh-hans` to force a language; otherwise the language is auto-detected from the browser's `Accept-Language` preference (`navigator.languages`) — Chinese and its regional variants map to Simplified Chinese, everything else maps to English.
- **PDF generation**: multiple paper sizes (A0–A5, B0–B5, Letter/Legal/Ledger/Tabloid, etc.), portrait/landscape, duplex booklet mode with two margin sets, copies, background colour, and 9 element types.
- **"Interval Line" module**: when line style is "dashed", a "dash gap" field appears below it; "frame style" is tri-state (none / solid / dashed) — "none" collapses all frame-related fields, "solid" shows "frame width", "dashed" shows both "frame width" and "frame dash gap". Revealed fields all appear below the controlling field.
- **"Diagonal" module (standalone)**: diagonals were extracted from the interval-line module into their own module, placed immediately below "Interval Line" in the add-module list. Controls mirror interval line (colour / offset / range / ignore margins / direction / line style + dash gap / width / spacing / tri-state frame style), with direction options top-left→bottom-right / top-right→bottom-left / both, so both directions can coexist in one module. Drawing clips analytically against the range rectangle: diagonals no longer cross the left/right margins and all four corners are complete (previously they ignored margins and had missing corners).
- **"Text" module (unified title/page number/single text)**: one module switches between **Title / Page Number / Single Text** via "switch mode" (Title by default). Title mode reuses the former "title & page number" fields (title is plain text — `{page}` etc. are displayed literally with no placeholder substitution; plus direction, vertical/horizontal position, margin, and duplex page visibility). Page-number mode provides font size, style (plain number / Page X / X-Y / Roman numerals), placement (header / footer), alignment (left/center/right), page-number start position (begin printing from page X), and starting number (the value printed on the first numbered page, incrementing thereafter). Single-text mode reuses the former "single text" fields (right/down offsets, range, ignore margins, text, font size, angle, repeat count and direction). Colour, font, and enabled state are shared across all three modes; other fields are remembered per mode.
- **Font selection (inside the Text module, below "font size" in every mode)**: each Text module holds its own font (stored in that module's `settings.fontId`, shared by all three modes). The choice is **built-in MiSans (default) or a user-uploaded custom font**; on export the font is applied per element via the node's `font` property (missing/invalid selections fall back to MiSans). The custom font library **`customFonts` is global**: once uploaded from any module, the font is available in every font dropdown without re-selecting the file.
- **Custom font upload constraints and validation**: only `.woff2 / .ttf / .otf` (double restriction via the `accept` attribute and an extension allow-list); `.eot / .svg` and executables are rejected; 50 MB per-file limit; after reading, fontkit (the same engine pdfmake uses internally) validates the font and its CMAP table in the browser; read/parse timeout is 20 s. During processing, `fontLoading` locks the top "Download PDF" button (`loading` + `disabled`). On a custom-font error the app automatically falls back to MiSans and shows a toast. The whole flow stays in the browser with no server round-trip. The privacy note sits on the same row as the "Choose file" button (note left, button right).
- **Font error dialogs (mdui Dialog)**: parse failure / rejected format / oversized file use `mdui-dialog` (`showWarningDialog` in `src/utils/dialog.ts`), with an `@mdui/icons` `<mdui-icon-warning>` at the top (error semantic colour), plus headline and description. It closes by overlay click or Esc and has no explicit close button; it is removed from the DOM after `closed`. When created dynamically, wait for the first render (`updateComplete`) before setting `open`, otherwise the entry scale/fade animation is zeroed out.
- **Density validation**: errors out when grid/dot density exceeds 100 per cm².
- **Pre-export complexity estimate and interception**: before building `docDefinition`, estimate the number of drawing primitives from `rangeWidth` / `rangeHeight` and grid/line `spacing` (`estimateDrawPrimitives` in `pdf/generator.ts`). Above `SAFE_THRESHOLD` (200,000), show a confirmation dialog (`showConfirmDialog` in `utils/dialog.ts`, visually matching the font-error dialog: warning icon + headline + description + Cancel/Continue). The message reads "This document contains many grid elements (about X). Continuing may freeze or crash the browser. Continue anyway?" (X is in scientific notation, e.g. `2.5×10⁵`). "Cancel" returns without exporting; "Continue" proceeds, preventing extreme parameters (huge range + tiny spacing) from freezing the main thread or causing OOM while building massive object counts.

### 1.6 Performance and bundle size
- **On-demand PDF generation**: `App.tsx` lazy-loads `./pdf/generator` via dynamic `import()`; pdfmake (including the font VFS) and qrcode total ~1.8 MB and **do not enter the initial bundle or stay resident in memory** — they are downloaded and executed only when "Download PDF" is clicked.
- **Third-party chunk splitting**: `vite.config.ts` uses `build.rolldownOptions.output.codeSplitting.groups` to split `react`/`react-dom` (`vendor-react`) and `mdui`/`lit` etc. (`vendor-mdui`) into separate chunks, so cached vendor files can be reused when app code changes.
- **Font weight trimming**: only the two MiSans weights actually used by the UI (400 / 500, ~4.8 MB each) are bundled, reducing font output from ~19.5 MB to ~9.6 MB.
- **Additional fontkit split**: `fontkit`, used for font pre-validation, is dynamically imported inside `src/fonts/index.ts` and becomes a separate async chunk (~357 KB including the Brotli decoder). It loads only when the user picks a font file and never enters the initial bundle.
- **Custom font resident-memory optimisation**: `CustomFont.data` stores the **raw binary `ArrayBuffer`** (no longer resident base64), avoiding the ~1.33× memory inflation of base64. Only during export does `generatePDF` **locally** convert the ArrayBuffer to base64 for the pdfmake VFS; that temporary string leaves scope when the export ends and is reclaimed by GC. All processing stays in the browser and does not affect font embedding or layout.
- **Built-in MiSans VFS deduplication**: the pdfmake VFS accepts only base64 strings (it decodes via `new Buffer(data,'base64')` internally and does not accept ArrayBuffer/Uint8Array), so the `misansBase64Promise` cache is kept and never cleared — registration reuses the **same cached string reference** with no concatenation or copying. The UI `@font-face` and the export VFS also reuse the same asset file, avoiding duplicate fetch/encode.
- **MiSans asset reuse**: `pdf/generator.ts` references the **same** woff2 file as the UI `@font-face` via `new URL('../MiSans/woff2/MiSans-Normal.woff2', import.meta.url)`. Vite content-hashes and deduplicates it into one output file, so exports hit the browser HTTP cache directly.
- **PDF font subsetting**: when pdfmake embeds a font through fontkit it subsets to the glyphs actually used, so output PDFs grow by only a few KB (a single Chinese page measures ~3.7–3.9 KB) rather than by the whole font size.
- **Initial bundle (measured)**: JS ~390 KB (gzip ~107 KB, split into runtime + vendor-react + vendor-mdui + index); CSS ~49 KB (gzip ~14 KB). `generator` is a separate async chunk and is not part of initial loading.
- **Font loading strategy**: `font-display: swap` lets text render with the system fallback first, so MiSans never blocks first paint.
- **MiSans licence restriction (no subsetting)**: clause 2.2 of the MiSans agreement explicitly forbids adapting the font or developing derivative works (including subsetting), so the currently bundled ~9.6 MB (400 / 500 weights) is the **minimum compliant size**. For a smaller bundle, switch to a modifiable open-source font under a licence such as SIL OFL (e.g. Noto Sans SC). The licence text lives in `src/MiSans/LICENSE-MiSans.txt` and is emitted to `dist/LICENSE-MiSans.txt` during build.

---

## 2. Dependencies

### CSS preprocessors / tooling
**None.** Plain hand-written CSS (`src/App.css`, `src/index.css`); no Sass / Less / PostCSS config / Tailwind (there is no `postcss.config.*` or `tailwind.config.*` in the project).

### Frontend frameworks / libraries
| Name | Version | Purpose |
| --- | --- | --- |
| react / react-dom | ^19.2.8 | UI framework (function components + hooks, `StrictMode`) |
| zustand | ^5.0.14 | Global state (`src/store/useStore.ts`) |
| pdfmake | ^0.3.11 | PDF generation |
| qrcode | ^1.5.4 | QR code generation |
| mdui | ^2.1.5 | Web Components UI library (on-demand imports + global design tokens) |
| @mdui/icons | ^1.0.4 | Official icon Web Components, used on demand (warning icon in the font-error dialog) |
| fontkit | ^2.0.4 | Font pre-validation: parses uploaded font files and checks CMAP, also reused internally by pdfmake on export (dynamic `import()` on demand) |

### Icon / font assets
Icons are inline SVG; only the warning icon in the font-error dialog comes from `@mdui/icons` (single icon imported on demand, no icon font). Fonts are local MiSans (only the 400/500 weights are bundled). Font Awesome / Iconfont / Google Fonts are not used.

### CSS file references
| File | Notes |
| --- | --- |
| `src/index.css` | Global reset + legacy `:root` variables (template leftovers, see section 3) |
| `src/App.css` | All application styles, including `@font-face` |
| `node_modules/mdui/mdui.css` | Imported in `main.tsx` **before** `index.css`, providing mdui design tokens; verified to contain no external `url()` / `@import` |
| `./MiSans/woff2/MiSans-{Normal,Medium}.woff2` | Local fonts referenced by `@font-face` in `App.css` (only 400 / 500 are bundled) |
| `data:image/svg+xml,<chevron>` | Embedded dropdown chevron, reused by `.paper-settings__field select`, `.element-panel__field select`, and `.element-add-bar__select` |

### Project configuration (package.json)
- **dependencies**: `@mdui/icons ^1.0.4`, `fontkit ^2.0.4`, `mdui ^2.1.5`, `pdfmake ^0.3.11`, `qrcode ^1.5.4`, `react ^19.2.8`, `react-dom ^19.2.8`, `zustand ^5.0.14`
- **devDependencies**: `@types/fontkit`, `@types/node`, `@types/pdfmake`, `@types/qrcode`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react ^6.0.4`, `oxlint ^1.75.0`, `typescript ~6.0.2`, `vite ^8.2.0`
- **scripts**: `dev` (vite), `build` (`tsc -b && vite build`), `lint` (oxlint), `preview` (vite preview)
- **Build configuration**: `vite.config.ts` — `build.rolldownOptions.output.codeSplitting` for vendor splitting; `server.host: true` (listen on all interfaces for LAN access), `preview.host: true`; a custom `legalNotices` build plugin (see below).
- **Build-time legal notices**: the `legalNotices` plugin in `vite.config.ts` emits the MiSans agreement to `dist/LICENSE-MiSans.txt` (the agreement requires retaining the copyright notice and the agreement with any copy of the font; a missing file fails the build), and walks runtime dependencies (including transitive ones) to collect their full LICENSE texts into `dist/THIRD-PARTY-NOTICES.txt` (72 packages in the current build).
- **files field**: `package.json` includes `dist` and `src/MiSans/LICENSE-MiSans.txt`; `npm pack` confirms both ship with the package (note `package.json` is currently `"private": true`, so publishing requires removing that field).
- **Docker**: the root `Dockerfile` is multi-stage (`node:22.23.4-alpine` build → `nginx:alpine` serving `dist/`); both licence files in `dist/` ship with the image.

---

## 3. CSS Variable Reference

### 3.1 Application design tokens (`:root` in `App.css`)

**Colours** (RGB triplets; use as `rgb(var(--x))`):

| Variable | Value | Main usage |
| --- | --- | --- |
| `--md-primary` | 103, 80, 164 | Focus border (text fields / `md3-select__trigger` / `md3-cp__textfield-notch`), `.md3-slider__fill`/`__thumb`, focus ring, `accent-color`, `.md3-color-picker__preset--active` |
| `--md-on-primary` | 255, 255, 255 | `.btn--add-module` text and its hover state layer |
| `--md-primary-container` | 234, 221, 255 | `.element-instance__index` background |
| `--md-on-primary-container` | 33, 0, 94 | `.element-instance__index` text |
| `--md-secondary-container` | 234, 221, 255 | Not referenced directly (the pill indicator uses the literal `#EADDFF`) |
| `--md-on-secondary-container` | 29, 25, 43 | `.md3-toggle__option--active` text colour |
| `--md-surface` | 254, 247, 255 | `body` / `.app` background |
| `--md-surface-dim` | 222, 216, 225 | Unused (reserved token) |
| `--md-surface-bright` | 254, 247, 255 | Unused |
| `--md-surface-container-lowest` | 255, 255, 255 | Unused |
| `--md-surface-container-low` | 247, 242, 250 | Section card backgrounds (`.preset-templates`/`.paper-settings`/`.element-group`), `.element-instance`, floating label background |
| `--md-surface-container` | 243, 237, 247 | `.app__header` background, `.element-group--restore`, `.app__footer` background |
| `--md-surface-container-high` | 236, 230, 240 | `.md3-toggle` background, `.md3-color-picker__popover` background, `.md3-cp__textfield-label` background |
| `--md-surface-container-highest` | 230, 224, 233 | `.md3-slider__track` |
| `--md-on-surface` | 28, 27, 31 | Body/heading text, hover borders, various state-layer `rgba()` |
| `--md-on-surface-variant` | 73, 69, 78 | Secondary text, field labels, icons, footer meta text |
| `--md-outline` | 121, 116, 126 | Text field / dropdown trigger resting border |
| `--md-outline-variant` | 196, 199, 197 | Card borders, dividers, empty-state dashed border, thin border of the HEX/RGB/HSL pill in the colour picker, footer top divider |
| `--md-error` | 179, 38, 30 | Remove icon button semantic colour and ripple state layer, warning icon in the font-error dialog |
| `--md-on-error` | 255, 255, 255 | Unused |
| `--md-error-container` | 249, 222, 220 | Unused |
| `--md-shadow` | 0, 0, 0 | Trigger hover state-layer rgba |

**Elevation (shadows)**

| Variable | Value | Usage |
| --- | --- | --- |
| `--md-elevation-0` | `none` | Unused |
| `--md-elevation-1` | `0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15)` | `.btn--add-module`, `.md3-color-picker__trigger:hover`, preset dot hover |
| `--md-elevation-2` | `0 1px 2px ..., 0 2px 6px 2px ...` | `.btn--add-module:hover` |
| `--md-elevation-3` | `0 1px 3px ..., 0 4px 8px 3px ...` | `.md3-color-picker__popover` |

**Shape**

| Variable | Value | Usage |
| --- | --- | --- |
| `--md-shape-extra-small` | `4px` | Text fields / dropdowns / `.paper-settings__outlined-field` / `.md3-cp__textfield-notch` |
| `--md-shape-small` | `8px` | `.md3-color-picker__trigger`, `.preset-templates__header` |
| `--md-shape-medium` | `12px` | Section cards, `.element-instance`, saturation canvas, empty state |
| `--md-shape-large` | `16px` | Unused |
| `--md-shape-extra-large` | `28px` | `.md3-color-picker__popover` |
| `--md-shape-full` | `9999px` | Serial-number badge, `.md3-toggle` and its options, preset dots, footer version pill |

**State-layer opacities**

| Variable | Value | Usage |
| --- | --- | --- |
| `--md-state-hover` | `0.08` | `.preset-templates__header:hover`, `.md3-color-picker__trigger:hover::after`, `.btn--add-module:hover::after` |
| `--md-state-focus` | `0.12` | Unused |
| `--md-state-pressed` | `0.12` | `.btn--add-module:active::after` |

**Typography (sizes)**

| Variable | Value | Usage |
| --- | --- | --- |
| `--md-typescale-headline-small` | `1.5rem` | `.app__header h1` |
| `--md-typescale-title-large` | `1.375rem` | Section headings `h3`, `.preset-templates__header-title` |
| `--md-typescale-title-medium` | `1.125rem` | `html.mobile .app__header h1` |
| `--md-typescale-title-small` | `1rem` | `.element-instance__title`, `.element-group__title`, `.app__footer-name` |
| `--md-typescale-label-large` | `0.9375rem` | `.paper-settings__field label` |
| `--md-typescale-label-medium` | `0.875rem` | `.preset-templates__btn` |
| `--md-typescale-label-small` | `0.8125rem` | `.element-instance__index`, `.app__footer-version` |
| `--md-typescale-body-large` | `1rem` | Text fields / dropdowns / `.paper-settings__outlined-field` |
| `--md-typescale-body-medium` | `0.9375rem` | `body`, `.element-panel__field label`, `.element-empty` |
| `--md-typescale-body-small` | `0.875rem` | `.element-panel__note`, `.app__footer-meta` |

**Spacing / sizing / transitions**

| Variable | Value | Usage |
| --- | --- | --- |
| `--md-spacing-xs` | `4px` | `.element-panel__field--checkbox`, footer meta gaps |
| `--md-spacing-sm` | `8px` | Card grid gap, field row gap, footer brand gap |
| `--md-spacing-md` | `16px` | `.app__main` padding, list gap, card padding, footer padding |
| `--md-spacing-lg` | `24px` | Card padding, field bottom spacing, header padding, footer vertical padding |
| `--md-spacing-xl` | `32px` | Unused |
| `--md-field-height` | `56px` | `.paper-settings__outlined-field`, colour `input[type=color]` |
| `--md-field-height-dense` | `48px` | Unused |
| `--md-transition` | `0.2s cubic-bezier(0.2, 0, 0, 1)` | Site-wide border / colour / transform transition |

### 3.2 Local and component-level variables

| Variable | Value | Notes |
| --- | --- | --- |
| `--md-field-bg` | `rgb(var(--md-surface-container-low))` | Defined in the section-card rule block; **currently unused** (leftover) |
| `--mdui-comp-ripple-state-layer-color` | `var(--md-error)` | Ripple semantic colour for `.element-icon-btn--remove` |

### 3.3 mdui motion tokens (defined in `mdui.css` `:root`, globally available)

| Variable | Value | Usage |
| --- | --- | --- |
| `--mdui-motion-duration-short3` | `150ms` | `.preset-templates__header` hover, `.md3-toggle__option` text transition |
| `--mdui-motion-duration-short4` | `200ms` | `.preset-templates__chevron` rotation, pill indicator, `.element-item--leaving` fade-out |
| `--mdui-motion-duration-medium2` | `300ms` | `.element-item` enter/exit |
| `--mdui-motion-duration-medium4` | `400ms` | Used internally by `mdui-collapse-item` |
| `--mdui-motion-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Hover / text transitions |
| `--mdui-motion-easing-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Entry, chevron rotation, pill slide |
| `--mdui-motion-easing-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Exit collapse |

### 3.4 Legacy variables in `index.css` (template leftovers)

`--bg: #f5f5f5`, `--bg-card: #ffffff`, `--bg-sidebar: #fafafa`, `--text: #333333`, `--text-secondary: #666666`, `--border: #e0e0e0`, `--accent: #4a90d9`, `--accent-hover: #357abd`, `--danger: #d9534f`, `--danger-hover: #c9302c`, `--shadow: 0 2px 8px rgba(0,0,0,.08)`, `--radius: 8px`.
They are referenced only by `index.css`'s own `:root` (`color` / `background`) and then overridden by the `body` rule in `App.css`; **`App.css` does not reference them.**

---

## 4. Component Inventory

### Application layer

| Component | Function / visuals | CSS variables used | Nesting |
| --- | --- | --- | --- |
| **App**<br>`src/App.tsx` | App root: top bar (title + language `Md3Toggle` + download `mdui-button`, which enters `loading` + `disabled` while fonts are processed) + main sidebar; plus an About footer at the page bottom | `--md-surface`, `--md-outline-variant`, `--md-on-surface(-variant)`, `--md-typescale-headline-small`, `--md-spacing-*`, `--md-shape-full` | Contains PresetTemplates, PaperSettings, ElementPanel, Md3Toggle and the About footer; lazily `import()`s the PDF module on export and passes only the custom fonts actually referenced by Text modules' `fontId` into `generatePDF` |
| **FontSelect**<br>`components/FontSelect.tsx` | Font control embedded in the Text module (rendered once per mode by TextPanel): `Md3Select` to pick built-in MiSans / uploaded fonts, a right-aligned "Choose file" `mdui-button` (hidden `input[type=file]`, `accept=".woff2,.ttf,.otf"`), privacy note, and the uploaded-font list (family name + format/size + `mdui-button-icon` remove). Successful uploads apply to the current module immediately; failures show an `mdui-dialog` warning by reason | `--md-surface-container-low`, `--md-outline-variant`, `--md-shape-small`, `--md-error`, `--md-typescale-body-small`, `--md-spacing-*` | Contained by TextPanel; uses Md3Select / `mdui-button` / `mdui-button-icon`; font validation goes through `src/fonts/index.ts`, success toast through `src/utils/toast.ts`, failure dialog through `src/utils/dialog.ts` |
| **PresetTemplates**<br>`components/PresetTemplates.tsx` | Preset template collapse section: `mdui-collapse` + `mdui-collapse-item`, grid of 12 templates, click to apply | `--md-shape-small`, `--md-spacing-*`, `--md-typescale-title-large`/`label-medium`, `--md-on-surface(-variant)`, `--md-state-hover`, mdui motion | Contained by App; contains `mdui-button` (header slot and template cards) |
| **PaperSettings**<br>`components/PaperSettings.tsx` | Paper settings: type, custom width/height, orientation, copies, duplex binding, four-edge margins (2×2), background colour | `--md-field-height`, `--md-shape-extra-small`, `--md-outline`, `--md-primary`, `--md-surface-container-low`, `--md-typescale-*`, `--md-spacing-*` | Contained by App; uses Md3Select / Md3Collapse / Md3Toggle / Md3Switch / Md3ColorPicker / NumberInput |
| **ElementPanel**<br>`components/ElementPanel.tsx` | Module management: top add control (`Md3Select` + `mdui-button`), empty state, module card list (serial badge + Copy / Add same type / Remove `mdui-button-icon` buttons), and drives add/remove animations | `--md-surface-container-low`, `--md-outline-variant`, `--md-shape-medium/full`, `--md-primary-container`, `--md-error`, `--md-spacing-*`, mdui motion, `--mdui-comp-ripple-state-layer-color` | Contained by App; contains the 9 element panels |

### Element parameter panels (`components/elements/`, 9 total)

`IntervalLinePanel`, `DiagonalPanel`, `DotPanel`, `SingleLinePanel`, `TextPanel`, `BlockPanel`, `CirclePanel`, `QRCodePanel`, `WatermarkPanel`.

- **Function**: each edits parameters for its module type (enabled toggle, colour, offsets, range, ignore margins + type-specific fields). `IntervalLinePanel` / `DiagonalPanel` use a tri-state "frame style" (none / solid / dashed); conditional fields (`frame width` / `frame dash gap`) are collapsed with `Md3Collapse`. When line style is dashed, a "dash gap" field is revealed. `DiagonalPanel`'s direction supports top-left→bottom-right / top-right→bottom-left / both. `TextPanel` is the unified Text module containing Title / Page Number / Single Text modes (controlled by a "switch mode" `Md3Toggle`, Title by default) and embeds `FontSelect` below "font size" in every mode; `WatermarkPanel` additionally has a "Choose file" button.
- **Visuals**: unified `.element-fields` container + `.element-panel__field` form-row structure.
- **CSS variables**: `--md-typescale-body-medium`, `--md-on-surface-variant`, `--md-outline`, `--md-shape-extra-small`, `--md-spacing-*`.
- **Nesting**: rendered dynamically by ElementPanel according to `el.type`; internally reuse Md3Switch / Md3ColorPicker / Md3Toggle / Md3Select / Md3Slider / Md3Collapse / NumberInput.
- Note: `.element-fields`, `.element-panel__number`, `.element-panel__text`, and `.element-panel__label` have **no dedicated rules** in `App.css` — they are semantic class names only; styling comes from `.element-panel__field` and its descendant selectors.

### Reusable UI components (`components/`)

| Component | Function / visuals | CSS variables used | Nesting / dependencies |
| --- | --- | --- | --- |
| **Md3Select** | Dropdown built on `mdui-dropdown` + `mdui-menu(selects="single")` (not a native `<select>`), width synced to its trigger | `--md-outline`, `--md-on-surface`, `--md-primary`, `--md-shape-extra-small`, `--md-typescale-body-large`, `--md-transition` | Used by ElementPanel, PaperSettings, and all panels |
| **Md3Toggle** | Segmented pill switch with an absolutely positioned `__indicator`, supports arrow keys / Home / End | `--md-surface-container-high`, `--md-on-secondary-container`, `--md-on-surface(-variant)`, `--md-primary`, mdui motion | Used by App (language), PaperSettings (orientation), TextPanel (mode and per-mode parameters), etc. |
| **Md3Switch** | Controlled wrapper around `mdui-switch` (`ref` + `addEventListener`, since React cannot bind custom-element events) | Only `flex-shrink` layout fixes | Used by PaperSettings and all panels' toggles |
| **Md3Collapse** | Generic height-adaptive collapse container (`grid-template-rows` 0fr↔1fr, `inert` when collapsed) | `--md-transition` | Used by PaperSettings (custom size, even-page margins) and IntervalLinePanel / DiagonalPanel (conditional frame fields, dash gap) |
| **Md3Slider** | Lightweight slider; Pointer Events unify mouse/touch, no external dependencies | `--md-surface-container-highest`, `--md-primary`, `--md-transition` | Used by numeric parameter panels |
| **Md3ColorPicker** | MD3 colour picker: trigger swatch + popover (saturation canvas, hue bar, HEX/RGB/HSL switch, notch input, preset dots) | `--md-outline`, `--md-shape-*`, `--md-elevation-1/3`, `--md-surface-container-high`, `--md-primary`, `--md-on-surface(-variant)`, `--md-shadow`, `--md-state-hover`, `--md-spacing-*`, `--md-transition`, mdui motion | Used by PaperSettings (background colour) and all colour-bearing panels; mode switching reuses the project's own `Md3Toggle` (equal-width inside `.md3-cp__mode-group`) |
| **NumberInput** | Numeric input: `type="text"` + `inputMode` + regex filtering + normalisation on blur, preserving intermediate decimal states | None (inherits parent field styles) | Used by PaperSettings and all panels |
| **Preview**<br>`components/Preview.tsx` | Canvas preview component (~370 lines) | — | **Currently unreferenced** (leftover / not wired in; tree-shaken out of the build, no effect on output) |

### Non-component infrastructure

| Module | Notes |
| --- | --- |
| `i18n/index.tsx` + `locales/{zh-hans,en}.json` | `I18nProvider` / `useTranslation`; `?lang=` override; otherwise auto-detect from the browser's `Accept-Language` preference (`navigator.languages`): Chinese and its variants → Simplified Chinese, everything else → English; also syncs `document.documentElement.lang` |
| `store/useStore.ts` | Zustand: `paperSettings`, `elements`, `language`, `isGenerating` and their actions; global `customFonts`, `fontLoading`, and `addCustomFont` / `removeCustomFont` / `setFontLoading` (removing a font falls back any Text module still using it to built-in MiSans). **Font selection lives in each Text module's `settings.fontId`; there is no global `fontId`** |
| `fonts/index.ts` | Font validation and parsing: extension allow-list (`.woff2/.ttf/.otf`), 50 MB limit, 20 s timeout, dynamic `import()` of `fontkit` to pre-validate legality and CMAP, `arrayBufferToBase64` / `createFontId` helpers. **Display-name resolution** `resolveDisplayName` reads OpenType `name` records parsed by fontkit, choosing by language priority (UI language including Traditional Chinese variants → same primary language → EN-US/EN → any record → filename), and within a language by Typographic Family(16) → Font Family(1) → Full name(4). It is language-agnostic and works for ttf/otf/woff/woff2 |
| `utils/toast.ts` | Lightweight toast: dynamically inserts `mdui-snackbar` (`placement="bottom"`), waits for first render (`updateComplete`) before setting `open` so the entry animation plays, removes itself after `closed`; used for font upload success/fallback messages. Font size is increased in `App.css` by overriding `--mdui-typescale-body-medium-*` with the `body-large` token |
| `utils/dialog.ts` | Dialog helpers: `showWarningDialog(headline, description)` and `showConfirmDialog(headline, description, confirmText, cancelText)` (`Promise<boolean>`). Both dynamically create `mdui-dialog` (`close-on-overlay-click` + `close-on-esc`) + an `@mdui/icons` `<mdui-icon-warning>` (slot="icon"), wait for first render (`updateComplete`) before setting `open`, and remove themselves after `closed`. The warning dialog is used for font parse failure / rejected format / oversized files; the confirm dialog is used for pre-export complexity interception (Cancel / Continue) |
| `pdf/generator.ts` | pdfmake drawing, QRCode generation, watermark opacity baking, grid density validation, **pre-export complexity estimate `estimateDrawPrimitives` + `SAFE_THRESHOLD` (200,000)**, opening the PDF in a new window; per-element font registration and selection — built-in MiSans is always registered as default/fallback (reusing the same cached base64 string reference); each Text module registers `Datum-${id}` from its `settings.fontId` and writes the node's `font` property (custom fonts are converted **locally** from ArrayBuffer to base64 for the VFS during export). Missing/invalid family names always fall back to MiSans; if a custom font fails to embed, the code recursively rewrites every `font` node to MiSans and retries, returning `fontFallback: true`. **Lazy-loaded via dynamic `import()` from `App.tsx`** |
| `templates/index.ts` | 12 preset templates |
| `types/index.ts` | Paper size table and settings types for 9 element types (`TextSettings` contains title / single / pageNumber sub-settings plus a shared `fontId`; `FrameStyle` is the tri-state frame style, `DiagonalLineDirection` the diagonal direction); `FontFormat` / `CustomFont` (`data: ArrayBuffer` holding raw binary) and `BUILTIN_FONT_ID` |
| `mdui-jsx.d.ts` | References `mdui/jsx.zh-cn.d.ts` to provide JSX types for mdui custom elements |
| `vite.config.ts` | Build configuration: vendor splitting (`codeSplitting`), LAN host, and the `legalNotices` plugin (emits the MiSans agreement + auto-collects dependency licences into `THIRD-PARTY-NOTICES.txt`) |
| `Dockerfile` | Multi-stage build: `npm ci && npm run build` on `node:22.23.4-alpine`, then serve `dist/` with `nginx:alpine`; licence files ship with the image |
| `src/MiSans/LICENSE-MiSans.txt` | Full text of the MiSans Font Intellectual Property License Agreement (copied to `dist/LICENSE-MiSans.txt` at build time) |

---

## 5. Reuse Relationships

- **Design tokens centralised in one place**: every component's colours / shapes / font sizes / spacing / transitions reference the `--md-*` tokens in `App.css` `:root`; changing a colour or size means editing `:root` only.
- **Section cards share one rule**: `.preset-templates`, `.paper-settings`, and `.element-group` share the same background / border / radius / padding block (and section headings share theirs).
- **Form rows shared**: `.element-panel__field` + `.element-panel__field label` are reused by PaperSettings and all 9 element panels.
- **Text-field appearance shared**: `.paper-settings__outlined-field`, `.element-panel__field input/select`, `.md3-select__trigger`, and `.md3-cp__textfield-notch` all follow the same "1px `--md-outline` → focused 2px `--md-primary` + padding compensation" pattern.
- **Card appearance and animation separated**: `.element-instance` (appearance) is reused by every module type; `.element-item` (outer) handles only add/remove animation. The two are decoupled.
- **Card grids shared**: `.preset-templates__grid` and `.md3-color-picker__presets` both use Grid + `--md-spacing` for columns and gaps.
- **mdui components reused**: `mdui-button` (download, add module, preset header/cards, choose file), `mdui-button-icon` (card actions, remove uploaded font), `mdui-switch` (all toggles), `mdui-dropdown` + `mdui-menu` (Md3Select), `mdui-collapse` + `mdui-collapse-item` (PresetTemplates), `mdui-dialog` (font error prompts).
- **Custom toggle reused**: `Md3Toggle` (segmented pill) is used for language, paper orientation, Text module mode and segmented parameters, and the colour picker's HEX/RGB/HSL switch.
- **Motion tokens reused**: `.md3-toggle`, `.element-item`, `.preset-templates__header`, and the colour-picker mode group all reference `--mdui-motion-*`, keeping timing consistent.
- **Global library + local selection pattern**: the custom font library `customFonts` lives in the global store (reused in many places, uploaded once), while "which font to use" is down in each Text module's `settings.fontId` — the UI reuses one `FontSelect`, and export resolves family names per element.
- **Custom-element event pattern reused**: Md3Switch / Md3Select / PresetTemplates all use `ref` + `addEventListener('change')` + `useLayoutEffect` for controlled sync; follow this when adding mdui wrapper components.
- **i18n reuse**: every UI string goes through `t()` from `locales/*.json`; components never hard-code Chinese text.

> Notes:
> - Files unrelated to the project have been cleaned up (`src/demo/`, `src/App.css.bak`, `public/icons.svg`, `src/assets/*`, `datum.pdf`, `mduillms.txt`, and the otf / woff / ttf / variable formats under `src/MiSans/` other than `woff2/`); `src/App.css` is the authoritative stylesheet.
> - `src/MiSans/` now keeps only the `woff2/` directory, which contains 10 weight files, but only Normal(400) and Medium(500) are referenced by `@font-face` and enter the build; the remaining weights are source redundancy and can be pruned on demand. `MiSans-Normal.woff2` is also referenced by `pdf/generator.ts` via `new URL(..., import.meta.url)` (to register the built-in font on export); Vite deduplicates it by content hash into a single output file.
> - When adding heavy dependencies, prefer dynamic `import()` on demand to avoid inflating the initial bundle again.

---

# Datum — 图形方格纸生成工具（维护文档）

面向维护者的精简说明：技术栈、功能清单、依赖、CSS 变量与组件清单。样式实现集中在 `src/App.css`（约 1380 行）与 `src/index.css`。

技术栈：React 19 + TypeScript + Vite 8，UI 组件基于 mdui 2（Web Components，按需导入 + 全局设计令牌），状态用 Zustand，PDF 由 pdfmake 生成（导出时按需加载）。

---

## 一、功能清单

### 1. 布局方式
- **以 Flex 为主**：`.app`、`.app__header`、`.app__main`、`.app__sidebar`、`.element-add-bar`、`.element-list`、`.element-panel__field`、`.app__header-actions` 均为 Flex 布局。
- **Grid 用于固定网格与折叠动画**：模板网格 `repeat(3, 1fr)`、四边留白 `repeat(2, 240px)`、颜色预设 `repeat(7, 1fr)`；折叠动效统一用 `grid-template-rows: 0fr ↔ 1fr`（`.md3-collapse`、`.element-item--leaving`）。
- **未使用浮动（float）布局**。

### 2. 响应式适配
- **宽度断点 `@media (max-width: 900px)`**：侧栏取消 `max-width: 800px`、模板网格 3 列 → 2 列、顶栏内边距收紧为 `--md-spacing-md`；模块参数面板内的多选项胶囊切换控件（如「文字」页码样式的 4 选项）由「标签左 + 控件右」改为标签独占一行、控件铺满整行、各选项等宽，避免在 iPhone SE 等窄屏上撑破模块卡片。
- **UA 检测的移动端分支**：`main.tsx` 依据 `navigator.userAgent` 给 `<html>` 加 `.mobile` 类，覆盖手机上不兼容的固定尺寸 —— 四边留白由固定 `240px` 改为 `100%` 流式、留白网格改 `minmax(0, 1fr)`、标题单行省略、下载按钮内边距收窄（`::part(button)`）。
- 适配目标：桌面浏览器 + 手机/平板。

### 3. 动画 / 过渡
- **预设模板折叠**：由 `mdui-collapse-item` 内部负责高度过渡，箭头旋转 180°。
- **模块卡片增删**：入场 `@keyframes element-item-in`（淡入 + 轻微下滑/缩放，`backwards` 填充以免残留 `transform` 影响浮层定位）；离场 `grid-template-rows 1fr → 0fr` + 淡出 + 负 `margin-bottom` 抵消列表 gap，动画结束（300ms）后才从 store 删除。
- **通用折叠容器 `.md3-collapse`**：`grid-template-rows` 0fr↔1fr，收起时用 `inert` 移出可交互范围。
- **胶囊切换 `.md3-toggle__indicator`**：绝对定位指示器同步过渡 `transform` + `width`，首帧临时 `transition: none` 避免从 0 生长。
- **颜色选择器弹层入场** `@keyframes md3-color-picker-enter`（`scale(0.85) → 1` + 淡入）。
- **其它**：下拉/箭头旋转、hover 状态层、输入框聚焦描边 1px→2px 并同步缩小 padding 补偿位移。
- 动效时长与缓动统一引用 **mdui motion 令牌**（见第三节 3.3）。

### 4. 主题切换
- **未实现暗黑模式或多主题切换**：`:root` 仅定义一套浅色主题值，无 `prefers-color-scheme`、无 `[data-theme]` 分支。
- 但配色、形状、字号、间距全部集中为 **CSS 变量**（`--md-*` + mdui 令牌），已具备主题化的结构基础。

### 5. 其它特殊功能
- **滚动条样式**：未自定义原生滚动条；仅下拉菜单设 `max-height` + `overflow-y: auto` + `overscroll-behavior: contain` 限制内部滚动。
- **打印样式**：无 `@media print`（PDF 由 pdfmake 在 JS 端绘制，不经浏览器打印）。
- **文本选中高亮**：`::selection` / `::-moz-selection` 统一为紫色半透明（`rgba(102,80,164,.35)`）。
- **字体**：本地 MiSans 两个常用字重（400 常规 / 500 中黑，`@font-face` + `url()` 引入 woff2），**未引入任何外部字体或 CDN**。
- **图标**：常规图标为内联 SVG；下拉箭头以 `url("data:image/svg+xml,...")` 内嵌。仅字体异常对话框顶部的 warning 图标使用 `@mdui/icons`（`<mdui-icon-warning>`，按需 `import` 单个图标）。
- **无障碍**：`role` / `aria-*` 标注、键盘操作（方向键、Home/End）、`focus-visible` 焦点环、`inert` 收起区。
- **国际化**：中 / 英双语，支持 `?lang=en|zh-hans` 指定语言；未指定时按浏览器 `Accept-Language` 偏好（`navigator.languages`）自动判定 —— 中文及其衍生变体使用简体中文，其余使用 English。
- **PDF 生成**：支持多种纸张尺寸（A0–A5、B0–B5、Letter/Legal/Ledger/Tabloid 等）、横竖方向、双面装订双套留白、份数、背景色，以及 9 类图形元素。
- **「间隔线」模块**：线条样式为「虚线」时，其下方显示「虚线间隔」（虚线的空隙长度）；「外框样式」为三选（无 / 实线 / 虚线）—— 选「无」收起全部外框相关项，选「实线」显示「外框粗细」，选「虚线」同时显示「外框粗细」与「外框虚线间隔」，被显示项均呈现在该控件下方。
- **「斜线」模块（独立）**：斜线已从间隔线中拆出为独立模块，在添加模块列表中紧邻「间隔线」下方；可调项与间隔线基本一致（颜色 / 偏移 / 范围 / 忽略留白 / 方向 / 线条样式 + 虚线间隔 / 粗细 / 间距 / 外框样式三态），方向支持 左上→右下 / 右上→左下 / 双向，单个模块内即可并存双向。绘制按范围矩形做解析裁剪，斜线不再越出左右留白、四角完整（此前存在无视留白与缺角问题）。
- **「文字」模块（整合标题/页码/单文字）**：单一模块内通过「切换模式」在 **标题 / 页码 / 单文字** 三种模式间切换（默认标题）。标题模式复用原「标题&页码」字段（标题为纯文本，`{page}` 等按字面显示、不做占位符替换；另有方向、竖直/水平位置、边距、双面装订页面可见性）；页码模式提供字号、样式（纯数字 / 第X页 / X-Y / 罗马数字）、显示位置（页眉 / 页脚）、对齐（左/中/右）、页码起始位置（从第 X 页开始打印页码）、起始页码数值（首个打印页码的页上显示的数值，其后逐页递增）；单文字模式复用原「单文字」字段（右/下偏移、范围、忽略留白、文字、字号、角度、重复次数与方向）。颜色、字体与启用状态三模式共用，其余字段按模式独立记忆。
- **字体选择（位于「文字」模块内、各模式的「字体大小」下方）**：每个「文字」模块各自持有一个字体（存入该模块 `settings.fontId`，模块内三种模式共用）。字体为 **内置 MiSans（默认）与用户上传的自定义字体二选一**，导出时按元素分别通过节点 `font` 属性应用（未选中/非法一律回退内置 MiSans）。自定义字体库 **`customFonts` 全局共享**：任意模块上传一次后，所有字体下拉框均可直接选到该字体，无需重复选择文件。
- **自定义字体上传约束与校验**：仅接受 `.woff2 / .ttf / .otf`（`accept` 属性 + 扩展名白名单双重限制），拒绝 `.eot / .svg` 等过时格式与可执行文件；单文件上限 50MB；读取后在浏览器端用 fontkit 预检（与 pdfmake 内部同款字体引擎）解析字体并校验 CMAP；读取/解析超时 20s。处理期间 `fontLoading` 会锁定顶部「PDF 输出」按钮（`loading` + `disabled`）；自定义字体异常时自动回退内置 MiSans 并 toast 提示。全流程在浏览器本地完成，不经服务器。隐私说明小字与「选择文件」按钮同一行（左侧说明、右侧按钮）。
- **字体异常提示（mdui Dialog）**：解析失败 / 格式拒绝 / 文件过大三类提示改用 `mdui-dialog`（`src/utils/dialog.ts` 的 `showWarningDialog`），顶部为 `@mdui/icons` 的 `<mdui-icon-warning>`（error 语义色），含 headline 标题与 description 描述，可通过点击遮罩或按 Esc 关闭，不额外提供关闭按钮；`closed` 后自动从 DOM 移除。动态创建时先等组件首次渲染完成（`updateComplete`）再置 `open`，否则进场缩放/淡入动画会被置零。
- **密度校验**：网格/网点密度超过 100 个/cm² 时报错。
- **导出前复杂度预估与拦截**：构建 `docDefinition` 前先按 `rangeWidth` / `rangeHeight` 与网格/线段 `spacing` 估算本次将生成的图形对象数（`pdf/generator.ts` 的 `estimateDrawPrimitives`），超过安全阈值 `SAFE_THRESHOLD`（20 万）时弹出确认对话框（`utils/dialog.ts` 的 `showConfirmDialog`，样式同字体异常提示：warning 图标 + headline + description + 取消/继续导出），文案为「当前网格数量较多（约 X 条），继续导出可能导致浏览器长时间无响应甚至崩溃。是否仍要继续？」（X 为科学计数法，如 `2.5×10⁵`）；点「取消」直接返回、不导出，点「继续导出」才继续执行，避免极端参数（超大范围 + 极小间距）在构建海量对象时把主线程卡死或 OOM。
- **关于 / 页脚**：页面最下方为 About 区块，与主内容以 `1px --md-outline-variant` 分割线分隔；内容含 favicon 徽标 + 「Datum」+ 版本徽章 `0.74`，以及技术依赖、界面组件（mdui 2）、字体（MiSans）、项目许可证（MIT）与 MiSans 字体许可证（《MiSans字体知识产权许可协议》）等说明。

### 6. 性能与体积
- **PDF 生成按需加载**：`App.tsx` 用动态 `import()` 加载 `./pdf/generator`，pdfmake（含字体 VFS）与 qrcode 合计约 1.8MB **不进入首屏包、也不常驻内存**，仅在点击「PDF 输出」时才下载并执行。
- **第三方库分包**：`vite.config.ts` 用 `build.rolldownOptions.output.codeSplitting.groups` 将 `react`/`react-dom`（`vendor-react`）与 `mdui`/`lit` 等（`vendor-mdui`）拆为独立 chunk，业务代码更新时用户可复用已缓存的 vendor 文件。
- **字体字重裁剪**：仅打包界面实际使用的 MiSans 400 / 500 两个字重（每个约 4.8MB），产物字体体积由约 19.5MB 降至约 9.6MB。
- **fontkit 二次分包**：字体预检用的 `fontkit` 在 `src/fonts/index.ts` 内以动态 `import()` 引入，产物为独立异步 chunk（约 357KB，含 Brotli 解码器），仅在用户选择字体文件时才加载，不进入首屏包。
- **自定义字体常驻内存优化**：`CustomFont.data` 存**原始二进制 `ArrayBuffer`**（不再常驻 base64），避免 base64 编码带来的约 1.33 倍内存膨胀；仅在导出时于 `generatePDF` 内**局部**将 ArrayBuffer 转 base64 注入 pdfmake VFS，该临时字符串随导出结束脱离作用域并交由 GC 回收。全流程在浏览器本地完成，不影响字体嵌入与排版结果。
- **内置 MiSans 字体 VFS 去重**：pdfmake VFS 只接受 base64 字符串（内部 `new Buffer(data,'base64')` 解码，不支持直接写入 ArrayBuffer/Uint8Array），故保留 `misansBase64Promise` 缓存且不置空——注册时直接复用缓存的**同一个字符串引用**，不做拼接或拷贝，界面 `@font-face` 与导出 VFS 亦复用同一产物文件，避免重复 fetch/编码。
- **MiSans 资源复用**：`pdf/generator.ts` 通过 `new URL('../MiSans/woff2/MiSans-Normal.woff2', import.meta.url)` 引用与界面 `@font-face` **同一个** woff2 文件，Vite 按内容哈希去重为一个产物文件，导出时可直接命中浏览器 HTTP 缓存。
- **PDF 字体子集化**：pdfmake 经 fontkit 嵌入字体时按实际用到的字形做子集化，因此产物 PDF 只增加几 KB（实测含中文的单页 PDF 约 3.7–3.9KB），而非整份字体体积。
- **首屏产物**（实测）：JS 约 390KB（gzip 约 107KB，拆为 runtime + vendor-react + vendor-mdui + index）、CSS 约 49KB（gzip 约 14KB）；`generator` 为独立异步 chunk，不参与首屏加载。
- **字体加载策略**：`font-display: swap` 保证文本先用系统回退字体渲染，MiSans 不阻塞首屏。
- **MiSans 许可限制（不可子集化）**：MiSans 协议第 2.2 条明确禁止对字体进行改编或二次开发（包括子集化），因此当前打包的约 9.6MB（400 / 500 两个字重）即为**最小合规体积**；如需更小体积，应更换为 SIL OFL 等允许修改的开源字体（如 Noto Sans SC）。协议原文见 `src/MiSans/LICENSE-MiSans.txt`，构建时会随产物输出到 `dist/LICENSE-MiSans.txt`。

---

## 二、依赖项清单

### CSS 预处理器 / 工具
**无**。纯手写 CSS（`src/App.css`、`src/index.css`），未使用 Sass / Less / PostCSS 配置 / Tailwind（项目内无 `postcss.config.*`、`tailwind.config.*`）。

### 前端框架 / 库
| 名称 | 版本 | 用途 |
| --- | --- | --- |
| react / react-dom | ^19.2.8 | UI 框架（函数组件 + Hooks，`StrictMode`） |
| zustand | ^5.0.14 | 全局状态（`src/store/useStore.ts`） |
| pdfmake | ^0.3.11 | PDF 生成 |
| qrcode | ^1.5.4 | 二维码生成 |
| mdui | ^2.1.5 | Web Components UI 库（按需导入 + 全局设计令牌） |
| @mdui/icons | ^1.0.4 | 官方图标 Web Components，按需使用（字体异常对话框的 warning 图标） |
| fontkit | ^2.0.4 | 字体预检：解析上传的字体文件、校验 CMAP，并在导出时由 pdfmake 内部复用（动态 `import()` 按需加载） |

### 图标 / 字体库
图标为内联 SVG，仅字体异常对话框的 warning 图标来自 `@mdui/icons`（按需 `import` 单个图标，无图标字体）；字体为本地 MiSans（仅打包 400/500 两个字重）。未使用 Font Awesome / Iconfont / Google Fonts。

### CSS 文件引用
| 文件 | 说明 |
| --- | --- |
| `src/index.css` | 全局 `reset` + 旧版 `:root` 变量（模板残留，见第三节） |
| `src/App.css` | 应用全部样式，含 `@font-face` |
| `node_modules/mdui/mdui.css` | 在 `main.tsx` 中**先于** `index.css` 引入，提供 mdui 设计令牌；经检查不含外部 `url()` / `@import` |
| `./MiSans/woff2/MiSans-{Normal,Medium}.woff2` | 本地字体，`App.css` `@font-face` 引用（仅 400 / 500 两个字重，其余字重未被打包） |
| `data:image/svg+xml,<chevron>` | 内嵌下拉箭头，重复用于 `.paper-settings__field select`、`.element-panel__field select`、`.element-add-bar__select` |

### 项目配置依赖（package.json）
- **dependencies**：`@mdui/icons ^1.0.4`、`fontkit ^2.0.4`、`mdui ^2.1.5`、`pdfmake ^0.3.11`、`qrcode ^1.5.4`、`react ^19.2.8`、`react-dom ^19.2.8`、`zustand ^5.0.14`
- **devDependencies**：`@types/fontkit`、`@types/node`、`@types/pdfmake`、`@types/qrcode`、`@types/react`、`@types/react-dom`、`@vitejs/plugin-react ^6.0.4`、`oxlint ^1.75.0`、`typescript ~6.0.2`、`vite ^8.2.0`
- **scripts**：`dev`（vite）、`build`（`tsc -b && vite build`）、`lint`（oxlint）、`preview`（vite preview）
- **构建配置**：`vite.config.ts` —— `build.rolldownOptions.output.codeSplitting` 做 vendor 分包；`server.host: true`（监听所有网卡，便于局域网访问）、`preview.host: true`；自建 `legalNotices` 构建插件（见下）。
- **构建期法律声明**：`vite.config.ts` 的 `legalNotices` 插件在构建时把 MiSans 协议输出到 `dist/LICENSE-MiSans.txt`（协议要求「在字体的任何副本中保留版权声明和本协议」，缺失则构建直接报错），并自动遍历运行时依赖（含传递依赖）收集其 LICENSE 全文，生成 `dist/THIRD-PARTY-NOTICES.txt`（本次构建覆盖 72 个包）。
- **files 字段**：`package.json` 的 `files` 含 `dist` 与 `src/MiSans/LICENSE-MiSans.txt`，`npm pack` 已确认二者随包分发（注意 `package.json` 现为 `"private": true`，需移除该字段才能实际发布）。
- **Docker**：根目录 `Dockerfile` 为多阶段构建（`node:22.23.4-alpine` 构建 → `nginx:alpine` 托管），`dist/` 内的两份许可证文件随镜像分发。

---

## 三、CSS 变量速查表

### 3.1 应用设计令牌（`App.css` 的 `:root`）

**颜色**（值为 RGB 三元组，使用时需 `rgb(var(--x))`）：

| 变量 | 值 | 主要使用位置 |
| --- | --- | --- |
| `--md-primary` | 103, 80, 164 | 聚焦边框（文本框/`md3-select__trigger`/`md3-cp__textfield-notch`）、`.md3-slider__fill`/`__thumb`、焦点环、`accent-color`、`.md3-color-picker__preset--active` |
| `--md-on-primary` | 255, 255, 255 | `.btn--add-module` 文字、其 hover 状态层 |
| `--md-primary-container` | 234, 221, 255 | `.element-instance__index` 背景 |
| `--md-on-primary-container` | 33, 0, 94 | `.element-instance__index` 文字 |
| `--md-secondary-container` | 234, 221, 255 | 未直接引用（胶囊指示器用字面量 `#EADDFF` 代替） |
| `--md-on-secondary-container` | 29, 25, 43 | `.md3-toggle__option--active` 文字色 |
| `--md-surface` | 254, 247, 255 | `body` / `.app` 背景 |
| `--md-surface-dim` | 222, 216, 225 | 未使用（备用令牌） |
| `--md-surface-bright` | 254, 247, 255 | 未使用 |
| `--md-surface-container-lowest` | 255, 255, 255 | 未使用 |
| `--md-surface-container-low` | 247, 242, 250 | 分区卡片背景（`.preset-templates`/`.paper-settings`/`.element-group`）、`.element-instance`、浮动标签背景 |
| `--md-surface-container` | 243, 237, 247 | `.app__header` 背景、`.element-group--restore`、`.app__footer` 背景 |
| `--md-surface-container-high` | 236, 230, 240 | `.md3-toggle` 背景、`.md3-color-picker__popover` 背景、`.md3-cp__textfield-label` 背景 |
| `--md-surface-container-highest` | 230, 224, 233 | `.md3-slider__track` |
| `--md-on-surface` | 28, 27, 31 | 正文/标题文字、hover 边框、各状态层 `rgba()` |
| `--md-on-surface-variant` | 73, 69, 78 | 次要文字、字段标签、图标、页脚说明文字 |
| `--md-outline` | 121, 116, 126 | 文本框 / 下拉触发器 常态边框 |
| `--md-outline-variant` | 196, 199, 197 | 卡片边框、分隔线、空状态虚线、取色器内 HEX/RGB/HSL 胶囊切换器的细框、页脚顶部分割线 |
| `--md-error` | 179, 38, 30 | 移除图标按钮语义色与涟漪状态层、字体异常对话框的 warning 图标 |
| `--md-on-error` | 255, 255, 255 | 未使用 |
| `--md-error-container` | 249, 222, 220 | 未使用 |
| `--md-shadow` | 0, 0, 0 | 触发器 hover 状态层 rgba |

**高度（阴影）**

| 变量 | 值 | 使用位置 |
| --- | --- | --- |
| `--md-elevation-0` | `none` | 未使用 |
| `--md-elevation-1` | `0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15)` | `.btn--add-module`、`.md3-color-picker__trigger:hover`、预设圆点 hover |
| `--md-elevation-2` | `0 1px 2px ..., 0 2px 6px 2px ...` | `.btn--add-module:hover` |
| `--md-elevation-3` | `0 1px 3px ..., 0 4px 8px 3px ...` | `.md3-color-picker__popover` |

**形状**

| 变量 | 值 | 使用位置 |
| --- | --- | --- |
| `--md-shape-extra-small` | `4px` | 文本框 / 下拉 / `.paper-settings__outlined-field` / `.md3-cp__textfield-notch` |
| `--md-shape-small` | `8px` | `.md3-color-picker__trigger`、`.preset-templates__header` |
| `--md-shape-medium` | `12px` | 分区卡片、`.element-instance`、饱和度画布、空状态 |
| `--md-shape-large` | `16px` | 未使用 |
| `--md-shape-extra-large` | `28px` | `.md3-color-picker__popover` |
| `--md-shape-full` | `9999px` | 序号徽章、`.md3-toggle` 及其选项、预设圆点、页脚版本徽章 |

**状态层透明度**

| 变量 | 值 | 使用位置 |
| --- | --- | --- |
| `--md-state-hover` | `0.08` | `.preset-templates__header:hover`、`.md3-color-picker__trigger:hover::after`、`.btn--add-module:hover::after` |
| `--md-state-focus` | `0.12` | 未使用 |
| `--md-state-pressed` | `0.12` | `.btn--add-module:active::after` |

**字体（字号）**

| 变量 | 值 | 使用位置 |
| --- | --- | --- |
| `--md-typescale-headline-small` | `1.5rem` | `.app__header h1` |
| `--md-typescale-title-large` | `1.375rem` | 分区标题 `h3`、`.preset-templates__header-title` |
| `--md-typescale-title-medium` | `1.125rem` | `html.mobile .app__header h1` |
| `--md-typescale-title-small` | `1rem` | `.element-instance__title`、`.element-group__title`、`.app__footer-name` |
| `--md-typescale-label-large` | `0.9375rem` | `.paper-settings__field label` |
| `--md-typescale-label-medium` | `0.875rem` | `.preset-templates__btn` |
| `--md-typescale-label-small` | `0.8125rem` | `.element-instance__index`、`.app__footer-version` |
| `--md-typescale-body-large` | `1rem` | 文本框 / 下拉 / `.paper-settings__outlined-field` |
| `--md-typescale-body-medium` | `0.9375rem` | `body`、`.element-panel__field label`、`.element-empty` |
| `--md-typescale-body-small` | `0.875rem` | `.element-panel__note`、`.app__footer-meta` |

**间距 / 尺寸 / 过渡**

| 变量 | 值 | 使用位置 |
| --- | --- | --- |
| `--md-spacing-xs` | `4px` | `.element-panel__field--checkbox`、页脚说明项间距 |
| `--md-spacing-sm` | `8px` | 卡片网格 gap、字段行 gap、页脚品牌行 gap |
| `--md-spacing-md` | `16px` | `.app__main` 内边距、列表 gap、卡片内边距、页脚内边距 |
| `--md-spacing-lg` | `24px` | 卡片内边距、字段下间距、顶栏内边距、页脚纵向内边距 |
| `--md-spacing-xl` | `32px` | 未使用 |
| `--md-field-height` | `56px` | `.paper-settings__outlined-field`、颜色型 `input[type=color]` |
| `--md-field-height-dense` | `48px` | 未使用 |
| `--md-transition` | `0.2s cubic-bezier(0.2, 0, 0, 1)` | 全站通用的边框 / 颜色 / 变换过渡 |

### 3.2 局部与组件级变量

| 变量 | 值 | 说明 |
| --- | --- | --- |
| `--md-field-bg` | `rgb(var(--md-surface-container-low))` | 定义于分区卡片规则块，**当前无消费方**（遗留） |
| `--mdui-comp-ripple-state-layer-color` | `var(--md-error)` | `.element-icon-btn--remove` 的涟漪语义色 |

### 3.3 mdui 动效令牌（定义于 `mdui.css` 的 `:root`，全局可用）

| 变量 | 值 | 使用位置 |
| --- | --- | --- |
| `--mdui-motion-duration-short3` | `150ms` | `.preset-templates__header` hover、`.md3-toggle__option` 文字过渡 |
| `--mdui-motion-duration-short4` | `200ms` | `.preset-templates__chevron` 旋转、胶囊指示器、`.element-item--leaving` 淡出 |
| `--mdui-motion-duration-medium2` | `300ms` | `.element-item` 入场/离场 |
| `--mdui-motion-duration-medium4` | `400ms` | 由 `mdui-collapse-item` 内部使用 |
| `--mdui-motion-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | hover / 文字过渡 |
| `--mdui-motion-easing-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | 入场、箭头旋转、胶囊滑动 |
| `--mdui-motion-easing-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | 离场收起 |

### 3.4 `index.css` 的旧版变量（模板残留）

`--bg: #f5f5f5`、`--bg-card: #ffffff`、`--bg-sidebar: #fafafa`、`--text: #333333`、`--text-secondary: #666666`、`--border: #e0e0e0`、`--accent: #4a90d9`、`--accent-hover: #357abd`、`--danger: #d9534f`、`--danger-hover: #c9302c`、`--shadow: 0 2px 8px rgba(0,0,0,.08)`、`--radius: 8px`。
仅被 `index.css` 自身 `:root` 的 `color` / `background` 引用，随后被 `App.css` 的 `body` 规则覆盖；**`App.css` 中无任何引用**。

---

## 四、组件清单

### 应用层

| 组件 | 功能 / 视觉 | 使用的 CSS 变量 | 嵌套关系 |
| --- | --- | --- | --- |
| **App**<br>`src/App.tsx` | 应用根：顶栏（标题 + 语言 `Md3Toggle` + 下载 `mdui-button`，下载键在字体处理中会 `loading` + `disabled`）+ 主区侧栏 + 页面底部 About 页脚 | `--md-surface`、`--md-outline-variant`、`--md-on-surface(-variant)`、`--md-typescale-headline-small`、`--md-spacing-*`、`--md-shape-full` | 包含 PresetTemplates、PaperSettings、ElementPanel、Md3Toggle 与 About 页脚；导出时动态 `import()` PDF 模块，并按各「文字」模块的 `fontId` 过滤出实际用到的自定义字体传入 `generatePDF` |
| **FontSelect**<br>`components/FontSelect.tsx` | 「文字」模块内置的字体控件（由 TextPanel 在三种模式下各渲染一次）：`Md3Select` 选择内置 MiSans / 已上传字体、右对齐「选择文件」`mdui-button`（隐藏 `input[type=file]`，`accept=".woff2,.ttf,.otf"`）、隐私说明小字、已上传字体列表（族名 + 格式/体积 + `mdui-button-icon` 移除）。上传成功后自动套用到当前模块；失败按原因弹出 `mdui-dialog` 警告 | `--md-surface-container-low`、`--md-outline-variant`、`--md-shape-small`、`--md-error`、`--md-typescale-body-small`、`--md-spacing-*` | 被 TextPanel 包含；使用 Md3Select / `mdui-button` / `mdui-button-icon`；字体校验走 `src/fonts/index.ts`，成功提示走 `src/utils/toast.ts`，失败提示走 `src/utils/dialog.ts` |
| **PresetTemplates**<br>`components/PresetTemplates.tsx` | 预设模板折叠区：`mdui-collapse` + `mdui-collapse-item`，网格展示 12 套模板，点击套用 | `--md-shape-small`、`--md-spacing-*`、`--md-typescale-title-large`/`label-medium`、`--md-on-surface(-variant)`、`--md-state-hover`、mdui motion | 被 App 包含；内含 `mdui-button`（头部插槽与模板卡片） |
| **PaperSettings**<br>`components/PaperSettings.tsx` | 纸张设置：类型、自定义宽高、方向、份数、双面装订、四边留白（2×2）、背景色 | `--md-field-height`、`--md-shape-extra-small`、`--md-outline`、`--md-primary`、`--md-surface-container-low`、`--md-typescale-*`、`--md-spacing-*` | 被 App 包含；使用 Md3Select / Md3Collapse / Md3Toggle / Md3Switch / Md3ColorPicker / NumberInput |
| **ElementPanel**<br>`components/ElementPanel.tsx` | 模块管理：顶部添加控件（`Md3Select` + `mdui-button`）、空状态、模块卡片列表（序号徽章 + 复制/添加同类/移除三个 `mdui-button-icon`），并驱动增删动画 | `--md-surface-container-low`、`--md-outline-variant`、`--md-shape-medium/full`、`--md-primary-container`、`--md-error`、`--md-spacing-*`、mdui motion、`--mdui-comp-ripple-state-layer-color` | 被 App 包含；包含 9 个 Element Panel |

### 元素参数面板（`components/elements/`，9 个）

`IntervalLinePanel`、`DiagonalPanel`、`DotPanel`、`SingleLinePanel`、`TextPanel`、`BlockPanel`、`CirclePanel`、`QRCodePanel`、`WatermarkPanel`。

- **功能**：分别编辑各类型模块参数（开关、颜色、偏移、范围、忽略留白 + 各自的专有参数）。`IntervalLinePanel` / `DiagonalPanel` 的「外框样式」为三选（无 / 实线 / 虚线），条件项（`外框粗细` / `外框虚线间隔`）用 `Md3Collapse` 折叠；「线条样式」为虚线时折叠显示「虚线间隔」。`DiagonalPanel` 的「斜线方向」支持 左上→右下 / 右上→左下 / 双向。`TextPanel` 为整合后的「文字」模块，内含 标题 / 页码 / 单文字 三种模式（由「切换模式」`Md3Toggle` 控制，默认标题），并在三种模式的「字体大小」下方统一内嵌 `FontSelect` 字体控件；`WatermarkPanel` 额外含「选择文件」按钮。
- **视觉**：统一 `.element-fields` 容器 + `.element-panel__field` 表单行结构。
- **CSS 变量**：`--md-typescale-body-medium`、`--md-on-surface-variant`、`--md-outline`、`--md-shape-extra-small`、`--md-spacing-*`。
- **嵌套**：被 ElementPanel 按 `el.type` 动态渲染；内部复用 Md3Switch / Md3ColorPicker / Md3Toggle / Md3Select / Md3Slider / Md3Collapse / NumberInput。
- 注：`.element-fields`、`.element-panel__number`、`.element-panel__text`、`.element-panel__label` 在 `App.css` 中**无专属规则**，仅为语义类名；样式由 `.element-panel__field` 及其后代选择器提供。

### 可复用 UI 组件（`components/`）

| 组件 | 功能 / 视觉 | 使用的 CSS 变量 | 嵌套 / 依赖 |
| --- | --- | --- | --- |
| **Md3Select** | 基于 `mdui-dropdown` + `mdui-menu(selects="single")` 的下拉选择（非原生 `<select>`），宽度随触发器同步 | `--md-outline`、`--md-on-surface`、`--md-primary`、`--md-shape-extra-small`、`--md-typescale-body-large`、`--md-transition` | 被 ElementPanel、PaperSettings 及各 Panel 使用 |
| **Md3Toggle** | 胶囊滑动切换（分段控件），含绝对定位 `__indicator`，支持方向键 / Home / End | `--md-surface-container-high`、`--md-on-secondary-container`、`--md-on-surface(-variant)`、`--md-primary`、mdui motion | 用于 App（语言）、PaperSettings（方向）、TextPanel（切换模式 / 各参数）等 |
| **Md3Switch** | `mdui-switch` 受控封装（`ref` + `addEventListener` 同步，React 无法绑定自定义元素事件） | 仅 `flex-shrink` 布局修正 | 用于 PaperSettings 及各 Panel 的开关项 |
| **Md3Collapse** | 通用高度自适应折叠容器（`grid-template-rows` 0fr↔1fr，收起时 `inert`） | `--md-transition` | 被 PaperSettings（自定义宽高、偶数页留白）及 IntervalLinePanel / DiagonalPanel（外框条件项、虚线间隔）使用 |
| **Md3Slider** | 轻量滑块，Pointer Events 统一鼠标/触屏，无外部依赖 | `--md-surface-container-highest`、`--md-primary`、`--md-transition` | 供数值型参数面板使用 |
| **Md3ColorPicker** | MD3 取色器：触发色块 + 弹层（饱和度画布、色相条、HEX/RGB/HSL 切换、notch 输入框、预设色圆点） | `--md-outline`、`--md-shape-*`、`--md-elevation-1/3`、`--md-surface-container-high`、`--md-primary`、`--md-on-surface(-variant)`、`--md-shadow`、`--md-state-hover`、`--md-spacing-*`、`--md-transition`、mdui motion | 被 PaperSettings（背景色）及所有颜色相关 Panel 使用；模式切换复用项目自研的 `Md3Toggle`（`.md3-cp__mode-group` 内等宽铺满） |
| **NumberInput** | 数字输入：`type="text"` + `inputMode` + 正则过滤 + 失焦归一化，保留小数中间态 | 无（复用父级字段样式） | 被 PaperSettings 及各 Panel 使用 |
| **Preview**<br>`components/Preview.tsx` | 画布预览组件（约 370 行） | — | **当前未被任何文件引用**（遗留 / 未接入，已被构建摇树移除，不影响产物） |

### 非组件基础设施

| 模块 | 说明 |
| --- | --- |
| `i18n/index.tsx` + `locales/{zh-hans,en}.json` | `I18nProvider` / `useTranslation`，支持 `?lang=` 指定语言；未指定时按浏览器 `Accept-Language` 偏好（`navigator.languages`）自动判定（中文及其衍生 → 简体中文，其余 → English），并同步 `document.documentElement.lang` |
| `store/useStore.ts` | Zustand：`paperSettings`、`elements`、`language`、`isGenerating` 及增删改动作；自定义字体库 `customFonts`、`fontLoading` 及 `addCustomFont` / `removeCustomFont` / `setFontLoading`（移除字体时把仍引用它的文字模块回退到内置 MiSans）。**字体选用存于各「文字」模块的 `settings.fontId`，无全局 `fontId`** |
| `fonts/index.ts` | 字体校验与解析：扩展名白名单（`.woff2/.ttf/.otf`）、50MB 上限、20s 超时、`fontkit` 动态 `import()` 预检合法性与 CMAP、`arrayBufferToBase64` / `createFontId` 工具；**字体显示名解析** `resolveDisplayName` 直接读取 fontkit 解析出的 OpenType `name` 表记录，按语言优先级（UI 语言含中文繁体变种 → 同主语言 → EN-US/EN → 任意记录 → 文件名）挑选，同一语言内按 Typographic Family(16) → Font Family(1) → Full name(4) 取字段，语言无关且天然兼容 ttf/otf/woff/woff2 |
| `utils/toast.ts` | 轻量消息提示：动态插入 `mdui-snackbar`（`placement="bottom"` 固定底部弹出），待首次渲染完成（`updateComplete`）后再置 `open` 以播放进场动画，`closed` 后自动移除，供字体加载成功/回退提示使用。字号在 `App.css` 中把 `--mdui-typescale-body-medium-*` 覆写为 `body-large` 令牌以适当增大 |
| `utils/dialog.ts` | 对话框工具：`showWarningDialog(headline, description)` 与 `showConfirmDialog(headline, description, confirmText, cancelText)`（`Promise<boolean>`）。均动态创建 `mdui-dialog`（`close-on-overlay-click` + `close-on-esc`）+ `@mdui/icons` 的 `<mdui-icon-warning>`（slot="icon"），待首次渲染完成（`updateComplete`）后再置 `open` 以播放进场动画，`closed` 后自动移除；警告框供字体解析失败/格式拒绝/文件过大提示使用，确认框用于导出前复杂度拦截（取消/继续导出） |
| `pdf/generator.ts` | pdfmake 绘制、QRCode 生成、水印不透明度烘焙、网格密度校验、**导出前复杂度预估 `estimateDrawPrimitives` + 阈值 `SAFE_THRESHOLD`（20 万）**、新窗口打开 PDF；字体按元素注册与选用 —— 内置 MiSans 始终注册为默认/回退（复用缓存的同一 base64 字符串引用），各「文字」模块按 `settings.fontId` 以 `Datum-${id}` 族名注册并写入节点 `font`（自定义字体在导出内**局部**由 ArrayBuffer 临时转 base64 注入 VFS），族名缺失/非法一律回落 MiSans；自定义字体嵌入异常时递归回退全部 `font` 节点为 MiSans 重试并返回 `fontFallback: true`。**经 `App.tsx` 动态 `import()` 按需加载** |
| `templates/index.ts` | 12 套预设模板数据 |
| `types/index.ts` | 纸张尺寸表与 9 类元素设置类型定义（`TextSettings` 含 title / single / pageNumber 三组子设置，以及三模式共用的 `fontId`；`FrameStyle` 为外框三态，`DiagonalLineDirection` 为斜线方向）；`FontFormat` / `CustomFont`（`data: ArrayBuffer` 存原始二进制）与 `BUILTIN_FONT_ID` |
| `mdui-jsx.d.ts` | 引用 `mdui/jsx.zh-cn.d.ts`，为 JSX 提供 mdui 自定义元素类型 |
| `vite.config.ts` | 构建配置：vendor 分包（`codeSplitting`）、局域网 host、`legalNotices` 构建插件（输出 MiSans 协议 + 自动收集依赖 License 生成 `THIRD-PARTY-NOTICES.txt`） |
| `Dockerfile` | 多阶段构建：`node:22.23.4-alpine` 内 `npm ci && npm run build`，再用 `nginx:alpine` 托管 `dist/`；许可证文件随镜像分发 |
| `src/MiSans/LICENSE-MiSans.txt` | MiSans 字体知识产权许可协议原文（构建时复制到 `dist/LICENSE-MiSans.txt`） |

---

## 五、复用关系

- **设计令牌集中一处**：所有组件的颜色 / 形状 / 字号 / 间距 / 过渡都引用 `App.css` `:root` 的 `--md-*` 令牌，改色改尺寸只需改 `:root`。
- **分区卡片共用一条规则**：`.preset-templates`、`.paper-settings`、`.element-group` 共用同一背景 / 边框 / 圆角 / 内边距规则块（分区标题规则同理共用）。
- **表单行共用**：`.element-panel__field` + `.element-panel__field label` 被 PaperSettings 与全部 9 个元素面板复用。
- **文本框外观共用**：`.paper-settings__outlined-field`、`.element-panel__field input/select`、`.md3-select__trigger`、`.md3-cp__textfield-notch` 遵循同一套「1px `--md-outline` → 聚焦 2px `--md-primary` + padding 补偿」范式。
- **卡片与动画分离**：`.element-instance`（外观）被所有模块类型复用；`.element-item`（外层）仅负责增删动画，二者解耦。
- **卡片网格复用**：`.preset-templates__grid` 与 `.md3-color-picker__presets` 均用 Grid + `--md-spacing` 控制列与间距。
- **mdui 组件复用**：`mdui-button`（下载、添加模块、预设头部/卡片、选择文件）、`mdui-button-icon`（卡片三操作、移除已上传字体）、`mdui-switch`（全部开关）、`mdui-dropdown` + `mdui-menu`（Md3Select）、`mdui-collapse` + `mdui-collapse-item`（PresetTemplates）、`mdui-dialog`（字体异常提示）。
- **自研切换控件复用**：`Md3Toggle`（胶囊滑动切换）用于语言、纸张方向、「文字」模块切换模式与各分段参数、以及颜色选择器的 HEX/RGB/HSL 切换。
- **动效令牌复用**：`.md3-toggle`、`.element-item`、`.preset-templates__header`、取色器模式组统一引用 `--mdui-motion-*`，保证节奏一致。
- **全局共享 + 局部选用范式**：自定义字体库 `customFonts` 存于全局 store（多处复用、只上传一次），而「用哪一个」下沉到各「文字」模块的 `settings.fontId`——UI 复用同一 `FontSelect`，导出时按元素解析族名。
- **自定义元素事件范式复用**：Md3Switch / Md3Select / PresetTemplates 均采用 `ref` + `addEventListener('change')` + `useLayoutEffect` 受控同步，新增 mdui 封装组件时应沿用。
- **国际化复用**：所有界面文案经 `t()` 取自 `locales/*.json`，组件内不硬编码中文。

> 备注：
> - 仓库内与项目无关的文件已清理（`src/demo/`、`src/App.css.bak`、`public/icons.svg`、`src/assets/*`、`datum.pdf`、`mduillms.txt`，以及 `src/MiSans/` 下除 `woff2/` 外的 otf / woff / ttf / 可变字体）；正式样式以 `src/App.css` 为准。
> - `src/MiSans/` 现仅保留 `woff2/` 目录，其中有 10 个字重文件，但仅 Normal(400)、Medium(500) 被 `@font-face` 引用并进入产物；其余字重为源文件冗余，可按需清理。其中 `MiSans-Normal.woff2` 同时被 `pdf/generator.ts` 通过 `new URL(..., import.meta.url)` 引用（导出 PDF 时注册内置字体），Vite 按内容哈希去重为单一产物文件。
> - 新增重依赖时优先考虑动态 `import()` 按需加载，避免重新把首屏包撑大。

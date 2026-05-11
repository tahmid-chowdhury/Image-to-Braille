# Image-to-Braille

Browser-based single-page app. No build tools, tests, or package manager. Open `index.html` directly in browser.

## Architecture

- **Entry point**: `index.html` (uses ES modules via `<script type="module">`)
- **Core files**:
  - `main.js` - UI initialization, drag-drop/paste handling, keyboard shortcuts, reset functionality
  - `braille.js` - greyscale conversion, pixel-to-braille mapping, Dithering class
  - `settings.js` - settings state, localStorage persistence, reset function
  - `style.css` - styling + dark theme + loading/error states + responsive layout

## Critical Implementation Details

### ES Modules
- `main.js` is the entry point (imported via `<script type="module">`)
- `settings.js` exports `settings` object, `saveSettings()`, `resetSettings()`, `defaultSettings`
- `braille.js` exports `createImageCanvas()` and `canvasToText()`

### Global State
- `settings` object in `settings.js` holds all state (width, greyscale_mode, inverted, dithering, monospace, darktheme, preview, threshold)
- Settings auto-persist to localStorage under key `braille-converter-settings`
- `lastSource`, `lastCanvas`, `lastPreviewSrc`, `currentImageName` are module-level in main.js
- `settings.lastDithering` caches dithered image data (reset on any setting change)

### Image Loading
- Listens for: file input, drag-drop, paste from clipboard
- Uses `URL.createObjectURL()` - revokes previous URLs to prevent memory leaks
- `getAsFile()` has fallback to `files[0]` for Safari compatibility
- Default image load failure shows helpful message instead of error

### Canvas Dimensions
- Width snapped to `width % 2 == 0`
- Height snapped to `height % 4 == 0`
- Minimum canvas: 2x4 pixels

### Braille Encoding
- Unicode range U+2800 to U+28FF
- Dot positions: `[0, 1, 2, 6, 3, 4, 5, 7]` shift values
- Empty char offset is 4 to avoid blank `⠀`

### Greyscale Modes
- `luminance` (default): `0.22*r + 0.72*g + 0.06*b`
- `lightness`: `(max + min) / 2`
- `average`: `(r + g + b) / 3`
- `value`: `max(r, g, b)`

## UI Features

- Loading spinner (#loading) - toggled via `showLoading(bool)`
- Error message (#error-message) - shown via `showError(msg)`, auto-hides after 5s
- Debounced width input (300ms)
- Debounced threshold slider (150ms)
- Clipboard fallback: Clipboard API → execCommand fallback
- Dark theme toggle adds/removes `.dark` class on textarea
- Settings persist across sessions via localStorage
- Image preview panel (toggleable)
- Custom threshold slider (0-255)
- Export to .txt file (prevents empty exports)
- Reset to defaults button

## Keyboard Shortcuts

- `Ctrl+C` - Copy output to clipboard (when not focused on textarea)
- `Ctrl+I` - Toggle invert
- `Ctrl+D` - Toggle dithering
- `Ctrl+Shift+S` - Save as .txt file

## Responsive Design

- Desktop: 3-column layout (preview | output | options)
- Tablet (<900px): stacked layout with options in horizontal wrap
- Mobile (<600px): full vertical stack

## Accessibility

- All form controls have associated `<label>` elements
- ARIA labels on inputs and button
- Focus indicators in CSS
- Error/loading states use `role="alert"` and `aria-live="polite"`

## Data Flow

```
User Input → applySetting() → saveSettings() → reparse() → canvasToText()
                                     ↓
                              localStorage (persisted)
```
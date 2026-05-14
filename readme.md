# Image to Braille Converter

Convert any image into braille text art that can be read in any browser or text editor.

[**Try it live**](https://tahmid-chowdhury.github.io/Image-to-Braille/)

## Features

- **Multiple input methods** - Drag & drop, paste from clipboard, or upload a file
- **Customizable output** - Adjust width, threshold, and greyscale mode
- **Visual preview** - Toggle an image preview panel to compare original with braille
- **Export options** - Copy to clipboard or download as `.txt` file
- **Dithering mode** - Enable Floyd-Steinberg dithering for artistic effect
- **Dark theme** - Toggle between light and dark output
- **Settings persistence** - Your preferences are saved automatically

## Greyscale Modes

| Mode | Formula |
|------|---------|
| Luminance (default) | 0.22r + 0.72g + 0.06b |
| Lightness | (max + min) / 2 |
| Average | (r + g + b) / 3 |
| Value | max(r, g, b) |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Copy output to clipboard |
| `Ctrl+I` | Toggle invert |
| `Ctrl+D` | Toggle dithering |
| `Ctrl+Shift+S` | Save as .txt file |

## Usage

1. Open `index.html` in any modern browser
2. Drop an image onto the page, paste from clipboard, or use the file picker
3. Adjust settings as needed
4. Copy or export your braille output

## Technical Details

- Pure JavaScript (no build tools required)
- ES Modules architecture
- Unicode braille characters (U+2800 to U+28FF)
- Canvas-based image processing
- Responsive design (works on mobile)

## Local Development

```bash
# Start a local server
python -m http.server 8080

# Then open http://localhost:8080
```

## Credits

Original project by [505e06b2](https://github.com/505e06b2/Image-to-Braille). Modernized with additional features, accessibility improvements, and GitHub Actions CI/CD.
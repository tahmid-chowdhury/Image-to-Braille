import { settings } from './settings.js';

const ALPHA_THRESHOLD = 128;

const GREYSCALE_MODES = {
	luminance: (r, g, b) => 0.22 * r + 0.72 * g + 0.06 * b,
	lightness: (r, g, b) => (Math.max(r, g, b) + Math.min(r, g, b)) / 2,
	average: (r, g, b) => (r + g + b) / 3,
	value: (r, g, b) => Math.max(r, g, b),
};

const SHIFT_VALUES = [0, 1, 2, 6, 3, 4, 5, 7];
const BRAILLE_OFFSET = 0x2800;
const BLANK_OFFSET = 4;

export function createImageCanvas(src) {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement("CANVAS");
		const image = new Image();

		image.onload = () => {
			let width = image.width;
			let height = image.height;

			const targetWidth = Math.max(2, settings.width) * 2;

			if (image.width !== targetWidth) {
				width = targetWidth;
				height = Math.round((width / image.width) * image.height);
			}

			canvas.width = width - (width % 2);
			canvas.height = height - (height % 4);

			if (canvas.width < 2 || canvas.height < 4) {
				reject(new Error('Image too small after processing.'));
				return;
			}

			const ctx = canvas.getContext("2d");
			ctx.fillStyle = "#FFFFFF";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

			resolve(canvas);
		};

		image.onerror = () => reject(new Error('Failed to load image.'));

		image.src = src;
	});
}

function toGreyscale(r, g, b) {
	const fn = GREYSCALE_MODES[settings.greyscale_mode];
	return fn ? fn(r, g, b) : 0;
}

function pixelsToCharacter(pixels) {
	let codepoint = 0;
	for (let i = 0; i < 8; i++) {
		codepoint += pixels[i] << SHIFT_VALUES[i];
	}

	if (codepoint === 0 && !settings.monospace) {
		codepoint = BLANK_OFFSET;
	}

	return String.fromCodePoint(BRAILLE_OFFSET + codepoint);
}

export function canvasToText(canvas) {
	const ctx = canvas.getContext("2d");
	const width = canvas.width;
	const height = canvas.height;
	const threshold = settings.threshold;

	let imageData;
	if (settings.dithering) {
		if (!settings.lastDithering || settings.lastDithering.canvas !== canvas) {
			settings.lastDithering = new Dithering(canvas, threshold);
		}
		imageData = settings.lastDithering.image_data;
	} else {
		imageData = new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data);
	}

	const rows = height / 4;
	const cols = width / 2;
	let output = '';

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const braille = [0, 0, 0, 0, 0, 0, 0, 0];
			let dotIndex = 0;

			for (let x = 0; x < 2; x++) {
				for (let y = 0; y < 4; y++) {
					const px = col * 2 + x;
					const py = row * 4 + y;
					const idx = (py * width + px) * 4;

					const alpha = imageData[idx + 3];
					if (alpha >= ALPHA_THRESHOLD) {
						const grey = toGreyscale(
							imageData[idx],
							imageData[idx + 1],
							imageData[idx + 2]
						);
						const isLit = settings.inverted ? grey >= threshold : grey < threshold;
						braille[dotIndex] = isLit ? 1 : 0;
					}
					dotIndex++;
				}
			}
			output += pixelsToCharacter(braille);
		}
		output += '\n';
	}

	return output;
}

class Dithering {
	constructor(canvas, threshold = 128) {
		this.canvas = canvas;
		this.threshold = threshold;
		this.image_data = new Uint8ClampedArray(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data);

		this._process();
	}

	_process() {
		const w = this.canvas.width;
		const h = this.canvas.height;
		const data = this.image_data;
		const threshold = this.threshold;

		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const idx = (y * w + x) * 4;
				const oldR = data[idx];
				const oldG = data[idx + 1];
				const oldB = data[idx + 2];

				const luminance = 0.2126 * oldR + 0.7152 * oldG + 0.0722 * oldB;
				const newL = luminance > threshold ? 255 : 0;

				data[idx] = newL;
				data[idx + 1] = newL;
				data[idx + 2] = newL;
				data[idx + 3] = 255;

				const err = luminance - newL;

				if (x + 1 < w) this._addError(x + 1, y, err, 7 / 16, w);
				if (x > 0 && y + 1 < h) this._addError(x - 1, y + 1, err, 3 / 16, w);
				if (y + 1 < h) this._addError(x, y + 1, err, 5 / 16, w);
				if (x + 1 < w && y + 1 < h) this._addError(x + 1, y + 1, err, 1 / 16, w);
			}
		}
	}

	_addError(x, y, err, factor, canvasWidth) {
		const idx = (y * canvasWidth + x) * 4;
		this.image_data[idx] = this._clip(this.image_data[idx] + err * factor);
		this.image_data[idx + 1] = this._clip(this.image_data[idx + 1] + err * factor);
		this.image_data[idx + 2] = this._clip(this.image_data[idx + 2] + err * factor);
	}

	_clip(v) {
		return v < 0 ? 0 : v > 255 ? 255 : v;
	}
}

export { Dithering };
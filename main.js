import { settings, saveSettings, resetSettings, defaultSettings } from './settings.js';
import { createImageCanvas, canvasToText } from './braille.js';

let debounceTimer = null;
let lastSource = "";
let lastCanvas = null;
let lastPreviewSrc = "";
let currentImageName = "braille-art";

export function showLoading(show) {
	document.getElementById('loading').classList.toggle('visible', show);
}

export function showError(message) {
	const el = document.getElementById('error-message');
	el.textContent = message;
	el.classList.add('visible');
	setTimeout(() => el.classList.remove('visible'), 5000);
}

function clearError() {
	document.getElementById('error-message').classList.remove('visible');
}

function applySetting(key, value) {
	settings[key] = value;
	saveSettings(settings);
}

function setUIElement(selector, value) {
	const elem = document.querySelector(selector);
	const type = elem.getAttribute("type");
	if (type === "checkbox") {
		elem.checked = value;
	} else {
		elem.value = value;
	}
	return elem;
}

function reparse() {
	if (lastCanvas) {
		settings.lastDithering = null;
		parseCanvas(lastCanvas);
	}
}

function initUI() {
	document.body.ondragover = (e) => {
		e.preventDefault();
		document.body.style.outline = '3px dashed #3498db';
	};
	document.body.ondragleave = () => {
		document.body.style.outline = '';
	};
	document.body.ondrop = (e) => {
		e.preventDefault();
		document.body.style.outline = '';
		const file = e.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			currentImageName = file.name.replace(/\.[^/.]+$/, '') || 'braille-art';
			loadNewImage(URL.createObjectURL(file));
		} else {
			showError('Please drop a valid image file.');
		}
	};

	document.body.onpaste = (e) => {
		e.preventDefault();
		const items = e.clipboardData.items;
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				currentImageName = 'pasted-image';
				const file = item.getAsFile ? item.getAsFile() : e.clipboardData.files[0];
				loadNewImage(URL.createObjectURL(file));
				return;
			}
		}
		showError('No image found in clipboard.');
	};

	document.addEventListener('keydown', (e) => {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case 'c':
					if (document.activeElement === document.getElementById('text')) return;
					e.preventDefault();
					document.getElementById('clipboard').click();
					break;
				case 'i':
					e.preventDefault();
					document.getElementById('inverted').click();
					break;
				case 'd':
					e.preventDefault();
					document.getElementById('dithering').click();
					break;
				case 's':
					if (!e.shiftKey) return;
					e.preventDefault();
					document.getElementById('export').click();
					break;
			}
		}
	});

	document.querySelector('input[type="file"]').onchange = (e) => {
		const file = e.target.files[0];
		if (file) {
			currentImageName = file.name.replace(/\.[^/.]+$/, '') || 'braille-art';
			loadNewImage(URL.createObjectURL(file));
		}
	};

	setUIElement('#preview-toggle', settings.preview).onchange = (e) => {
		applySetting('preview', e.target.checked);
		document.getElementById('preview-container').classList.toggle('visible', e.target.checked);
	};

	setUIElement('#darktheme', settings.darktheme).onchange = (e) => {
		applySetting('darktheme', e.target.checked);
		document.getElementById('text').classList.toggle('dark', e.target.checked);
	};

	setUIElement('#inverted', settings.inverted).onchange = (e) => {
		applySetting('inverted', e.target.checked);
		reparse();
	};

	setUIElement('#dithering', settings.dithering).onchange = (e) => {
		applySetting('dithering', e.target.checked);
		reparse();
	};

	setUIElement('#monospace', settings.monospace).onchange = (e) => {
		applySetting('monospace', e.target.checked);
		reparse();
	};

	const thresholdSlider = document.getElementById('threshold');
	const thresholdValue = document.getElementById('threshold-value');
	thresholdSlider.value = settings.threshold;
	thresholdValue.textContent = settings.threshold;

	let thresholdDebounceTimer = null;
	thresholdSlider.oninput = () => {
		thresholdValue.textContent = thresholdSlider.value;
		clearTimeout(thresholdDebounceTimer);
		thresholdDebounceTimer = setTimeout(() => {
			applySetting('threshold', parseInt(thresholdSlider.value, 10));
			reparse();
		}, 150);
	};

	document.getElementById('greyscale_mode').onchange = (e) => {
		applySetting('greyscale_mode', e.target.value);
		reparse();
	};

	setUIElement('#width', settings.width).onchange = (e) => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const val = parseInt(e.target.value, 10);
			if (isNaN(val) || val < 2 || val > 500) {
				showError('Width must be between 2 and 500.');
				return;
			}
			applySetting('width', val);
			loadNewImage(lastSource);
		}, 300);
	};

	document.getElementById('clipboard').onclick = async () => {
		const text = document.getElementById('text').value;
		try {
			await navigator.clipboard.writeText(text);
			const btn = document.getElementById('clipboard');
			const original = btn.textContent;
			btn.textContent = 'Copied!';
			setTimeout(() => btn.textContent = original, 2000);
		} catch {
			document.getElementById('text').select();
			document.execCommand('copy');
		}
	};

	document.getElementById('export').onclick = () => {
		const text = document.getElementById('text').value;
		if (!text.trim()) {
			showError('No braille output to export.');
			return;
		}
		const blob = new Blob([text], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${currentImageName}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	};

	document.getElementById('reset').onclick = () => {
		const fresh = resetSettings();
		Object.assign(settings, fresh);

		document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
			const id = cb.id;
			if (settings.hasOwnProperty(id)) {
				cb.checked = settings[id];
			}
		});

		setUIElement('#width', settings.width);
		setUIElement('#threshold', settings.threshold);
		document.getElementById('threshold-value').textContent = settings.threshold;
		setUIElement('#greyscale_mode', settings.greyscale_mode);

		document.getElementById('text').classList.toggle('dark', settings.darktheme);
		document.getElementById('preview-container').classList.toggle('visible', settings.preview);

		showError('Settings reset to defaults.');
		reparse();
	};
}

async function loadNewImage(src) {
	if (!src) return;

	clearError();
	showLoading(true);

	if (lastSource && lastSource !== src) {
		URL.revokeObjectURL(lastSource);
	}

	lastSource = src;

	try {
		const canvas = await createImageCanvas(src);
		lastCanvas = canvas;

		if (lastPreviewSrc) {
			URL.revokeObjectURL(lastPreviewSrc);
		}
		lastPreviewSrc = src;
		const preview = document.getElementById('preview');
		preview.src = src;

		await parseCanvas(canvas);
	} catch (err) {
		showError('Failed to load image: ' + err.message);
	} finally {
		showLoading(false);
	}
}

async function parseCanvas(canvas) {
	if (!canvas) return;

	const text = canvasToText(canvas);
	document.getElementById('text').value = text;
	document.getElementById('charcount').textContent = text.length;
}

window.addEventListener('DOMContentLoaded', () => {
	initUI();

	if (settings.darktheme) {
		document.getElementById('text').classList.add('dark');
	}

	if (settings.preview) {
		document.getElementById('preview-container').classList.add('visible');
	}

	loadNewImage("select.png").catch(() => {
		document.getElementById('charcount').parentElement.textContent = 'Drop an image or paste from clipboard to begin';
	});
});
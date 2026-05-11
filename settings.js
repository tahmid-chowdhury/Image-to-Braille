const STORAGE_KEY = 'braille-converter-settings';

export const defaultSettings = {
	width: 62,
	greyscale_mode: "luminance",
	inverted: false,
	dithering: false,
	monospace: false,
	darktheme: false,
	preview: false,
	threshold: 128,
};

export function loadSettings() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...defaultSettings, ...parsed };
		}
	} catch {
		// ignore
	}
	return { ...defaultSettings };
}

export function saveSettings(settings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (e) {
		console.warn('Failed to save settings:', e);
	}
}

export function resetSettings() {
	localStorage.removeItem(STORAGE_KEY);
	return { ...defaultSettings };
}

export const settings = loadSettings();
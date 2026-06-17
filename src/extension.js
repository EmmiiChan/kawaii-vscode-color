const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const settings = require('./settings');
const {
	NEON_SCRIPT_FILE_NAME,
	applyWorkbenchPatchScriptTag,
	isWorkbenchPatchEnabled,
	removeWorkbenchPatchScriptTag,
	resolveWorkbenchPatchPaths
} = require('./workbenchPatch');

const COLOR_THEME_SETTING = "workbench.colorTheme";
const KAWAII_VSCODE_COLOR_THEME_LABELS = [
	"Kawaii VS Code Color",
	"Kawaii VS Code Color Light"
];
const EDITOR_BACKGROUND_IMAGE_STATE_KEY = 'kawaii_synthwave.editorBackgroundImage';
const EDITOR_BACKGROUND_OPACITY_STATE_KEY = 'kawaii_synthwave.editorBackgroundOpacity';
const EDITOR_BACKGROUND_IMAGE_FILE_PREFIX = 'editor-background-image';
const EDITOR_BACKGROUND_MIME_TYPES = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	svg: 'image/svg+xml'
};
const EDITOR_BACKGROUND_DEFAULT_OPACITY = 0.12;
const EDITOR_BACKGROUND_MIN_OPACITY = 0;
const EDITOR_BACKGROUND_MAX_OPACITY = 0.35;
const EDITOR_BACKGROUND_FIT_STATE_KEY = 'kawaii_synthwave.editorBackgroundFit';
const EDITOR_BACKGROUND_DEFAULT_FIT = 'full';
const EDITOR_BACKGROUND_FIT_AREAS = {
	full: { top: '0', right: 'auto', bottom: 'auto', left: '0', width: '100%', height: '100%' },
	top: { top: '0', right: 'auto', bottom: 'auto', left: '0', width: '100%', height: '50%' },
	bottom: { top: 'auto', right: 'auto', bottom: '0', left: '0', width: '100%', height: '50%' },
	left: { top: '0', right: 'auto', bottom: 'auto', left: '0', width: '50%', height: '100%' },
	right: { top: '0', right: '0', bottom: 'auto', left: 'auto', width: '50%', height: '100%' },
	'top-left': { top: '0', right: 'auto', bottom: 'auto', left: '0', width: '50%', height: '50%' },
	'top-right': { top: '0', right: '0', bottom: 'auto', left: 'auto', width: '50%', height: '50%' },
	'bottom-left': { top: 'auto', right: 'auto', bottom: '0', left: '0', width: '50%', height: '50%' },
	'bottom-right': { top: 'auto', right: '0', bottom: '0', left: 'auto', width: '50%', height: '50%' }
};
const EDITOR_BACKGROUND_DEFAULT_POSITION = 'center center';
const EDITOR_BACKGROUND_DEFAULT_SIZE = 'contain';
const EDITOR_BACKGROUND_DEFAULT_REPEAT = 'no-repeat';
const EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY = 'kawaii_synthwave.emptyEditorLogoImage';
const EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY = 'kawaii_synthwave.emptyEditorLogoOpacity';
const EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX = 'empty-editor-logo-image';
const EMPTY_EDITOR_LOGO_DEFAULT_OPACITY = 0.75;
const EMPTY_EDITOR_LOGO_MIN_OPACITY = 0;
const EMPTY_EDITOR_LOGO_MAX_OPACITY = 1;
const WORKBENCH_RELOAD_COMMAND = "workbench.action.reloadWindow";

// Centralise errors & info messages to keep activation code clean
const messages = {
	ACTIVATED: "Neon Dreams enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.",
	DEACTIVATED: `Neon Dreams disabled. VS code must reload for this change to take effect`,
	REACTIVATED: "Neon dreams is already enabled. Reload to refresh JS settings.",
	NOT_RUNNING: `Neon dreams isn't running.`,
	ERROR_ACCESS_DENIED: "Neon Dreams was unable to modify the core VS code files needed to launch the extension. You may need to run VS code with admin privileges in order to enable Neon Dreams.",
	ERROR_WORKBENCH_NOT_FOUND: "Neon Dreams could not find the workbench HTML file. This is likely due to a change in VS Code's internal structure. Please open an issue on the Kawaii VS Code Color GitHub repository to report this.",
	ERROR_GENERIC: "Something went wrong when starting neon dreams"
};

let activeColorThemeLabel;
let extensionContext;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	this.extensionName = 'ITEM-PIXEL.kawaii-vscode-color';
	this.cntx = context;
	extensionContext = context;
	activeColorThemeLabel = getActiveColorThemeLabel();
	settings.configureSettingsSync(context);

	let openSettings = vscode.commands.registerCommand('kawaii_synthwave.openSettings', function () {
		return settings.openSettings(context, {
			enableNeon,
			disableNeon,
			isNeonEnabled
		});
	});

	context.subscriptions.push(openSettings);
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(handleConfigurationChange));
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
	// ...
}

/**
 * Enables the Neon Dreams workbench patch.
 *
 * @returns {Promise<void>} Completes when the patch is written and reload is requested.
 */
async function enableNeon() {
	const config = vscode.workspace.getConfiguration("kawaii_synthwave");
	const disableGlow = config && config.disableGlow ? !!config.disableGlow : false;

	let brightness = parseFloat(config.brightness) > 1 ? 1 : parseFloat(config.brightness);
	brightness = brightness < 0 ? 0 : brightness;
	brightness = isNaN(brightness) ? 0.45 : brightness;

	const neonBrightness = Math.floor(brightness * 255).toString(16).toUpperCase();
	const appDir = path.dirname(vscode.env.appRoot);
	const base = path.join(appDir, 'app', 'out', 'vs', 'code');

	const patchPaths = resolveWorkbenchPatchPaths(base);
	if (!patchPaths) {
		vscode.window.showErrorMessage(messages.ERROR_WORKBENCH_NOT_FOUND);
		return;
	}
	const { htmlFile, templateFile } = patchPaths;

	try {
		// generate production theme JS
		const chromeStyles = buildCustomChromeStyles(fs.readFileSync(__dirname + '/css/editor_chrome.css', 'utf-8'));
		const jsTemplate = fs.readFileSync(__dirname + '/js/theme_template.js', 'utf-8');
		const themeWithGlow = jsTemplate.replace(/\[DISABLE_GLOW\]/g, disableGlow);
		const themeWithChrome = themeWithGlow.replace(/\[CHROME_STYLES\]/g, chromeStyles);
		const finalTheme = themeWithChrome.replace(/\[NEON_BRIGHTNESS\]/g, neonBrightness);
		fs.writeFileSync(templateFile, finalTheme, "utf-8");

		// modify workbench html
		const html = fs.readFileSync(htmlFile, "utf-8");

		// check if the tag is already there
		const isEnabled = isWorkbenchPatchEnabled(html);
		const output = applyWorkbenchPatchScriptTag(html);
		const reloadMessage = isEnabled ? messages.REACTIVATED : messages.ACTIVATED;
		const reloadActionTitle = isEnabled ? "Restart editor to refresh settings" : "Restart editor to complete";

		fs.writeFileSync(htmlFile, output, "utf-8");
		await requestWorkbenchReload(reloadMessage, reloadActionTitle);
	} catch (e) {
		logExtensionError('enableNeon', e, { disableGlow, brightness, neonBrightness });
		if (isFileAccessError(e)) {
			await vscode.window.showInformationMessage(messages.ERROR_ACCESS_DENIED);
			return;
		} else {
			await vscode.window.showErrorMessage(messages.ERROR_GENERIC);
			return;
		}
	}
}

/**
 * Replaces runtime customization placeholders in the injected chrome CSS.
 *
 * @param {string} chromeStyles Raw chrome CSS.
 * @returns {string} Chrome CSS with runtime customizations applied.
 */
function buildCustomChromeStyles(chromeStyles) {
	const editorBackgroundCssValues = getEditorBackgroundCssValues(extensionContext);
	const emptyEditorLogoStyles = getEmptyEditorLogoStyles(extensionContext);

	return chromeStyles
		.replace(/\[EDITOR_BACKGROUND_IMAGE\]/g, editorBackgroundCssValues.image)
		.replace(/\[EDITOR_BACKGROUND_IMAGE_OPACITY\]/g, editorBackgroundCssValues.opacity)
		.replace(/\[EDITOR_BACKGROUND_IMAGE_POSITION\]/g, editorBackgroundCssValues.position)
		.replace(/\[EDITOR_BACKGROUND_IMAGE_SIZE\]/g, editorBackgroundCssValues.size)
		.replace(/\[EDITOR_BACKGROUND_IMAGE_REPEAT\]/g, editorBackgroundCssValues.repeat)
		.replace(/\[EDITOR_BACKGROUND_AREA_TOP\]/g, editorBackgroundCssValues.areaTop)
		.replace(/\[EDITOR_BACKGROUND_AREA_RIGHT\]/g, editorBackgroundCssValues.areaRight)
		.replace(/\[EDITOR_BACKGROUND_AREA_BOTTOM\]/g, editorBackgroundCssValues.areaBottom)
		.replace(/\[EDITOR_BACKGROUND_AREA_LEFT\]/g, editorBackgroundCssValues.areaLeft)
		.replace(/\[EDITOR_BACKGROUND_AREA_WIDTH\]/g, editorBackgroundCssValues.areaWidth)
		.replace(/\[EDITOR_BACKGROUND_AREA_HEIGHT\]/g, editorBackgroundCssValues.areaHeight)
		.replace(/\[EMPTY_EDITOR_LOGO_STYLES\]/g, emptyEditorLogoStyles);
}

/**
 * Builds CSS-safe values for the optional editor background image.
 *
 * @param {vscode.ExtensionContext | undefined} context Extension context.
 * @returns {{image: string, opacity: string, position: string, size: string, repeat: string, areaTop: string, areaRight: string, areaBottom: string, areaLeft: string, areaWidth: string, areaHeight: string}} Editor background CSS values.
 */
function getEditorBackgroundCssValues(context) {
	const defaultArea = getEditorBackgroundFitArea(EDITOR_BACKGROUND_DEFAULT_FIT);
	const defaultValues = {
		image: 'none',
		opacity: '0',
		position: EDITOR_BACKGROUND_DEFAULT_POSITION,
		size: EDITOR_BACKGROUND_DEFAULT_SIZE,
		repeat: EDITOR_BACKGROUND_DEFAULT_REPEAT,
		areaTop: defaultArea.top,
		areaRight: defaultArea.right,
		areaBottom: defaultArea.bottom,
		areaLeft: defaultArea.left,
		areaWidth: defaultArea.width,
		areaHeight: defaultArea.height
	};

	if (!context || !context.globalState) {
		return defaultValues;
	}

	try {
		const metadata = getStoredEditorBackgroundImageMetadata(context);

		if (!metadata) {
			return defaultValues;
		}

		const imagePath = getEditorBackgroundImagePath(context, metadata.fileName);

		if (!fs.existsSync(imagePath)) {
			return defaultValues;
		}

		const imageBuffer = fs.readFileSync(imagePath);
		const dataUri = `data:${metadata.mimeType};base64,${imageBuffer.toString('base64')}`;
		const fitArea = getEditorBackgroundFitArea(getStoredEditorBackgroundFit(context));

		return {
			image: `url("${dataUri}")`,
			opacity: String(getStoredEditorBackgroundOpacity(context)),
			position: EDITOR_BACKGROUND_DEFAULT_POSITION,
			size: EDITOR_BACKGROUND_DEFAULT_SIZE,
			repeat: EDITOR_BACKGROUND_DEFAULT_REPEAT,
			areaTop: fitArea.top,
			areaRight: fitArea.right,
			areaBottom: fitArea.bottom,
			areaLeft: fitArea.left,
			areaWidth: fitArea.width,
			areaHeight: fitArea.height
		};
	} catch (error) {
		logExtensionError('getEditorBackgroundCssValues', error, {});
		return defaultValues;
	}
}

/**
 * Builds CSS rules for replacing the empty editor watermark logo.
 *
 * @param {vscode.ExtensionContext | undefined} context Extension context.
 * @returns {string} CSS rule block or an empty string when no custom logo exists.
 */
function getEmptyEditorLogoStyles(context) {
	if (!context || !context.globalState) {
		return '';
	}

	try {
		const metadata = getStoredEmptyEditorLogoImageMetadata(context);

		if (!metadata) {
			return '';
		}

		const logoPath = getEmptyEditorLogoImagePath(context, metadata.fileName);

		if (!fs.existsSync(logoPath)) {
			return '';
		}

		const logoBuffer = fs.readFileSync(logoPath);
		const dataUri = `data:${metadata.mimeType};base64,${logoBuffer.toString('base64')}`;
		const opacity = getStoredEmptyEditorLogoOpacity(context);

		return `
.monaco-workbench .part.editor > .content .editor-group-container > .editor-group-watermark .letterpress {
	background-image: url("${dataUri}") !important;
	background-position: center !important;
	background-size: contain !important;
	background-repeat: no-repeat !important;
	opacity: ${opacity};
	filter: none !important;
}
`;
	} catch (error) {
		logExtensionError('getEmptyEditorLogoStyles', error, {});
		return '';
	}
}

/**
 * Reads stored editor background image metadata.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @returns {{fileName: string, mimeType: string} | undefined} Stored image metadata.
 */
function getStoredEditorBackgroundImageMetadata(context) {
	const metadata = context.globalState.get(EDITOR_BACKGROUND_IMAGE_STATE_KEY);

	if (!metadata || typeof metadata !== 'object') {
		return undefined;
	}

	const fileName = getSafeEditorBackgroundImageFileName(metadata.fileName);

	if (!fileName) {
		return undefined;
	}

	const extension = path.extname(fileName).slice(1).toLowerCase();

	return {
		fileName,
		mimeType: typeof metadata.mimeType === 'string' ? metadata.mimeType : getEditorBackgroundImageMimeType(extension)
	};
}

/**
 * Reads stored empty editor logo metadata.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @returns {{fileName: string, mimeType: string} | undefined} Stored logo metadata.
 */
function getStoredEmptyEditorLogoImageMetadata(context) {
	const metadata = context.globalState.get(EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY);

	if (!metadata || typeof metadata !== 'object') {
		return undefined;
	}

	const fileName = getSafeEmptyEditorLogoImageFileName(metadata.fileName);

	if (!fileName) {
		return undefined;
	}

	const extension = path.extname(fileName).slice(1).toLowerCase();

	return {
		fileName,
		mimeType: typeof metadata.mimeType === 'string' ? metadata.mimeType : getEditorBackgroundImageMimeType(extension)
	};
}

/**
 * Reads and clamps the stored editor background opacity.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @returns {number} Safe opacity value.
 */
function getStoredEditorBackgroundOpacity(context) {
	return normalizeEditorBackgroundOpacity(context.globalState.get(EDITOR_BACKGROUND_OPACITY_STATE_KEY));
}

/**
 * Reads and normalizes the stored editor background fit area.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @returns {string} Safe fit area id.
 */
function getStoredEditorBackgroundFit(context) {
	return normalizeEditorBackgroundFit(context.globalState.get(EDITOR_BACKGROUND_FIT_STATE_KEY));
}

/**
 * Reads and clamps the stored empty editor logo opacity.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @returns {number} Safe opacity value.
 */
function getStoredEmptyEditorLogoOpacity(context) {
	return normalizeEmptyEditorLogoOpacity(context.globalState.get(EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY));
}

/**
 * Normalizes an opacity value to the supported editor background range.
 *
 * @param {unknown} opacity Candidate opacity value.
 * @returns {number} Clamped opacity value.
 */
function normalizeEditorBackgroundOpacity(opacity) {
	const numericOpacity = Number.parseFloat(String(opacity));

	if (!Number.isFinite(numericOpacity)) {
		return EDITOR_BACKGROUND_DEFAULT_OPACITY;
	}

	const clampedOpacity = Math.min(
		EDITOR_BACKGROUND_MAX_OPACITY,
		Math.max(EDITOR_BACKGROUND_MIN_OPACITY, numericOpacity)
	);

	return Number(clampedOpacity.toFixed(2));
}

/**
 * Normalizes an editor background fit area id.
 *
 * @param {unknown} fit Candidate fit area id.
 * @returns {string} Supported fit area id.
 */
function normalizeEditorBackgroundFit(fit) {
	const normalizedFit = String(fit || '')
		.trim()
		.toLowerCase()
		.replace(/^botton/, 'bottom');

	return Object.prototype.hasOwnProperty.call(EDITOR_BACKGROUND_FIT_AREAS, normalizedFit)
		? normalizedFit
		: EDITOR_BACKGROUND_DEFAULT_FIT;
}

/**
 * Gets the CSS area values for an editor background fit area.
 *
 * @param {unknown} fit Candidate fit area id.
 * @returns {{top: string, right: string, bottom: string, left: string, width: string, height: string}} CSS area values.
 */
function getEditorBackgroundFitArea(fit) {
	return EDITOR_BACKGROUND_FIT_AREAS[normalizeEditorBackgroundFit(fit)];
}

/**
 * Normalizes an opacity value to the supported empty editor logo range.
 *
 * @param {unknown} opacity Candidate opacity value.
 * @returns {number} Clamped opacity value.
 */
function normalizeEmptyEditorLogoOpacity(opacity) {
	const numericOpacity = Number.parseFloat(String(opacity));

	if (!Number.isFinite(numericOpacity)) {
		return EMPTY_EDITOR_LOGO_DEFAULT_OPACITY;
	}

	const clampedOpacity = Math.min(
		EMPTY_EDITOR_LOGO_MAX_OPACITY,
		Math.max(EMPTY_EDITOR_LOGO_MIN_OPACITY, numericOpacity)
	);

	return Number(clampedOpacity.toFixed(2));
}

/**
 * Resolves a stored editor background image path under extension global storage.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @param {string} fileName Stored image file name.
 * @returns {string} Absolute stored image path.
 */
function getEditorBackgroundImagePath(context, fileName) {
	const safeFileName = getSafeEditorBackgroundImageFileName(fileName);

	if (!safeFileName) {
		throw new Error(`Unsafe editor background image file name: ${String(fileName)}`);
	}

	const storageDirectory = path.resolve(getGlobalStoragePath(context));
	const imagePath = path.resolve(storageDirectory, safeFileName);

	if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
		throw new Error(`Unsafe editor background image path: ${imagePath}`);
	}

	return imagePath;
}

/**
 * Resolves a stored empty editor logo path under extension global storage.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @param {string} fileName Stored logo file name.
 * @returns {string} Absolute stored logo path.
 */
function getEmptyEditorLogoImagePath(context, fileName) {
	const safeFileName = getSafeEmptyEditorLogoImageFileName(fileName);

	if (!safeFileName) {
		throw new Error(`Unsafe empty editor logo file name: ${String(fileName)}`);
	}

	const storageDirectory = path.resolve(getGlobalStoragePath(context));
	const imagePath = path.resolve(storageDirectory, safeFileName);

	if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
		throw new Error(`Unsafe empty editor logo path: ${imagePath}`);
	}

	return imagePath;
}

/**
 * Normalizes a stored editor background image file name.
 *
 * @param {unknown} fileName Candidate file name.
 * @returns {string | undefined} Safe file name.
 */
function getSafeEditorBackgroundImageFileName(fileName) {
	const normalizedFileName = String(fileName || '');

	if (
		!normalizedFileName
		|| path.basename(normalizedFileName) !== normalizedFileName
		|| !normalizedFileName.startsWith(`${EDITOR_BACKGROUND_IMAGE_FILE_PREFIX}.`)
	) {
		return undefined;
	}

	return normalizedFileName;
}

/**
 * Normalizes a stored empty editor logo file name.
 *
 * @param {unknown} fileName Candidate file name.
 * @returns {string | undefined} Safe file name.
 */
function getSafeEmptyEditorLogoImageFileName(fileName) {
	const normalizedFileName = String(fileName || '');

	if (
		!normalizedFileName
		|| path.basename(normalizedFileName) !== normalizedFileName
		|| !normalizedFileName.startsWith(`${EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX}.`)
	) {
		return undefined;
	}

	return normalizedFileName;
}

/**
 * Gets the extension global storage path with a fallback for older VS Code APIs.
 *
 * @param {vscode.ExtensionContext} context Extension context.
 * @returns {string} Global storage path.
 */
function getGlobalStoragePath(context) {
	if (context.globalStorageUri && context.globalStorageUri.fsPath) {
		return context.globalStorageUri.fsPath;
	}

	if (context.globalStoragePath) {
		return context.globalStoragePath;
	}

	throw new Error('VS Code extension global storage path is unavailable.');
}

/**
 * Gets the MIME type for a supported editor background image extension.
 *
 * @param {string} extension Image file extension.
 * @returns {string} Image MIME type.
 */
function getEditorBackgroundImageMimeType(extension) {
	return EDITOR_BACKGROUND_MIME_TYPES[String(extension || '').toLowerCase()] || 'application/octet-stream';
}

/**
 * Disables the Neon Dreams workbench patch.
 *
 * @returns {Promise<void>} Completes when the patch is removed and reload is requested.
 */
async function disableNeon() {
	const appDir = path.dirname(vscode.env.appRoot);
	const base = path.join(appDir, 'app', 'out', 'vs', 'code');

	const patchPaths = resolveWorkbenchPatchPaths(base);
	if (!patchPaths) {
		vscode.window.showErrorMessage(messages.ERROR_WORKBENCH_NOT_FOUND);
		return;
	}
	const { htmlFile } = patchPaths;

	try {
		// modify workbench html
		const html = fs.readFileSync(htmlFile, "utf-8");

		// check if the tag is already there
		const isEnabled = isWorkbenchPatchEnabled(html);

		if (isEnabled) {
			const output = removeWorkbenchPatchScriptTag(html);
			fs.writeFileSync(htmlFile, output, "utf-8");

			await requestWorkbenchReload(messages.DEACTIVATED, "Restart editor to complete");
		} else {
			await vscode.window.showInformationMessage(messages.NOT_RUNNING);
		}
	} catch (e) {
		logExtensionError('disableNeon', e, {});
		if (isFileAccessError(e)) {
			await vscode.window.showInformationMessage(messages.ERROR_ACCESS_DENIED);
			return;
		} else {
			await vscode.window.showErrorMessage(messages.ERROR_GENERIC);
			return;
		}
	}
}

/**
 * Checks whether Neon Dreams is currently patched into the VS Code workbench.
 *
 * @returns {boolean} True when the workbench HTML references neondreams.js.
 */
function isNeonEnabled() {
	const appDir = path.dirname(vscode.env.appRoot);
	const base = path.join(appDir, 'app', 'out', 'vs', 'code');
	const patchPaths = resolveWorkbenchPatchPaths(base);

	if (!patchPaths) {
		return false;
	}

	try {
		return isWorkbenchPatchEnabled(fs.readFileSync(patchPaths.htmlFile, "utf-8"));
	} catch (error) {
		if (!isFileAccessError(error)) {
			console.error(JSON.stringify({
				timestamp: new Date().toISOString(),
				methodName: "isNeonEnabled",
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			}, null, 2));
		}

		return false;
	}
}

/**
 * Handles configuration changes that can require regenerating the Neon script.
 *
 * @param {vscode.ConfigurationChangeEvent} event - VS Code configuration change event.
 * @returns {void}
 */
function handleConfigurationChange(event) {
	if (!event.affectsConfiguration(COLOR_THEME_SETTING)) {
		return;
	}

	const previousThemeLabel = activeColorThemeLabel;
	const currentThemeLabel = getActiveColorThemeLabel();
	activeColorThemeLabel = currentThemeLabel;

	if (
		previousThemeLabel === currentThemeLabel
		|| !isKawaiiVsCodeColorTheme(previousThemeLabel)
		|| !isKawaiiVsCodeColorTheme(currentThemeLabel)
		|| !isNeonEnabled()
	) {
		return;
	}

	enableNeon();
}

/**
 * Reads the active VS Code color theme label.
 *
 * @returns {string} Active color theme label.
 */
function getActiveColorThemeLabel() {
	const colorTheme = vscode.workspace.getConfiguration().get(COLOR_THEME_SETTING);
	return typeof colorTheme === "string" ? colorTheme : "";
}

/**
 * Checks whether a theme label belongs to this extension.
 *
 * @param {string} themeLabel - VS Code color theme label.
 * @returns {boolean} True when the label is one Kawaii VS Code Color variant.
 */
function isKawaiiVsCodeColorTheme(themeLabel) {
	return KAWAII_VSCODE_COLOR_THEME_LABELS.includes(themeLabel);
}

/**
 * Prompts the user and reloads the current workbench window.
 *
 * @param {string} message - User-facing reload message.
 * @param {string} actionTitle - Notification action title.
 * @returns {Promise<void>} Completes when the reload command has been requested.
 */
async function requestWorkbenchReload(message, actionTitle) {
	await vscode.window.showInformationMessage(message, { title: actionTitle });
	await vscode.commands.executeCommand(WORKBENCH_RELOAD_COMMAND);
}

/**
 * Checks whether an error came from denied or missing file access.
 *
 * @param {unknown} error - Error value.
 * @returns {boolean} True when the error code is file-access related.
 */
function isFileAccessError(error) {
	return Boolean(error && /ENOENT|EACCES|EPERM/.test(error.code));
}

/**
 * Logs extension failures with debug context.
 *
 * @param {string} methodName Method where the error happened.
 * @param {unknown} error Error value.
 * @param {Record<string, unknown>} context Debug context.
 * @returns {void}
 */
function logExtensionError(methodName, error, context) {
	const normalizedError = error instanceof Error ? error : new Error(String(error));

	console.error(JSON.stringify({
		timestamp: new Date().toISOString(),
		methodName,
		context,
		message: normalizedError.message,
		stack: normalizedError.stack
	}, null, 2));
}

module.exports = {
	activate,
	deactivate,
	enableNeon,
	disableNeon,
	isNeonEnabled
}

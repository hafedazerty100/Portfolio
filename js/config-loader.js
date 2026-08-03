/**
 * ConfigLoader — Loads, manages, and applies dynamic site configuration from data/config.json
 */

let currentConfig = null;
const listeners = [];

/**
 * Loads configuration from data/config.json or returns cached state
 */
export async function loadConfig(forceReload = false) {
  if (currentConfig && !forceReload) {
    return currentConfig;
  }
  try {
    const response = await fetch(`data/config.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data/config.json (Status: ${response.status})`);
    }
    const data = await response.json();
    currentConfig = data;
    applyTheme(currentConfig);
    notifyListeners();
    return currentConfig;
  } catch (error) {
    console.error('ConfigLoader Error:', error);
    throw error;
  }
}

/**
 * Returns current loaded config object
 */
export function getConfig() {
  return currentConfig;
}

/**
 * Updates in-memory config and optionally applies theme & re-renders live preview
 */
export function setConfig(newConfig, applyLive = true) {
  currentConfig = JSON.parse(JSON.stringify(newConfig)); // Deep clone
  if (applyLive) {
    applyTheme(currentConfig);
    notifyListeners();
  }
}

/**
 * Applies CSS custom variables to document root element
 */
export function applyTheme(config) {
  if (!config || !config.theme) return;
  const root = document.documentElement;
  const { colors, fontFamily, borderRadius, cardShadow } = config.theme;

  if (colors) {
    if (colors.primary) root.style.setProperty('--color-primary', colors.primary);
    if (colors.secondary) root.style.setProperty('--color-secondary', colors.secondary);
    if (colors.background) root.style.setProperty('--color-bg', colors.background);
    if (colors.cardBackground) root.style.setProperty('--color-card-bg', colors.cardBackground);
    if (colors.text) root.style.setProperty('--color-text', colors.text);
    if (colors.textMuted) root.style.setProperty('--color-text-muted', colors.textMuted);
    if (colors.accent) root.style.setProperty('--color-accent', colors.accent);
    if (colors.border) root.style.setProperty('--color-card-border', colors.border);
  }

  if (fontFamily) {
    root.style.setProperty('--font-family', fontFamily);
  }
  if (borderRadius) {
    root.style.setProperty('--border-radius', borderRadius);
  }
  if (cardShadow) {
    root.style.setProperty('--card-shadow', cardShadow);
  }

  if (config.grid) {
    const { columnsDesktop, columnsTablet, columnsMobile, gapPx } = config.grid;
    if (columnsDesktop) root.style.setProperty('--grid-cols-desktop', columnsDesktop);
    if (columnsTablet) root.style.setProperty('--grid-cols-tablet', columnsTablet);
    if (columnsMobile) root.style.setProperty('--grid-cols-mobile', columnsMobile);
    if (gapPx) root.style.setProperty('--grid-gap', `${gapPx}px`);
  }
}

/**
 * Registers callback for config changes
 */
export function onConfigChange(callback) {
  if (typeof callback === 'function') {
    listeners.push(callback);
  }
}

function notifyListeners() {
  listeners.forEach(cb => cb(currentConfig));
}

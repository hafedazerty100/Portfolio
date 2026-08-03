/**
 * ConfigLoader — Loads, manages, and applies dynamic site configuration, dual themes, and multilingual i18n
 */

let currentConfig = null;
const listeners = [];

const THEME_STORAGE_KEY = 'apex_theme_mode';
const LANG_STORAGE_KEY = 'apex_language';

/**
 * Gets currently active theme mode ('dark' | 'light')
 */
export function getThemeMode() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  // OS level preference fallback
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark'; // Default
}

/**
 * Switches theme mode between light and dark
 */
export function setThemeMode(mode) {
  const validMode = (mode === 'light') ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, validMode);
  document.documentElement.setAttribute('data-theme', validMode);
  if (currentConfig) {
    applyTheme(currentConfig, validMode);
    notifyListeners();
  }
}

/**
 * Toggles current theme mode
 */
export function toggleThemeMode() {
  const current = getThemeMode();
  const next = (current === 'dark') ? 'light' : 'dark';
  setThemeMode(next);
  return next;
}

/**
 * Gets currently active language code ('en' | 'fr' | 'ar')
 */
export function getLanguage() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (['en', 'fr', 'ar'].includes(saved)) {
    return saved;
  }
  return 'en'; // Default language
}

/**
 * Sets active language, updates HTML dir attribute for RTL support, and re-renders UI
 */
export function setLanguage(lang) {
  const validLang = ['en', 'fr', 'ar'].includes(lang) ? lang : 'en';
  localStorage.setItem(LANG_STORAGE_KEY, validLang);
  document.documentElement.setAttribute('lang', validLang);
  document.documentElement.setAttribute('dir', validLang === 'ar' ? 'rtl' : 'ltr');
  notifyListeners();
}

/**
 * Loads configuration from data/config.json
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

    // Apply active theme mode & dir
    const mode = getThemeMode();
    const lang = getLanguage();
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    applyTheme(currentConfig, mode);
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
 * Returns content object for active language (or specified language)
 */
export function getContent(lang = getLanguage()) {
  if (!currentConfig || !currentConfig.i18n) return null;
  return currentConfig.i18n[lang] || currentConfig.i18n['en'] || null;
}

/**
 * Returns UI strings dictionary for active language
 */
export function getUI(lang = getLanguage()) {
  const content = getContent(lang);
  return content ? content.ui || {} : {};
}

/**
 * Updates in-memory config and applies theme live
 */
export function setConfig(newConfig, applyLive = true) {
  currentConfig = JSON.parse(JSON.stringify(newConfig));
  if (applyLive) {
    applyTheme(currentConfig, getThemeMode());
    notifyListeners();
  }
}

/**
 * Applies CSS custom variables to document root element based on current mode
 */
export function applyTheme(config, mode = getThemeMode()) {
  if (!config || !config.theme) return;
  const root = document.documentElement;

  const palette = config.theme[mode] || config.theme.dark || config.theme.colors;
  if (palette) {
    if (palette.primary) root.style.setProperty('--color-primary', palette.primary);
    if (palette.secondary) root.style.setProperty('--color-secondary', palette.secondary);
    if (palette.background) root.style.setProperty('--color-bg', palette.background);
    if (palette.cardBackground) root.style.setProperty('--color-card-bg', palette.cardBackground);
    if (palette.text) root.style.setProperty('--color-text', palette.text);
    if (palette.textMuted) root.style.setProperty('--color-text-muted', palette.textMuted);
    if (palette.accent) root.style.setProperty('--color-accent', palette.accent);
    if (palette.border) root.style.setProperty('--color-card-border', palette.border);
  }

  if (config.theme.fontFamily) root.style.setProperty('--font-family', config.theme.fontFamily);
  if (config.theme.borderRadius) root.style.setProperty('--border-radius', config.theme.borderRadius);
  if (config.theme.cardShadow) root.style.setProperty('--card-shadow', config.theme.cardShadow);

  if (config.grid) {
    const { columnsDesktop, columnsTablet, columnsMobile, gapPx } = config.grid;
    if (columnsDesktop) root.style.setProperty('--grid-cols-desktop', columnsDesktop);
    if (columnsTablet) root.style.setProperty('--grid-cols-tablet', columnsTablet);
    if (columnsMobile) root.style.setProperty('--grid-cols-mobile', columnsMobile);
    if (gapPx) root.style.setProperty('--grid-gap', `${gapPx}px`);
  }
}

/**
 * Registers callback for config/language/theme changes
 */
export function onConfigChange(callback) {
  if (typeof callback === 'function') {
    listeners.push(callback);
  }
}

function notifyListeners() {
  listeners.forEach(cb => cb(currentConfig));
}

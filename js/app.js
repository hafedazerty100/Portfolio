/**
 * App — Main application bootstrap, multilingual i18n hydration, and theme toggle handler
 */

import { loadConfig, onConfigChange, getContent, getUI, getLanguage, setLanguage, getThemeMode, toggleThemeMode } from './config-loader.js?v=1.0.3';
import { initAdmin } from './admin.js?v=1.0.3';

let activeCategoryFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const config = await loadConfig();
    renderControls();
    renderPage(config);
    onConfigChange((newConfig) => {
      renderControls();
      renderPage(newConfig);
    });
    initAdmin();
  } catch (err) {
    console.error('App initialization error:', err);
    document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px;">Failed to initialize site configuration. Make sure data/config.json exists.</div>`;
  }
});

/**
 * Renders Header Theme Toggle (Sun/Moon) & Language Switcher (EN / FR / عربي)
 */
function renderControls() {
  const controlsContainer = document.getElementById('headerControls');
  if (!controlsContainer) return;

  const currentLang = getLanguage();
  const currentMode = getThemeMode();

  const themeIcon = currentMode === 'dark' ? '☀️' : '🌙';

  controlsContainer.innerHTML = `
    <button id="btnThemeToggle" class="btn-theme-toggle" title="Toggle Light/Dark Theme">
      ${themeIcon}
    </button>
    <div class="lang-switcher">
      <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
      <button class="lang-btn ${currentLang === 'fr' ? 'active' : ''}" data-lang="fr">FR</button>
      <button class="lang-btn ${currentLang === 'ar' ? 'active' : ''}" data-lang="ar">عربي</button>
    </div>
  `;

  // Bind Theme Toggle Listener
  document.getElementById('btnThemeToggle').addEventListener('click', () => {
    toggleThemeMode();
  });

  // Bind Language Switcher Listeners
  controlsContainer.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetLang = e.target.getAttribute('data-lang');
      setLanguage(targetLang);
    });
  });
}

/**
 * Route router & public renderer using current language content
 */
function renderPage(config) {
  if (!config) return;

  const content = getContent();
  const ui = getUI();
  if (!content) return;

  renderShopHeader(content.shop);

  const isItemPage = window.location.pathname.endsWith('item.html') || window.location.search.includes('id=');
  if (isItemPage) {
    renderItemDetailPage(content, ui);
  } else {
    renderHomePage(content, ui);
  }

  // Hydrate Footer
  const footerText = document.getElementById('footerText');
  if (footerText && ui.footerText) {
    footerText.textContent = ui.footerText;
  }
}

/**
 * Renders Shop Header branding, contact info, and social links (excl. GitHub)
 */
function renderShopHeader(shop) {
  if (!shop) return;

  const logoEl = document.getElementById('shopLogo');
  const nameEl = document.getElementById('shopName');
  const taglineEl = document.getElementById('shopTagline');
  const socialEl = document.getElementById('shopSocials');

  if (logoEl && shop.logoUrl) logoEl.src = shop.logoUrl;
  if (nameEl) nameEl.textContent = shop.name || 'Apex Academy';
  if (taglineEl) taglineEl.textContent = shop.tagline || '';

  if (socialEl && shop.socialLinks) {
    const links = shop.socialLinks;
    let html = '';
    if (links.instagram) html += `<a href="${escapeHTML(links.instagram)}" target="_blank" class="social-link">Instagram</a>`;
    if (links.facebook) html += `<a href="${escapeHTML(links.facebook)}" target="_blank" class="social-link">Facebook</a>`;
    if (links.whatsapp) html += `<a href="${escapeHTML(links.whatsapp)}" target="_blank" class="social-link">WhatsApp</a>`;
    if (links.twitter) html += `<a href="${escapeHTML(links.twitter)}" target="_blank" class="social-link">Twitter</a>`;
    socialEl.innerHTML = html;
  }
}

/**
 * Renders Homepage hero, category filters, and catalog items grid
 */
function renderHomePage(content, ui) {
  const gridContainer = document.getElementById('itemsGrid');
  const filterContainer = document.getElementById('categoryFilters');
  const heroTitleEl = document.getElementById('heroTitle');
  const heroDescEl = document.getElementById('heroDesc');

  if (heroTitleEl && ui.heroTitle) heroTitleEl.textContent = ui.heroTitle;
  if (heroDescEl && content.shop && content.shop.description) heroDescEl.textContent = content.shop.description;

  if (!gridContainer) return;

  const items = content.items || [];
  const allLabel = ui.allCategories || 'ALL';

  // Build Category Filters
  if (filterContainer) {
    const categories = [allLabel, ...new Set(items.map(i => i.category).filter(Boolean))];
    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-btn ${cat === activeCategoryFilter || (activeCategoryFilter === 'ALL' && cat === allLabel) ? 'active' : ''}" data-cat="${escapeHTML(cat)}">
        ${escapeHTML(cat)}
      </button>
    `).join('');

    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedCat = e.target.getAttribute('data-cat');
        activeCategoryFilter = (selectedCat === allLabel) ? 'ALL' : selectedCat;
        renderHomePage(getContent(), getUI());
      });
    });
  }

  // Filter Items
  const filteredItems = activeCategoryFilter === 'ALL'
    ? items
    : items.filter(i => i.category === activeCategoryFilter);

  if (filteredItems.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
        No items available.
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = filteredItems.map(item => {
    const imgSrc = item.imageUrl || item.imageBase64 || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    return `
      <a href="item.html?id=${encodeURIComponent(item.id)}" class="item-card">
        <div class="item-card-image-wrap">
          <img src="${imgSrc}" class="item-card-image" alt="${escapeHTML(item.title)}" loading="lazy">
          ${item.category ? `<span class="item-badge">${escapeHTML(item.category)}</span>` : ''}
        </div>
        <div class="item-card-body">
          <h3 class="item-card-title">${escapeHTML(item.title)}</h3>
          <p class="item-card-desc">${escapeHTML(item.shortDescription)}</p>
          <div class="item-card-meta">
            <span class="item-card-price">${escapeHTML(item.price)}</span>
            <span class="btn-card-action">${escapeHTML(ui.viewDetails || 'View Details →')}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

/**
 * Renders Item Detail View on item.html
 */
function renderItemDetailPage(content, ui) {
  const container = document.getElementById('itemDetailContainer');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  const items = content.items || [];
  const item = items.find(i => i.id === itemId);

  if (!item) {
    container.innerHTML = `
      <div class="not-found-state">
        <h2 class="not-found-title">${escapeHTML(ui.itemUnavailable || 'Item Unavailable')}</h2>
        <p class="not-found-text">${escapeHTML(ui.itemUnavailableText || 'The requested item could not be found.')}</p>
        <a href="index.html" class="btn btn-primary">${escapeHTML(ui.backToItems || '← Back to Catalog')}</a>
      </div>
    `;
    return;
  }

  document.title = `${item.title} — ${content.shop ? content.shop.name : 'Store'}`;
  const imgSrc = item.imageUrl || item.imageBase64 || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';

  // Render Extra Fields Grid
  let extraHTML = '';
  if (item.extraFields && Object.keys(item.extraFields).length > 0) {
    extraHTML = `
      <div class="extra-fields-grid">
        ${Object.entries(item.extraFields).map(([k, v]) => `
          <div class="extra-field-item">
            <span class="extra-field-key">${escapeHTML(k)}</span>
            <span class="extra-field-val">${escapeHTML(v)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <a href="index.html" class="btn-back">${escapeHTML(ui.backToItems || '← Back to Catalog')}</a>
    <div class="detail-layout">
      <div class="detail-media">
        <img src="${imgSrc}" alt="${escapeHTML(item.title)}">
      </div>
      <div class="detail-content">
        ${item.category ? `<div class="detail-category">${escapeHTML(item.category)}</div>` : ''}
        <h1 class="detail-title">${escapeHTML(item.title)}</h1>
        <div class="detail-price">${escapeHTML(item.price)}</div>
        <p class="detail-description">${escapeHTML(item.fullDescription)}</p>
        ${extraHTML}
        <div style="margin-top: auto; display: flex; gap: 16px;">
          <a href="mailto:${content.shop ? content.shop.contactEmail : ''}?subject=Inquiry: ${encodeURIComponent(item.title)}" class="btn btn-primary btn-block">
            ${escapeHTML(ui.enrollInquiry || 'Enroll / Purchase Inquiry')}
          </a>
        </div>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

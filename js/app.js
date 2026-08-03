/**
 * App — Main application bootstrap & public page renderer
 */

import { loadConfig, onConfigChange, getConfig } from './config-loader.js';
import { initAdmin } from './admin.js';

let activeCategoryFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const config = await loadConfig();
    renderPage(config);
    onConfigChange((newConfig) => renderPage(newConfig));
    initAdmin();
  } catch (err) {
    console.error('App initialization error:', err);
    document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px;">Failed to initialize site configuration. Make sure data/config.json exists.</div>`;
  }
});

/**
 * Route router & public renderer
 */
function renderPage(config) {
  if (!config) return;

  renderShopHeader(config.shop);

  const isItemPage = window.location.pathname.endsWith('item.html') || window.location.search.includes('id=');
  if (isItemPage) {
    renderItemDetailPage(config);
  } else {
    renderHomePage(config);
  }
}

/**
 * Renders Shop Header branding, contact info, and social links
 */
function renderShopHeader(shop) {
  if (!shop) return;

  const logoEl = document.getElementById('shopLogo');
  const nameEl = document.getElementById('shopName');
  const taglineEl = document.getElementById('shopTagline');
  const descEl = document.getElementById('shopDesc');
  const socialEl = document.getElementById('shopSocials');

  if (logoEl && shop.logoUrl) logoEl.src = shop.logoUrl;
  if (nameEl) nameEl.textContent = shop.name || 'Apex Store';
  if (taglineEl) taglineEl.textContent = shop.tagline || '';
  if (descEl) descEl.textContent = shop.description || '';

  if (socialEl && shop.socialLinks) {
    const links = shop.socialLinks;
    let html = '';
    if (links.instagram) html += `<a href="${escapeHTML(links.instagram)}" target="_blank" class="social-link">Instagram</a>`;
    if (links.facebook) html += `<a href="${escapeHTML(links.facebook)}" target="_blank" class="social-link">Facebook</a>`;
    if (links.whatsapp) html += `<a href="${escapeHTML(links.whatsapp)}" target="_blank" class="social-link">WhatsApp</a>`;
    if (links.github) html += `<a href="${escapeHTML(links.github)}" target="_blank" class="social-link">GitHub</a>`;
    socialEl.innerHTML = html;
  }
}

/**
 * Renders Homepage grid and category filter buttons
 */
function renderHomePage(config) {
  const gridContainer = document.getElementById('itemsGrid');
  const filterContainer = document.getElementById('categoryFilters');
  if (!gridContainer) return;

  const items = config.items || [];

  // Build Categories
  if (filterContainer) {
    const categories = ['ALL', ...new Set(items.map(i => i.category).filter(Boolean))];
    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-btn ${cat === activeCategoryFilter ? 'active' : ''}" data-cat="${escapeHTML(cat)}">
        ${escapeHTML(cat)}
      </button>
    `).join('');

    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeCategoryFilter = e.target.getAttribute('data-cat');
        renderHomePage(getConfig());
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
        No items available in this category.
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
            <span class="btn-card-action">View Details →</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

/**
 * Renders Item Detail View on item.html
 */
function renderItemDetailPage(config) {
  const container = document.getElementById('itemDetailContainer');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  const items = config.items || [];
  const item = items.find(i => i.id === itemId);

  if (!item) {
    container.innerHTML = `
      <div class="not-found-state">
        <h2 class="not-found-title">Item Unavailable</h2>
        <p class="not-found-text">The requested course or item could not be found or has been removed from our catalog.</p>
        <a href="index.html" class="btn btn-primary">← Back to All Items</a>
      </div>
    `;
    return;
  }

  // Update Page Title
  document.title = `${item.title} — ${config.shop ? config.shop.name : 'Store'}`;

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
    <a href="index.html" class="btn-back">← Back to Catalog</a>
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
          <a href="mailto:${config.shop ? config.shop.contactEmail : ''}?subject=Inquiry: ${encodeURIComponent(item.title)}" class="btn btn-primary btn-block">
            Enroll / Purchase Inquiry
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

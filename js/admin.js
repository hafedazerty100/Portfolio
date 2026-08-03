/**
 * Admin — Admin system interface with Light/Dark Theme editing, Multilingual (EN/FR/AR) content editor, Live Grid Preview, and Upload-Only Shop Logo
 */

import { getConfig, setConfig, loadConfig, getThemeMode, setThemeMode, getLanguage, setLanguage } from './config-loader.js?v=1.1.1';
import { loginAdmin, isSessionActive, getSavedPAT, setSavedPAT, validatePasswordStrength, hashPassword } from './auth.js?v=1.1.1';
import { publishConfigToGitHub, StaleCommitConflictError } from './github-api.js?v=1.1.1';

let draftConfig = null;
let initialConfigSha = null;
let editingItemId = null;
let itemToDeleteId = null;

let activeShopLang = 'en';
let activeItemLang = 'en';
let activeThemeEditingMode = 'dark';

let temporaryItemState = { en: {}, fr: {}, ar: {} };
let currentModalImageBase64 = '';
let currentShopLogoBase64 = '';

export function initAdmin() {
  injectAdminDOM();
  bindEvents();
}

function injectAdminDOM() {
  const adminHTML = `
    <!-- Floating Unobtrusive Admin Button -->
    <div class="admin-trigger-wrap">
      <button id="adminTriggerBtn" class="btn-admin-trigger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7 7 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7 7 0 0 1 11 3.07V3a1 1 0 0 1 2 0v.07A7 7 0 0 1 18.93 9H19a1 1 0 0 1 0 2h-.07A7 7 0 0 1 13 16.93z"/></svg>
        Admin
      </button>
    </div>

    <!-- Login Modal -->
    <div id="loginModal" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">Admin Login</h3>
          <button id="closeLoginModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="loginForm">
            <div id="loginAlert" class="alert-banner alert-danger" style="display: none;"></div>
            <div class="form-group">
              <label class="form-label" for="loginUsername">Username</label>
              <input type="text" id="loginUsername" class="form-input" required autocomplete="username" value="admin">
            </div>
            <div class="form-group">
              <label class="form-label" for="loginPassword">Password</label>
              <input type="password" id="loginPassword" class="form-input" required autocomplete="current-password">
            </div>
            <div class="form-group">
              <label class="form-label" for="loginPAT">GitHub Fine-Grained PAT (Required to Publish)</label>
              <input type="password" id="loginPAT" class="form-input" placeholder="github_pat_11..." autocomplete="off">
              <p class="form-hint">Stored securely in sessionStorage for this tab session only.</p>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Unlock Admin Panel</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Full Admin Control Panel -->
    <div id="adminPanel" class="admin-panel-overlay">
      <div class="admin-topbar">
        <div class="admin-topbar-title">
          <span>Apex Store Control Center</span>
          <span class="admin-badge">Admin Active</span>
        </div>
        <div class="admin-topbar-actions">
          <button id="quickPublishBtn" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.825rem;">
            ⚡ Publish Changes
          </button>
          <button id="closeAdminPanel" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.825rem;">
            Exit Admin
          </button>
        </div>
      </div>

      <div class="admin-main">
        <!-- Sidebar Navigation -->
        <div class="admin-sidebar">
          <button class="admin-tab-btn active" data-tab="shop-info">🏪 Shop Info</button>
          <button class="admin-tab-btn" data-tab="theme-style">🎨 Theme & Colors</button>
          <button class="admin-tab-btn" data-tab="grid-layout">📐 Grid Layout</button>
          <button class="admin-tab-btn" data-tab="items-crud">📚 Items Catalog</button>
          <button class="admin-tab-btn" data-tab="security">🔒 Security & Repo</button>
          <button class="admin-tab-btn" data-tab="publish">🚀 Publish & Sync</button>
        </div>

        <!-- Content Area -->
        <div class="admin-content">
          <!-- Stale Commit Alert Banner -->
          <div id="staleCommitBanner" class="alert-banner alert-warning" style="display: none;">
            <div>
              <strong>⚠️ Stale Config Conflict Detected!</strong>
              <p style="margin-top: 4px; font-size: 0.85rem;">Someone published a newer version of the site config on GitHub since you loaded this session.</p>
              <button id="btnReloadStaleConfig" class="btn btn-secondary" style="margin-top: 10px; padding: 4px 12px; font-size: 0.8rem;">
                🔄 Reload Latest Config from GitHub
              </button>
            </div>
          </div>

          <!-- TAB 1: Shop Info (Multilingual EN/FR/AR & Upload-Only Logo) -->
          <div id="tab-shop-info" class="admin-tab-pane active">
            <h2 class="pane-title">Shop Information</h2>
            <p class="pane-subtitle">Edit branding, descriptions, logo, and social media links across all 3 languages.</p>

            <div class="sub-tab-bar">
              <button class="sub-tab-btn active" data-shop-lang="en">English (EN)</button>
              <button class="sub-tab-btn" data-shop-lang="fr">Français (FR)</button>
              <button class="sub-tab-btn" data-shop-lang="ar">العربية (AR)</button>
            </div>

            <div class="form-group">
              <label class="form-label">Shop Name</label>
              <input type="text" id="adminShopName" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Tagline (Hook)</label>
              <input type="text" id="adminShopTagline" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Full Description</label>
              <textarea id="adminShopDesc" class="form-textarea"></textarea>
            </div>

            <div style="margin-top: 24px; border-top: 1px solid var(--color-card-border); padding-top: 20px;">
              <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 16px;">Global Branding & Social Links (All Languages)</h3>
              
              <!-- Upload-Only Shop Logo Field -->
              <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label">Upload Shop Logo Photo</label>
                <input type="file" id="adminShopLogoFileInput" accept="image/*" class="form-input">
                <p class="form-hint">Logo image is automatically scaled to max 300px and compressed before saving.</p>
                <div id="shopLogoPreviewBox" style="margin-top: 12px; display: none;">
                  <img id="shopLogoPreviewImg" style="max-height: 80px; border-radius: 8px; border: 1px solid var(--color-card-border); object-fit: contain;">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Contact Email</label>
                  <input type="email" id="adminShopEmail" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input type="text" id="adminShopPhone" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Instagram</label>
                  <input type="url" id="adminSocialInstagram" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Facebook</label>
                  <input type="url" id="adminSocialFacebook" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">WhatsApp</label>
                  <input type="url" id="adminSocialWhatsapp" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Twitter</label>
                  <input type="url" id="adminSocialTwitter" class="form-input">
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: Theme & Colors (Dual Dark/Light Palettes) -->
          <div id="tab-theme-style" class="admin-tab-pane">
            <h2 class="pane-title">Theme & Color Palettes</h2>
            <p class="pane-subtitle">Edit both Light and Dark mode color palettes independently with live preview.</p>

            <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 16px;">
              <label class="form-label" style="margin: 0;">Active Editing Palette:</label>
              <div class="lang-switcher">
                <button id="btnEditDarkTheme" class="lang-btn active">🌙 Dark Mode</button>
                <button id="btnEditLightTheme" class="lang-btn">☀️ Light Mode</button>
              </div>
            </div>

            <div class="color-picker-grid">
              <div class="color-picker-card">
                <input type="color" id="themePrimary" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Primary Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Buttons & Highlights</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeSecondary" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Secondary Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Navigation & Headers</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeBg" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Background</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Page Backdrop</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeCardBg" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Card Background</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Card Containers</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeText" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Text Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Body Text</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeAccent" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Accent Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Price Tags & Badges</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeBorder" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem;">Border Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Card Outlines</div>
                </div>
              </div>
            </div>

            <div style="margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div class="form-group">
                <label class="form-label">Font Family</label>
                <select id="themeFontFamily" class="form-select">
                  <option value="Inter, system-ui, -apple-system, sans-serif">Inter / Tajawal (Clean)</option>
                  <option value="'Outfit', sans-serif">Outfit (Bold Display)</option>
                  <option value="system-ui, -apple-system, sans-serif">System Native Stack</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Border Radius (<span id="borderRadiusVal">16</span>px)</label>
                <input type="range" id="themeBorderRadius" min="0" max="32" value="16" style="width: 100%;">
              </div>
            </div>
          </div>

          <!-- TAB 3: Grid Layout -->
          <div id="tab-grid-layout" class="admin-tab-pane">
            <h2 class="pane-title">Grid & Layout Configuration</h2>
            <p class="pane-subtitle">Adjust item grid columns per breakpoint and spacing.</p>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
              <div class="form-group">
                <label class="form-label">Desktop Columns (>= 1024px)</label>
                <input type="number" id="gridDesktop" class="form-input" min="1" max="6" value="3">
              </div>
              <div class="form-group">
                <label class="form-label">Tablet Columns (>= 768px)</label>
                <input type="number" id="gridTablet" class="form-input" min="1" max="4" value="2">
              </div>
              <div class="form-group">
                <label class="form-label">Mobile Columns (< 768px)</label>
                <input type="number" id="gridMobile" class="form-input" min="1" max="2" value="1">
              </div>
            </div>

            <div class="form-group" style="margin-top: 16px;">
              <label class="form-label">Grid Gap (<span id="gridGapVal">24</span>px)</label>
              <input type="range" id="gridGap" min="12" max="48" value="24" style="width: 100%;">
            </div>
          </div>

          <!-- TAB 4: Items Catalog CRUD & Live Grid Preview -->
          <div id="tab-items-crud" class="admin-tab-pane">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <h2 class="pane-title" style="margin: 0;">Items Catalog Manager</h2>
                <p class="pane-subtitle" style="margin: 0;">Add, edit, delete, and manage translated courses/items.</p>
              </div>
              <button id="btnAddNewItem" class="btn btn-primary">
                + Add New Item
              </button>
            </div>

            <!-- Admin Items Row List -->
            <div id="adminItemsList" class="admin-items-list"></div>

            <!-- Live Grid Preview Container Inside Admin Panel -->
            <div style="margin-top: 36px; border-top: 1px solid var(--color-card-border); padding-top: 24px;">
              <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
                <span>👁️ Live Grid Preview (As Visitors See It)</span>
                <span style="font-size: 0.8rem; font-weight: 400; color: var(--color-text-muted);">Real-time DOM Preview</span>
              </h3>
              <div id="adminLivePreviewGrid" class="items-grid" style="margin-bottom: 0;"></div>
            </div>
          </div>

          <!-- TAB 5: Security & Repo -->
          <div id="tab-security" class="admin-tab-pane">
            <h2 class="pane-title">Security & GitHub Repository</h2>
            <p class="pane-subtitle">Manage admin credentials and target GitHub Pages repository specifications.</p>

            <div class="alert-banner alert-warning">
              ℹ️ <strong>Public Repository Notice:</strong> Since GitHub Free Pages repositories are public, <code>config.json</code> and its password hash are readable by anyone. Use a strong, 12+ character password.
            </div>

            <div class="form-group">
              <label class="form-label">Admin Username</label>
              <input type="text" id="adminUsername" class="form-input">
            </div>

            <div class="form-group">
              <label class="form-label">New Password (Leave blank to keep unchanged)</label>
              <input type="password" id="adminNewPassword" class="form-input" placeholder="At least 12 characters long">
            </div>

            <div style="margin-top: 32px; border-top: 1px solid var(--color-card-border); padding-top: 20px;">
              <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 16px;">GitHub Target Repository</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Repo Owner</label>
                  <input type="text" id="repoOwner" class="form-input" value="hafedazerty100">
                </div>
                <div class="form-group">
                  <label class="form-label">Repo Name</label>
                  <input type="text" id="repoName" class="form-input" value="Portfolio">
                </div>
                <div class="form-group">
                  <label class="form-label">Branch</label>
                  <input type="text" id="repoBranch" class="form-input" value="main">
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 6: Publish & Sync -->
          <div id="tab-publish" class="admin-tab-pane">
            <h2 class="pane-title">Publish & Sync Changes</h2>
            <p class="pane-subtitle">Commit changes to your GitHub Pages repository using your Personal Access Token.</p>

            <div class="alert-banner alert-warning">
              ⏳ <strong>GitHub Pages Rebuild Time:</strong> After publishing, GitHub Pages takes approximately <strong>30–90 seconds</strong> to rebuild and push changes live to all visitors.
            </div>

            <div class="form-group">
              <label class="form-label">GitHub Personal Access Token (PAT)</label>
              <input type="password" id="publishPAT" class="form-input" placeholder="github_pat_11...">
              <p class="form-hint">Must be a fine-grained PAT scoped to <code>hafedazerty100/Portfolio</code> with <strong>Contents: Read & Write</strong> permissions.</p>
            </div>

            <div style="display: flex; gap: 16px; margin-top: 24px;">
              <button id="btnPublishCommit" class="btn btn-primary" style="padding: 12px 28px;">
                🚀 Commit & Publish to GitHub
              </button>
              <button id="btnDiscardEdits" class="btn btn-secondary">
                🔄 Discard Unpublished Edits
              </button>
            </div>

            <div id="publishStatus" style="margin-top: 24px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Item Modal (Upload-Only Images & Multilingual EN/FR/AR) -->
    <div id="itemModal" class="modal-overlay">
      <div class="modal-container" style="max-width: 680px;">
        <div class="modal-header">
          <h3 id="itemModalTitle" class="modal-title">Edit Item</h3>
          <button id="closeItemModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
          <div class="sub-tab-bar">
            <button class="sub-tab-btn active" data-item-lang="en">English (EN)</button>
            <button class="sub-tab-btn" data-item-lang="fr">Français (FR)</button>
            <button class="sub-tab-btn" data-item-lang="ar">العربية (AR)</button>
          </div>

          <form id="itemForm">
            <div class="form-group">
              <label class="form-label">Title</label>
              <input type="text" id="itemFormTitle" class="form-input" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label">Category</label>
                <input type="text" id="itemFormCategory" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Price</label>
                <input type="text" id="itemFormPrice" class="form-input" required placeholder="e.g. $89.99 or 3000 DZD">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Short Description</label>
              <input type="text" id="itemFormShortDesc" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Full Description</label>
              <textarea id="itemFormFullDesc" class="form-textarea" required></textarea>
            </div>
            
            <!-- Upload-Only Image Field (Canvas scaled to max 800px) -->
            <div class="form-group">
              <label class="form-label">Upload Item Photo</label>
              <input type="file" id="itemFormFileInput" accept="image/*" class="form-input">
              <p class="form-hint">Images are automatically scaled to max 800px and compressed before saving.</p>
              <div id="imagePreviewBox" style="margin-top: 12px; display: none;">
                <img id="imagePreviewImg" style="max-height: 140px; border-radius: 8px; border: 1px solid var(--color-card-border); object-fit: cover;">
              </div>
            </div>

            <!-- Extra Fields Dynamic Container -->
            <div style="border-top: 1px solid var(--color-card-border); padding-top: 16px; margin-top: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <label class="form-label" style="margin: 0;">Extra Metadata Fields (e.g. Duration, Instructor)</label>
                <button type="button" id="btnAddExtraField" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;">+ Add Field</button>
              </div>
              <div id="extraFieldsContainer"></div>
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 24px;">Save Item Details</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Item Delete Confirmation Modal -->
    <div id="deleteConfirmModal" class="modal-overlay">
      <div class="modal-container" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">Confirm Deletion</h3>
          <button id="closeDeleteConfirmModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p id="deleteConfirmText" style="font-size: 0.95rem; margin-bottom: 20px;"></p>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="btnCancelDelete" class="btn btn-secondary">Cancel</button>
            <button id="btnConfirmDelete" class="btn btn-danger">Yes, Delete Item</button>
          </div>
        </div>
      </div>
    </div>

    <div id="toastContainer" class="toast-container"></div>
  `;

  document.body.insertAdjacentHTML('beforeend', adminHTML);
}

function bindEvents() {
  const triggerBtn = document.getElementById('adminTriggerBtn');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModal = document.getElementById('closeLoginModal');
  const loginForm = document.getElementById('loginForm');
  const adminPanel = document.getElementById('adminPanel');
  const closeAdminPanel = document.getElementById('closeAdminPanel');
  const quickPublishBtn = document.getElementById('quickPublishBtn');

  triggerBtn.addEventListener('click', () => {
    if (isSessionActive()) {
      openAdminPanel();
    } else {
      openLoginModal();
    }
  });

  closeLoginModal.addEventListener('click', () => loginModal.classList.remove('active'));
  closeAdminPanel.addEventListener('click', () => adminPanel.classList.remove('active'));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const pat = document.getElementById('loginPAT').value;
    const loginAlert = document.getElementById('loginAlert');

    try {
      const config = getConfig();
      const res = await loginAdmin(username, password, pat, config.admin);
      if (res.success) {
        loginAlert.style.display = 'none';
        loginModal.classList.remove('active');
        openAdminPanel();
        showToast('Admin Panel unlocked successfully!', 'success');
      } else {
        loginAlert.textContent = res.error;
        loginAlert.style.display = 'block';
      }
    } catch (err) {
      loginAlert.textContent = err.message;
      loginAlert.style.display = 'block';
    }
  });

  // Sidebar Tabs
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // Shop Info Sub-tabs (EN/FR/AR)
  const shopSubTabBtns = document.querySelectorAll('[data-shop-lang]');
  shopSubTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      saveShopInfoFormToDraft();
      shopSubTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeShopLang = btn.getAttribute('data-shop-lang');
      loadShopInfoFormFromDraft();
    });
  });

  // Item Form Sub-tabs (EN/FR/AR)
  const itemSubTabBtns = document.querySelectorAll('[data-item-lang]');
  itemSubTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      saveItemFormToTemporary();
      itemSubTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeItemLang = btn.getAttribute('data-item-lang');
      loadItemFormFromTemporary();
    });
  });

  // Shop Logo File Upload Handler
  document.getElementById('adminShopLogoFileInput').addEventListener('change', handleShopLogoUpload);

  // Real-time Inputs for Shop Info
  const shopInputs = ['adminShopName', 'adminShopTagline', 'adminShopDesc', 'adminShopEmail', 'adminShopPhone', 'adminSocialInstagram', 'adminSocialFacebook', 'adminSocialWhatsapp', 'adminSocialTwitter'];
  shopInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      saveShopInfoFormToDraft();
      setConfig(draftConfig, true);
    });
  });

  // Theme Editing Mode Buttons (Dark vs Light)
  document.getElementById('btnEditDarkTheme').addEventListener('click', () => {
    activeThemeEditingMode = 'dark';
    document.getElementById('btnEditDarkTheme').classList.add('active');
    document.getElementById('btnEditLightTheme').classList.remove('active');
    setThemeMode('dark');
    loadThemePaletteToForm();
  });
  document.getElementById('btnEditLightTheme').addEventListener('click', () => {
    activeThemeEditingMode = 'light';
    document.getElementById('btnEditLightTheme').classList.add('active');
    document.getElementById('btnEditDarkTheme').classList.remove('active');
    setThemeMode('light');
    loadThemePaletteToForm();
  });

  // Theme Inputs
  const themeInputs = ['themePrimary', 'themeSecondary', 'themeBg', 'themeCardBg', 'themeText', 'themeAccent', 'themeBorder', 'themeFontFamily', 'themeBorderRadius'];
  themeInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateDraftTheme);
  });

  // Grid Inputs
  const gridInputs = ['gridDesktop', 'gridTablet', 'gridMobile', 'gridGap'];
  gridInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateDraftGrid);
  });

  // Items CRUD
  document.getElementById('btnAddNewItem').addEventListener('click', () => openItemModal());
  document.getElementById('closeItemModal').addEventListener('click', () => document.getElementById('itemModal').classList.remove('active'));
  document.getElementById('itemForm').addEventListener('submit', handleSaveItem);
  document.getElementById('btnAddExtraField').addEventListener('click', () => addExtraFieldRow('', ''));

  // Image Upload File Resizing & Guard
  document.getElementById('itemFormFileInput').addEventListener('change', handleImageFileUpload);

  // Delete Confirm Modal Handlers
  document.getElementById('closeDeleteConfirmModal').addEventListener('click', () => document.getElementById('deleteConfirmModal').classList.remove('active'));
  document.getElementById('btnCancelDelete').addEventListener('click', () => document.getElementById('deleteConfirmModal').classList.remove('active'));
  document.getElementById('btnConfirmDelete').addEventListener('click', executeItemDelete);

  // Security Form inputs
  document.getElementById('adminUsername').addEventListener('input', updateDraftSecurity);
  document.getElementById('repoOwner').addEventListener('input', updateDraftSecurity);
  document.getElementById('repoName').addEventListener('input', updateDraftSecurity);
  document.getElementById('repoBranch').addEventListener('input', updateDraftSecurity);

  // Publish & Discard Actions
  quickPublishBtn.addEventListener('click', () => {
    document.querySelector('.admin-tab-btn[data-tab="publish"]').click();
  });
  document.getElementById('btnPublishCommit').addEventListener('click', handlePublish);
  document.getElementById('btnDiscardEdits').addEventListener('click', handleDiscard);
  document.getElementById('btnReloadStaleConfig').addEventListener('click', handleReloadStaleConfig);
}

function openLoginModal() {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.classList.add('active');
    const passInput = document.getElementById('loginPassword');
    if (passInput) passInput.focus();
  }
}

function openAdminPanel() {
  draftConfig = JSON.parse(JSON.stringify(getConfig()));
  document.getElementById('publishPAT').value = getSavedPAT();

  activeShopLang = getLanguage();
  loadShopInfoFormFromDraft();

  activeThemeEditingMode = getThemeMode();
  if (activeThemeEditingMode === 'light') {
    document.getElementById('btnEditLightTheme').click();
  } else {
    document.getElementById('btnEditDarkTheme').click();
  }

  // Grid
  const g = draftConfig.grid || {};
  document.getElementById('gridDesktop').value = g.columnsDesktop || 3;
  document.getElementById('gridTablet').value = g.columnsTablet || 2;
  document.getElementById('gridMobile').value = g.columnsMobile || 1;
  const gapVal = g.gapPx || 24;
  document.getElementById('gridGap').value = gapVal;
  document.getElementById('gridGapVal').textContent = gapVal;

  // Security
  const a = draftConfig.admin || {};
  document.getElementById('adminUsername').value = a.username || 'admin';
  document.getElementById('repoOwner').value = a.repoOwner || 'hafedazerty100';
  document.getElementById('repoName').value = a.repoName || 'Portfolio';
  document.getElementById('repoBranch').value = a.repoBranch || 'main';

  renderAdminItemsList();

  document.getElementById('staleCommitBanner').style.display = 'none';
  document.getElementById('adminPanel').classList.add('active');
}

function loadShopInfoFormFromDraft() {
  if (!draftConfig || !draftConfig.i18n) return;
  const content = draftConfig.i18n[activeShopLang] || draftConfig.i18n['en'];
  const s = content.shop || {};

  document.getElementById('adminShopName').value = s.name || '';
  document.getElementById('adminShopTagline').value = s.tagline || '';
  document.getElementById('adminShopDesc').value = s.description || '';

  currentShopLogoBase64 = s.logoUrl || '';
  const logoImgEl = document.getElementById('shopLogoPreviewImg');
  const logoBoxEl = document.getElementById('shopLogoPreviewBox');
  if (currentShopLogoBase64) {
    logoImgEl.setAttribute('src', currentShopLogoBase64);
    logoBoxEl.style.display = 'block';
  } else {
    logoImgEl.removeAttribute('src');
    logoBoxEl.style.display = 'none';
  }

  document.getElementById('adminShopEmail').value = s.contactEmail || '';
  document.getElementById('adminShopPhone').value = s.phone || '';

  const soc = s.socialLinks || {};
  document.getElementById('adminSocialInstagram').value = soc.instagram || '';
  document.getElementById('adminSocialFacebook').value = soc.facebook || '';
  document.getElementById('adminSocialWhatsapp').value = soc.whatsapp || '';
  document.getElementById('adminSocialTwitter').value = soc.twitter || '';
}

function handleShopLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 300;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/png'); // PNG preserves logo transparency
      currentShopLogoBase64 = compressedBase64;

      const imgEl = document.getElementById('shopLogoPreviewImg');
      const boxEl = document.getElementById('shopLogoPreviewBox');
      imgEl.setAttribute('src', compressedBase64);
      boxEl.style.display = 'block';

      saveShopInfoFormToDraft();
      setConfig(draftConfig, true);
      showToast('Shop Logo uploaded & updated!', 'success');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function saveShopInfoFormToDraft() {
  if (!draftConfig || !draftConfig.i18n) return;

  ['en', 'fr', 'ar'].forEach(lang => {
    draftConfig.i18n[lang] = draftConfig.i18n[lang] || {};
    draftConfig.i18n[lang].shop = draftConfig.i18n[lang].shop || {};
  });

  const curShop = draftConfig.i18n[activeShopLang].shop;
  curShop.name = document.getElementById('adminShopName').value;
  curShop.tagline = document.getElementById('adminShopTagline').value;
  curShop.description = document.getElementById('adminShopDesc').value;

  const contactEmail = document.getElementById('adminShopEmail').value;
  const phone = document.getElementById('adminShopPhone').value;
  const socialLinks = {
    instagram: document.getElementById('adminSocialInstagram').value,
    facebook: document.getElementById('adminSocialFacebook').value,
    whatsapp: document.getElementById('adminSocialWhatsapp').value,
    twitter: document.getElementById('adminSocialTwitter').value
  };

  ['en', 'fr', 'ar'].forEach(lang => {
    draftConfig.i18n[lang].shop.logoUrl = currentShopLogoBase64;
    draftConfig.i18n[lang].shop.contactEmail = contactEmail;
    draftConfig.i18n[lang].shop.phone = phone;
    draftConfig.i18n[lang].shop.socialLinks = socialLinks;
  });
}

function loadThemePaletteToForm() {
  if (!draftConfig || !draftConfig.theme) return;
  const mode = activeThemeEditingMode;
  const palette = draftConfig.theme[mode] || draftConfig.theme.dark;

  document.getElementById('themePrimary').value = palette.primary || '#6366f1';
  document.getElementById('themeSecondary').value = palette.secondary || '#0f172a';
  document.getElementById('themeBg').value = palette.background || '#0b0f19';
  document.getElementById('themeCardBg').value = palette.cardBackground || '#131b2e';
  document.getElementById('themeText').value = palette.text || '#f8fafc';
  document.getElementById('themeAccent').value = palette.accent || '#06b6d4';
  document.getElementById('themeBorder').value = palette.border || '#1e293b';

  document.getElementById('themeFontFamily').value = draftConfig.theme.fontFamily || 'Inter, system-ui, -apple-system, sans-serif';
  const radVal = parseInt(draftConfig.theme.borderRadius) || 16;
  document.getElementById('themeBorderRadius').value = radVal;
  document.getElementById('borderRadiusVal').textContent = radVal;
}

function updateDraftTheme() {
  if (!draftConfig || !draftConfig.theme) return;
  const mode = activeThemeEditingMode;
  draftConfig.theme[mode] = {
    primary: document.getElementById('themePrimary').value,
    secondary: document.getElementById('themeSecondary').value,
    background: document.getElementById('themeBg').value,
    cardBackground: document.getElementById('themeCardBg').value,
    text: document.getElementById('themeText').value,
    textMuted: (mode === 'dark') ? '#94a3b8' : '#64748b',
    accent: document.getElementById('themeAccent').value,
    border: document.getElementById('themeBorder').value
  };

  draftConfig.theme.fontFamily = document.getElementById('themeFontFamily').value;
  const rad = document.getElementById('themeBorderRadius').value;
  draftConfig.theme.borderRadius = `${rad}px`;
  document.getElementById('borderRadiusVal').textContent = rad;

  setConfig(draftConfig, true);
}

function updateDraftGrid() {
  if (!draftConfig) return;
  const gap = document.getElementById('gridGap').value;
  document.getElementById('gridGapVal').textContent = gap;

  draftConfig.grid = {
    columnsDesktop: parseInt(document.getElementById('gridDesktop').value) || 3,
    columnsTablet: parseInt(document.getElementById('gridTablet').value) || 2,
    columnsMobile: parseInt(document.getElementById('gridMobile').value) || 1,
    gapPx: parseInt(gap) || 24
  };

  setConfig(draftConfig, true);
}

function updateDraftSecurity() {
  if (!draftConfig) return;
  draftConfig.admin = draftConfig.admin || {};
  draftConfig.admin.username = document.getElementById('adminUsername').value;
  draftConfig.admin.repoOwner = document.getElementById('repoOwner').value;
  draftConfig.admin.repoName = document.getElementById('repoName').value;
  draftConfig.admin.repoBranch = document.getElementById('repoBranch').value;

  setConfig(draftConfig, false);
}

/**
 * Renders both Admin Item Row List AND Live Grid Preview inside Admin Panel
 */
function renderAdminItemsList() {
  const container = document.getElementById('adminItemsList');
  const previewContainer = document.getElementById('adminLivePreviewGrid');
  if (!container) return;
  container.innerHTML = '';

  draftConfig = draftConfig || JSON.parse(JSON.stringify(getConfig()));
  const lang = getLanguage();
  const items = (draftConfig.i18n && draftConfig.i18n[lang]) ? draftConfig.i18n[lang].items || [] : (draftConfig.i18n?.en?.items || []);

  if (items.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--color-text-muted);">No items in catalog. Click "+ Add New Item" to create one.</div>`;
    if (previewContainer) previewContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--color-text-muted);">No items in grid preview.</div>`;
    return;
  }

  // 1. Render Admin Item Row Controls
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';
    const imgSrc = item.imageBase64 || item.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150';

    row.innerHTML = `
      <div class="admin-item-info">
        <img src="${imgSrc}" class="admin-item-thumb" alt="">
        <div>
          <div class="admin-item-title">${escapeHTML(item.title)}</div>
          <div class="admin-item-meta">${escapeHTML(item.category)} • ${escapeHTML(item.price)}</div>
        </div>
      </div>
      <div class="admin-item-actions">
        <button class="btn btn-secondary btn-edit-item" style="padding: 6px 12px; font-size: 0.8rem;">Edit</button>
        <button class="btn btn-danger btn-delete-item" style="padding: 6px 12px; font-size: 0.8rem;">Delete</button>
      </div>
    `;

    row.querySelector('.btn-edit-item').addEventListener('click', () => openItemModal(item.id));
    row.querySelector('.btn-delete-item').addEventListener('click', () => promptDeleteItem(item.id, item.title));

    container.appendChild(row);
  });

  // 2. Render Live Grid Preview Cards Inside Admin Panel
  if (previewContainer) {
    previewContainer.innerHTML = items.map(item => {
      const imgSrc = item.imageBase64 || item.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
      return `
        <div class="item-card" style="pointer-events: none;">
          <div class="item-card-image-wrap">
            <img src="${imgSrc}" class="item-card-image" alt="${escapeHTML(item.title)}">
            ${item.category ? `<span class="item-badge">${escapeHTML(item.category)}</span>` : ''}
          </div>
          <div class="item-card-body">
            <h3 class="item-card-title">${escapeHTML(item.title)}</h3>
            <p class="item-card-desc">${escapeHTML(item.shortDescription)}</p>
            <div class="item-card-meta">
              <span class="item-card-price">${escapeHTML(item.price)}</span>
              <span class="btn-card-action">Preview</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function openItemModal(itemId = null) {
  editingItemId = itemId;
  activeItemLang = 'en';

  draftConfig = draftConfig || JSON.parse(JSON.stringify(getConfig()));

  document.querySelectorAll('[data-item-lang]').forEach(b => b.classList.remove('active'));
  const enTabBtn = document.querySelector('[data-item-lang="en"]');
  if (enTabBtn) enTabBtn.classList.add('active');

  const modal = document.getElementById('itemModal');
  const titleEl = document.getElementById('itemModalTitle');
  document.getElementById('itemFormFileInput').value = '';

  if (itemId) {
    titleEl.textContent = 'Edit Item';
    ['en', 'fr', 'ar'].forEach(lang => {
      const list = (draftConfig.i18n && draftConfig.i18n[lang]) ? draftConfig.i18n[lang].items || [] : [];
      const item = list.find(i => i.id === itemId);
      temporaryItemState[lang] = item ? JSON.parse(JSON.stringify(item)) : { id: itemId };
    });
    currentModalImageBase64 = temporaryItemState['en'].imageBase64 || temporaryItemState['en'].imageUrl || '';
  } else {
    titleEl.textContent = 'Add New Item';
    const newId = `item-${Date.now()}`;
    currentModalImageBase64 = '';
    ['en', 'fr', 'ar'].forEach(lang => {
      temporaryItemState[lang] = {
        id: newId,
        title: '',
        category: '',
        price: '',
        shortDescription: '',
        fullDescription: '',
        imageBase64: '',
        imageUrl: '',
        extraFields: { duration: '', instructor: '' }
      };
    });
  }

  loadItemFormFromTemporary();
  modal.classList.add('active');
}

function loadItemFormFromTemporary() {
  const item = temporaryItemState[activeItemLang] || {};
  document.getElementById('itemFormTitle').value = item.title || '';
  document.getElementById('itemFormCategory').value = item.category || '';
  document.getElementById('itemFormPrice').value = item.price || '';
  document.getElementById('itemFormShortDesc').value = item.shortDescription || '';
  document.getElementById('itemFormFullDesc').value = item.fullDescription || '';

  const imgEl = document.getElementById('imagePreviewImg');
  const boxEl = document.getElementById('imagePreviewBox');

  const sharedImg = currentModalImageBase64 || item.imageBase64 || temporaryItemState['en'].imageBase64 || '';
  if (sharedImg) {
    imgEl.setAttribute('src', sharedImg);
    boxEl.style.display = 'block';
  } else {
    imgEl.removeAttribute('src');
    boxEl.style.display = 'none';
  }

  const container = document.getElementById('extraFieldsContainer');
  container.innerHTML = '';
  const extras = item.extraFields || {};
  Object.keys(extras).forEach(k => addExtraFieldRow(k, extras[k]));
}

function saveItemFormToTemporary() {
  if (!temporaryItemState[activeItemLang]) {
    temporaryItemState[activeItemLang] = {};
  }
  const item = temporaryItemState[activeItemLang];
  item.title = document.getElementById('itemFormTitle').value.trim();
  item.category = document.getElementById('itemFormCategory').value.trim();
  item.price = document.getElementById('itemFormPrice').value.trim();
  item.shortDescription = document.getElementById('itemFormShortDesc').value.trim();
  item.fullDescription = document.getElementById('itemFormFullDesc').value.trim();

  // Track ONLY via currentModalImageBase64 (NO .src reading!)
  ['en', 'fr', 'ar'].forEach(lang => {
    if (!temporaryItemState[lang]) temporaryItemState[lang] = {};
    temporaryItemState[lang].imageBase64 = currentModalImageBase64;
    temporaryItemState[lang].imageUrl = currentModalImageBase64;
  });

  const extraFields = {};
  const keys = document.querySelectorAll('.extra-key');
  const vals = document.querySelectorAll('.extra-val');
  keys.forEach((kEl, idx) => {
    const k = kEl.value.trim();
    const v = vals[idx] ? vals[idx].value.trim() : '';
    if (k) extraFields[k] = v;
  });
  item.extraFields = extraFields;
}

function addExtraFieldRow(key = '', val = '') {
  const container = document.getElementById('extraFieldsContainer');
  const row = document.createElement('div');
  row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 30px; gap: 8px; margin-bottom: 8px;';
  row.innerHTML = `
    <input type="text" placeholder="Key" class="form-input extra-key" value="${escapeHTML(key)}">
    <input type="text" placeholder="Value" class="form-input extra-val" value="${escapeHTML(val)}">
    <button type="button" class="btn btn-secondary btn-remove-extra" style="padding: 0; color: var(--color-danger);">&times;</button>
  `;
  row.querySelector('.btn-remove-extra').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function handleImageFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      currentModalImageBase64 = compressedBase64;

      const imgEl = document.getElementById('imagePreviewImg');
      const boxEl = document.getElementById('imagePreviewBox');
      imgEl.setAttribute('src', compressedBase64);
      boxEl.style.display = 'block';

      // Store immediately to temporary state
      ['en', 'fr', 'ar'].forEach(lang => {
        if (!temporaryItemState[lang]) temporaryItemState[lang] = {};
        temporaryItemState[lang].imageBase64 = compressedBase64;
        temporaryItemState[lang].imageUrl = compressedBase64;
      });

      showToast(`Image uploaded & compressed to ${Math.round(width)}x${Math.round(height)}px`, 'success');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function handleSaveItem(e) {
  e.preventDefault();
  saveItemFormToTemporary();

  draftConfig = draftConfig || JSON.parse(JSON.stringify(getConfig()));
  draftConfig.i18n = draftConfig.i18n || { en: {}, fr: {}, ar: {} };

  const primary = temporaryItemState['en'] || {};
  const itemIdToUse = editingItemId || primary.id || `item-${Date.now()}`;

  ['en', 'fr', 'ar'].forEach(lang => {
    draftConfig.i18n[lang] = draftConfig.i18n[lang] || {};
    draftConfig.i18n[lang].items = draftConfig.i18n[lang].items || [];
    const list = draftConfig.i18n[lang].items;
    const currentLangItem = temporaryItemState[lang] || {};

    const finalItem = {
      id: itemIdToUse,
      title: currentLangItem.title || primary.title || 'Untitled Item',
      category: currentLangItem.category || primary.category || 'General',
      price: currentLangItem.price || primary.price || '$0.00',
      shortDescription: currentLangItem.shortDescription || primary.shortDescription || '',
      fullDescription: currentLangItem.fullDescription || primary.fullDescription || '',
      imageBase64: currentModalImageBase64 || primary.imageBase64 || currentLangItem.imageBase64 || '',
      imageUrl: currentModalImageBase64 || primary.imageBase64 || currentLangItem.imageBase64 || '',
      extraFields: (currentLangItem.extraFields && Object.keys(currentLangItem.extraFields).length > 0)
        ? currentLangItem.extraFields
        : (primary.extraFields || {})
    };

    if (editingItemId) {
      const idx = list.findIndex(i => i.id === editingItemId);
      if (idx !== -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
    } else {
      list.push(finalItem);
    }
  });

  // Apply to in-memory config and update live DOM and Admin Live Grid Preview
  setConfig(draftConfig, true);
  renderAdminItemsList();
  document.getElementById('itemModal').classList.remove('active');
  showToast('Item saved successfully!', 'success');
}

function promptDeleteItem(itemId, itemTitle) {
  itemToDeleteId = itemId;
  const textEl = document.getElementById('deleteConfirmText');
  textEl.innerHTML = `Are you sure you want to delete <strong>"${escapeHTML(itemTitle)}"</strong>?<br><span style="color: var(--color-text-muted); font-size: 0.85rem;">This action cannot be undone.</span>`;
  document.getElementById('deleteConfirmModal').classList.add('active');
}

function executeItemDelete() {
  if (!itemToDeleteId || !draftConfig) return;

  ['en', 'fr', 'ar'].forEach(lang => {
    if (draftConfig.i18n && draftConfig.i18n[lang]) {
      draftConfig.i18n[lang].items = (draftConfig.i18n[lang].items || []).filter(i => i.id !== itemToDeleteId);
    }
  });

  setConfig(draftConfig, true);
  renderAdminItemsList();
  document.getElementById('deleteConfirmModal').classList.remove('active');
  showToast('Item deleted from catalog.', 'warning');
}

async function handlePublish() {
  const statusEl = document.getElementById('publishStatus');
  const patInput = document.getElementById('publishPAT').value.trim();

  if (!patInput) {
    statusEl.innerHTML = `<div class="alert-banner alert-danger">⚠️ Personal Access Token (PAT) is required to publish. Enter a valid PAT token above.</div>`;
    return;
  }

  setSavedPAT(patInput);

  const newPass = document.getElementById('adminNewPassword').value.trim();
  if (newPass) {
    const strength = validatePasswordStrength(newPass);
    if (!strength.valid) {
      statusEl.innerHTML = `<div class="alert-banner alert-danger">⚠️ Password Security Error: ${strength.message}</div>`;
      return;
    }
    const passHash = await hashPassword(newPass);
    draftConfig.admin.passwordHash = passHash;
  }

  statusEl.innerHTML = `<div class="alert-banner alert-warning">⏳ Publishing changes to GitHub API... Please wait.</div>`;

  try {
    const owner = draftConfig.admin.repoOwner || 'hafedazerty100';
    const repo = draftConfig.admin.repoName || 'Portfolio';
    const branch = draftConfig.admin.repoBranch || 'main';

    const result = await publishConfigToGitHub({
      owner,
      repo,
      path: 'data/config.json',
      branch,
      patToken: patInput,
      configData: draftConfig,
      currentSha: initialConfigSha
    });

    initialConfigSha = result.newSha;
    document.getElementById('staleCommitBanner').style.display = 'none';
    statusEl.innerHTML = `
      <div class="alert-banner" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399;">
        🎉 <strong>Published Successfully!</strong><br>
        Changes committed to GitHub. GitHub Pages will deploy updates live for all visitors within ~30–90 seconds.
      </div>
    `;
    showToast('Published live to GitHub repository!', 'success');
  } catch (err) {
    if (err instanceof StaleCommitConflictError) {
      document.getElementById('staleCommitBanner').style.display = 'block';
      statusEl.innerHTML = `<div class="alert-banner alert-danger"><strong>409 Conflict:</strong> ${err.message}</div>`;
    } else {
      statusEl.innerHTML = `<div class="alert-banner alert-danger">❌ <strong>Publish Failed:</strong> ${escapeHTML(err.message)}</div>`;
    }
  }
}

async function handleDiscard() {
  if (confirm('Discard all unpublished edits and reload original configuration?')) {
    const config = await loadConfig(true);
    draftConfig = JSON.parse(JSON.stringify(config));
    openAdminPanel();
    showToast('Unpublished edits discarded.', 'warning');
  }
}

async function handleReloadStaleConfig() {
  try {
    const config = await loadConfig(true);
    draftConfig = JSON.parse(JSON.stringify(config));
    openAdminPanel();
    showToast('Reloaded latest configuration from GitHub.', 'success');
  } catch (err) {
    showToast('Failed to reload config: ' + err.message, 'error');
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

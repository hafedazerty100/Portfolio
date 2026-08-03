/**
 * Admin — Admin God-Mode system interface module
 */

import { getConfig, setConfig, applyTheme, loadConfig } from './config-loader.js';
import { loginAdmin, isSessionActive, logoutAdmin, getSavedPAT, setSavedPAT, validatePasswordStrength, hashPassword } from './auth.js';
import { publishConfigToGitHub, StaleCommitConflictError, getFileMetadata } from './github-api.js';

let draftConfig = null;
let initialConfigSha = null;
let editingItemId = null;
let itemToDeleteId = null;

/**
 * Initializes Admin module components into DOM
 */
export function initAdmin() {
  injectAdminDOM();
  bindEvents();
}

/**
 * Injects Modals, Panels, and Admin Triggers into document.body
 */
function injectAdminDOM() {
  const adminHTML = `
    <!-- Floating Unobtrusive Admin Button -->
    <div class="admin-trigger-wrap">
      <button id="adminTriggerBtn" class="btn-admin-trigger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7 7 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7 7 0 0 1 11 3.07V3a1 1 0 0 1 2 0v.07A7 7 0 0 1 18.93 9H19a1 1 0 0 1 0 2h-.07A7 7 0 0 1 13 16.93z"/></svg>
        Admin God-Mode
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
              <label class="form-label" for="loginPAT">GitHub Fine-Grained PAT (Optional for preview, required to Publish)</label>
              <input type="password" id="loginPAT" class="form-input" placeholder="github_pat_11..." autocomplete="off">
              <p class="form-hint">Stored securely in sessionStorage for this tab session only.</p>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Unlock God-Mode</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Full Admin God-Mode Panel -->
    <div id="adminPanel" class="admin-panel-overlay">
      <div class="admin-topbar">
        <div class="admin-topbar-title">
          <span>Apex Store Control Center</span>
          <span class="admin-badge">God-Mode Active</span>
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

          <!-- TAB 1: Shop Info -->
          <div id="tab-shop-info" class="admin-tab-pane active">
            <h2 class="pane-title">Shop Information</h2>
            <p class="pane-subtitle">Edit high-level branding, descriptions, logo, and social media links.</p>

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
            <div class="form-group">
              <label class="form-label">Logo Image URL</label>
              <input type="url" id="adminShopLogo" class="form-input" placeholder="https://...">
            </div>
            <div class="form-group">
              <label class="form-label">Contact Email</label>
              <input type="email" id="adminShopEmail" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" id="adminShopPhone" class="form-input">
            </div>
            <div style="margin-top: 24px; border-top: 1px solid var(--color-card-border); padding-top: 20px;">
              <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 16px;">Social Links</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
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
                  <label class="form-label">GitHub / Portfolio</label>
                  <input type="url" id="adminSocialGithub" class="form-input">
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: Theme & Colors -->
          <div id="tab-theme-style" class="admin-tab-pane">
            <h2 class="pane-title">Theme & Visual Styling</h2>
            <p class="pane-subtitle">Customize every color palette token and typography with real-time live preview.</p>

            <div class="color-picker-grid">
              <div class="color-picker-card">
                <input type="color" id="themePrimary" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Primary Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Buttons, highlights</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeSecondary" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Secondary Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Headers & navigation</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeBg" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Background</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Main page backdrop</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeCardBg" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Card Background</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Item card containers</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeText" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Text Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Primary text color</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeAccent" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Accent Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Price tags & badges</div>
                </div>
              </div>
              <div class="color-picker-card">
                <input type="color" id="themeBorder" class="color-input-swatch">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;">Border Color</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-muted);">Card & section outlines</div>
                </div>
              </div>
            </div>

            <div style="margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div class="form-group">
                <label class="form-label">Font Family</label>
                <select id="themeFontFamily" class="form-select">
                  <option value="Inter, system-ui, -apple-system, sans-serif">Inter (Modern Clean)</option>
                  <option value="'Outfit', sans-serif">Outfit (Bold Display)</option>
                  <option value="'Roboto Mono', monospace">Roboto Mono (Developer/Tech)</option>
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

          <!-- TAB 4: Items Catalog CRUD -->
          <div id="tab-items-crud" class="admin-tab-pane">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <h2 class="pane-title" style="margin: 0;">Items Catalog Manager</h2>
                <p class="pane-subtitle" style="margin: 0;">Add, edit, delete, and manage store courses/items.</p>
              </div>
              <button id="btnAddNewItem" class="btn btn-primary">
                + Add New Item
              </button>
            </div>

            <!-- Items Admin List Container -->
            <div id="adminItemsList" class="admin-items-list"></div>
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

    <!-- Add/Edit Item Modal -->
    <div id="itemModal" class="modal-overlay">
      <div class="modal-container" style="max-width: 640px;">
        <div class="modal-header">
          <h3 id="itemModalTitle" class="modal-title">Edit Item</h3>
          <button id="closeItemModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
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
              <label class="form-label">Short Description (Card teaser)</label>
              <input type="text" id="itemFormShortDesc" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Full Description (Detail page)</label>
              <textarea id="itemFormFullDesc" class="form-textarea" required></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Image Option</label>
              <div class="alert-banner alert-warning" style="padding: 10px 14px; margin-bottom: 10px; font-size: 0.8rem;">
                💡 <strong>Recommended:</strong> Provide an Image URL. Uploading Base64 files directly compresses images to max 800px to avoid bloating JSON size.
              </div>
              <label class="form-label" style="font-size: 0.8rem;">Option A: Image URL</label>
              <input type="url" id="itemFormImageUrl" class="form-input" placeholder="https://images.unsplash.com/...">
              
              <label class="form-label" style="font-size: 0.8rem; margin-top: 12px;">Option B: Upload File (Auto-resizes & compresses)</label>
              <input type="file" id="itemFormFileInput" accept="image/*" class="form-input">
              <div id="imagePreviewBox" style="margin-top: 10px; display: none;">
                <img id="imagePreviewImg" src="" style="max-height: 120px; border-radius: 8px; border: 1px solid var(--color-card-border);">
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

    <!-- Toast Notification Holder -->
    <div id="toastContainer" class="toast-container"></div>
  `;

  document.body.insertAdjacentHTML('beforeend', adminHTML);
}

/**
 * Binds DOM event handlers
 */
function bindEvents() {
  const triggerBtn = document.getElementById('adminTriggerBtn');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModal = document.getElementById('closeLoginModal');
  const loginForm = document.getElementById('loginForm');
  const adminPanel = document.getElementById('adminPanel');
  const closeAdminPanel = document.getElementById('closeAdminPanel');
  const quickPublishBtn = document.getElementById('quickPublishBtn');

  // Trigger Login or Admin Panel
  triggerBtn.addEventListener('click', () => {
    if (isSessionActive()) {
      openAdminPanel();
    } else {
      openLoginModal();
    }
  });

  closeLoginModal.addEventListener('click', () => loginModal.classList.remove('active'));
  closeAdminPanel.addEventListener('click', () => adminPanel.classList.remove('active'));

  // Handle Login Submission
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
        showToast('God-Mode unlocked successfully!', 'success');
      } else {
        loginAlert.textContent = res.error;
        loginAlert.style.display = 'block';
      }
    } catch (err) {
      loginAlert.textContent = err.message;
      loginAlert.style.display = 'block';
    }
  });

  // Admin Sidebar Tab Switching
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

  // Real-time Inputs binding for Shop Info
  const shopInputs = ['adminShopName', 'adminShopTagline', 'adminShopDesc', 'adminShopLogo', 'adminShopEmail', 'adminShopPhone', 'adminSocialInstagram', 'adminSocialFacebook', 'adminSocialWhatsapp', 'adminSocialGithub'];
  shopInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateDraftShopInfo);
  });

  // Real-time Inputs binding for Theme Colors & Settings
  const themeInputs = ['themePrimary', 'themeSecondary', 'themeBg', 'themeCardBg', 'themeText', 'themeAccent', 'themeBorder', 'themeFontFamily', 'themeBorderRadius'];
  themeInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateDraftTheme);
  });

  // Real-time Inputs binding for Grid Layout
  const gridInputs = ['gridDesktop', 'gridTablet', 'gridMobile', 'gridGap'];
  gridInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateDraftGrid);
  });

  // CRUD Items Trigger
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
  document.getElementById('loginModal').classList.add('active');
  document.getElementById('loginPassword').focus();
}

/**
 * Hydrates and renders Admin Panel state from in-memory config
 */
function openAdminPanel() {
  draftConfig = JSON.parse(JSON.stringify(getConfig()));
  document.getElementById('publishPAT').value = getSavedPAT();

  // Populate Shop Info Form
  const s = draftConfig.shop || {};
  document.getElementById('adminShopName').value = s.name || '';
  document.getElementById('adminShopTagline').value = s.tagline || '';
  document.getElementById('adminShopDesc').value = s.description || '';
  document.getElementById('adminShopLogo').value = s.logoUrl || '';
  document.getElementById('adminShopEmail').value = s.contactEmail || '';
  document.getElementById('adminShopPhone').value = s.phone || '';
  const soc = s.socialLinks || {};
  document.getElementById('adminSocialInstagram').value = soc.instagram || '';
  document.getElementById('adminSocialFacebook').value = soc.facebook || '';
  document.getElementById('adminSocialWhatsapp').value = soc.whatsapp || '';
  document.getElementById('adminSocialGithub').value = soc.github || '';

  // Populate Theme Colors & Typography
  const t = draftConfig.theme || {};
  const c = t.colors || {};
  document.getElementById('themePrimary').value = c.primary || '#4f46e5';
  document.getElementById('themeSecondary').value = c.secondary || '#0f172a';
  document.getElementById('themeBg').value = c.background || '#0b0f19';
  document.getElementById('themeCardBg').value = c.cardBackground || '#131b2e';
  document.getElementById('themeText').value = c.text || '#f8fafc';
  document.getElementById('themeAccent').value = c.accent || '#06b6d4';
  document.getElementById('themeBorder').value = c.border || '#1e293b';
  document.getElementById('themeFontFamily').value = t.fontFamily || 'Inter, system-ui, -apple-system, sans-serif';
  const radVal = parseInt(t.borderRadius) || 16;
  document.getElementById('themeBorderRadius').value = radVal;
  document.getElementById('borderRadiusVal').textContent = radVal;

  // Populate Grid Specs
  const g = draftConfig.grid || {};
  document.getElementById('gridDesktop').value = g.columnsDesktop || 3;
  document.getElementById('gridTablet').value = g.columnsTablet || 2;
  document.getElementById('gridMobile').value = g.columnsMobile || 1;
  const gapVal = g.gapPx || 24;
  document.getElementById('gridGap').value = gapVal;
  document.getElementById('gridGapVal').textContent = gapVal;

  // Populate Security Specs
  const a = draftConfig.admin || {};
  document.getElementById('adminUsername').value = a.username || 'admin';
  document.getElementById('repoOwner').value = a.repoOwner || 'hafedazerty100';
  document.getElementById('repoName').value = a.repoName || 'Portfolio';
  document.getElementById('repoBranch').value = a.repoBranch || 'main';

  // Render Items List
  renderAdminItemsList();

  document.getElementById('staleCommitBanner').style.display = 'none';
  document.getElementById('adminPanel').classList.add('active');
}

/**
 * Live DOM update for Shop Info edits
 */
function updateDraftShopInfo() {
  if (!draftConfig) return;
  draftConfig.shop = draftConfig.shop || {};
  draftConfig.shop.name = document.getElementById('adminShopName').value;
  draftConfig.shop.tagline = document.getElementById('adminShopTagline').value;
  draftConfig.shop.description = document.getElementById('adminShopDesc').value;
  draftConfig.shop.logoUrl = document.getElementById('adminShopLogo').value;
  draftConfig.shop.contactEmail = document.getElementById('adminShopEmail').value;
  draftConfig.shop.phone = document.getElementById('adminShopPhone').value;
  draftConfig.shop.socialLinks = {
    instagram: document.getElementById('adminSocialInstagram').value,
    facebook: document.getElementById('adminSocialFacebook').value,
    whatsapp: document.getElementById('adminSocialWhatsapp').value,
    github: document.getElementById('adminSocialGithub').value
  };

  setConfig(draftConfig, true);
}

/**
 * Live DOM update for Theme edits (updates CSS custom properties live!)
 */
function updateDraftTheme() {
  if (!draftConfig) return;
  draftConfig.theme = draftConfig.theme || {};
  draftConfig.theme.colors = {
    primary: document.getElementById('themePrimary').value,
    secondary: document.getElementById('themeSecondary').value,
    background: document.getElementById('themeBg').value,
    cardBackground: document.getElementById('themeCardBg').value,
    text: document.getElementById('themeText').value,
    textMuted: '#94a3b8',
    accent: document.getElementById('themeAccent').value,
    border: document.getElementById('themeBorder').value
  };
  draftConfig.theme.fontFamily = document.getElementById('themeFontFamily').value;
  const rad = document.getElementById('themeBorderRadius').value;
  draftConfig.theme.borderRadius = `${rad}px`;
  document.getElementById('borderRadiusVal').textContent = rad;

  setConfig(draftConfig, true);
}

/**
 * Live DOM update for Grid Layout edits
 */
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

/**
 * Live update for Admin security & repo fields
 */
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
 * Renders Items list in Admin panel
 */
function renderAdminItemsList() {
  const container = document.getElementById('adminItemsList');
  container.innerHTML = '';

  const items = draftConfig.items || [];
  if (items.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--color-text-muted);">No items in catalog. Click "+ Add New Item" to create one.</div>`;
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';
    const imgSrc = item.imageUrl || item.imageBase64 || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150';

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
}

/**
 * Opens Item Add/Edit Modal
 */
function openItemModal(itemId = null) {
  editingItemId = itemId;
  const modal = document.getElementById('itemModal');
  const titleEl = document.getElementById('itemModalTitle');
  const container = document.getElementById('extraFieldsContainer');
  container.innerHTML = '';
  document.getElementById('imagePreviewBox').style.display = 'none';
  document.getElementById('itemFormFileInput').value = '';

  if (itemId) {
    titleEl.textContent = 'Edit Item';
    const item = (draftConfig.items || []).find(i => i.id === itemId);
    if (item) {
      document.getElementById('itemFormTitle').value = item.title || '';
      document.getElementById('itemFormCategory').value = item.category || '';
      document.getElementById('itemFormPrice').value = item.price || '';
      document.getElementById('itemFormShortDesc').value = item.shortDescription || '';
      document.getElementById('itemFormFullDesc').value = item.fullDescription || '';
      document.getElementById('itemFormImageUrl').value = item.imageUrl || '';

      if (item.imageBase64) {
        document.getElementById('imagePreviewImg').src = item.imageBase64;
        document.getElementById('imagePreviewBox').style.display = 'block';
      }

      const extras = item.extraFields || {};
      Object.keys(extras).forEach(k => addExtraFieldRow(k, extras[k]));
    }
  } else {
    titleEl.textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    addExtraFieldRow('duration', '6 Weeks');
    addExtraFieldRow('instructor', 'Instructor Name');
  }

  modal.classList.add('active');
}

/**
 * Dynamically appends key-value row for item metadata
 */
function addExtraFieldRow(key = '', val = '') {
  const container = document.getElementById('extraFieldsContainer');
  const row = document.createElement('div');
  row.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 30px; gap: 8px; margin-bottom: 8px;';
  row.innerHTML = `
    <input type="text" placeholder="Key (e.g. Duration)" class="form-input extra-key" value="${escapeHTML(key)}">
    <input type="text" placeholder="Value (e.g. 6 Weeks)" class="form-input extra-val" value="${escapeHTML(val)}">
    <button type="button" class="btn btn-secondary btn-remove-extra" style="padding: 0; color: var(--color-danger);">&times;</button>
  `;
  row.querySelector('.btn-remove-extra').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

/**
 * Image upload Canvas client-side scaling & compression (max 800px, JPEG 0.85)
 */
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
      document.getElementById('imagePreviewImg').src = compressedBase64;
      document.getElementById('imagePreviewBox').style.display = 'block';
      showToast(`Image auto-compressed to ${Math.round(width)}x${Math.round(height)}px`, 'success');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Saves item details into draftConfig
 */
function handleSaveItem(e) {
  e.preventDefault();
  draftConfig.items = draftConfig.items || [];

  const title = document.getElementById('itemFormTitle').value;
  const category = document.getElementById('itemFormCategory').value;
  const price = document.getElementById('itemFormPrice').value;
  const shortDescription = document.getElementById('itemFormShortDesc').value;
  const fullDescription = document.getElementById('itemFormFullDesc').value;
  const imageUrl = document.getElementById('itemFormImageUrl').value;
  const imageBase64 = document.getElementById('imagePreviewBox').style.display !== 'none' ? document.getElementById('imagePreviewImg').src : '';

  // Extract extra metadata fields
  const extraFields = {};
  const keys = document.querySelectorAll('.extra-key');
  const vals = document.querySelectorAll('.extra-val');
  keys.forEach((kEl, idx) => {
    const k = kEl.value.trim();
    const v = vals[idx] ? vals[idx].value.trim() : '';
    if (k) extraFields[k] = v;
  });

  if (editingItemId) {
    const idx = draftConfig.items.findIndex(i => i.id === editingItemId);
    if (idx !== -1) {
      draftConfig.items[idx] = {
        ...draftConfig.items[idx],
        title, category, price, shortDescription, fullDescription, imageUrl, imageBase64, extraFields
      };
    }
  } else {
    const newItem = {
      id: `item-${Date.now()}`,
      title, category, price, shortDescription, fullDescription, imageUrl, imageBase64, extraFields
    };
    draftConfig.items.push(newItem);
  }

  setConfig(draftConfig, true);
  renderAdminItemsList();
  document.getElementById('itemModal').classList.remove('active');
  showToast('Item saved successfully!', 'success');
}

/**
 * Prompts Delete Confirmation Dialog for Item
 */
function promptDeleteItem(itemId, itemTitle) {
  itemToDeleteId = itemId;
  const textEl = document.getElementById('deleteConfirmText');
  textEl.innerHTML = `Are you sure you want to delete <strong>"${escapeHTML(itemTitle)}"</strong>?<br><span style="color: var(--color-text-muted); font-size: 0.85rem;">This action cannot be undone.</span>`;
  document.getElementById('deleteConfirmModal').classList.add('active');
}

/**
 * Executes deletion after user confirmation
 */
function executeItemDelete() {
  if (!itemToDeleteId || !draftConfig) return;
  draftConfig.items = (draftConfig.items || []).filter(i => i.id !== itemToDeleteId);
  setConfig(draftConfig, true);
  renderAdminItemsList();
  document.getElementById('deleteConfirmModal').classList.remove('active');
  showToast('Item deleted from catalog.', 'warning');
}

/**
 * Handles Publish to GitHub REST Contents API
 */
async function handlePublish() {
  const statusEl = document.getElementById('publishStatus');
  const patInput = document.getElementById('publishPAT').value.trim();

  if (!patInput) {
    statusEl.innerHTML = `<div class="alert-banner alert-danger">⚠️ Personal Access Token (PAT) is required to publish. Enter a valid PAT token above.</div>`;
    return;
  }

  setSavedPAT(patInput);

  // Validate password change if provided
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

/**
 * Discard local edits and reload original config
 */
async function handleDiscard() {
  if (confirm('Discard all unpublished edits and reload original configuration?')) {
    const config = await loadConfig(true);
    draftConfig = JSON.parse(JSON.stringify(config));
    openAdminPanel();
    showToast('Unpublished edits discarded.', 'warning');
  }
}

/**
 * Reloads latest config from GitHub when 409 Stale Conflict is encountered
 */
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

/**
 * Toast Notification Helper
 */
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

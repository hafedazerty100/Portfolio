# Apex Online-Store & Portfolio (Zero-Backend Engine)

A responsive, high-performance static website and online catalog system hosted entirely on **GitHub Pages**, featuring a client-side **Admin Panel**, **Light & Dark Mode themes**, and **Multilingual Support (English, French, Arabic RTL)**.

The site requires **no database, server, or build step**. All site content, theme colors, typography, grid layouts, catalog items, and admin configuration live in `data/config.json`. Admin edits update the live page DOM instantly in real-time, and can be committed directly back to the GitHub repository using the GitHub REST Contents API.

---

## Key Features

- **Light & Dark Mode Dual Themes**:
  - `theme.light` and `theme.dark` color palettes configured independently in `data/config.json`.
  - Visitor-facing Sun ☀️ / Moon 🌙 toggle switching modes instantly.
  - Saved in `localStorage` with OS `prefers-color-scheme` auto-detection on first visit.
  - Admin Panel Theme tab allows independent editing of Light and Dark palettes with live preview.

- **Multilingual Support (EN / FR / AR) & Full RTL**:
  - Visitor-facing language switcher (`EN` / `FR` / `عربي`) saved in `localStorage`.
  - Full Right-to-Left (**RTL**) layout mirroring for Arabic (`dir="rtl"`), flipping text alignments, navigation, cards, badges, and modal headers.
  - Content structured per language (`config.i18n.en`, `config.i18n.fr`, `config.i18n.ar`) for shop metadata, course titles/descriptions, and UI labels.
  - Multilingual Admin Editors with language sub-tabs (EN / FR / AR) for Shop Info and Items CRUD.

- **Social & Contact Links**:
  - Supports Instagram, Facebook, WhatsApp, and Twitter (GitHub social link removed).

- **Client-Side Admin Panel**:
  - **Shop Info Manager**: Edit shop name, tagline, description, logo URL, email, phone, and social links per language.
  - **Theme Customizer**: Independent Light & Dark palette pickers, font selectors, border-radius sliders.
  - **Grid Layout Controls**: Set desktop (1–6), tablet (1–4), and mobile (1–2) column counts and grid gap.
  - **Items Catalog CRUD**: Add, edit, delete, and reorder items per language.
  - **Delete Confirmation Modal**: Requires explicit confirmation step before deleting items.
  - **Image Resizing & Compression Guard**: File uploads are automatically scaled & compressed (max 800px) using Canvas before converting to Base64.
  - **409 Stale-Commit Conflict Handling**: Detects if another admin published a newer version of `config.json` and alerts the user with a 1-click reload option.
  - **Security Settings**: Password change with Web Crypto SHA-256 re-hashing and password strength validation (minimum 12 characters).

---

## Initial Default Admin Credentials

> [!WARNING]
> Change the default password immediately after logging in for the first time!

- **Username**: `admin`
- **Default Password**: `AdminPassword123!`

---

## Setup & Deployment Guide

### 1. Enabling GitHub Pages
1. Go to your repository on GitHub: `https://github.com/hafedazerty100/Portfolio`
2. Open **Settings** -> **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `main` (or `master`) and `/ (root)` folder.
4. Click **Save**. GitHub Pages will deploy your site URL (e.g. `https://hafedazerty100.github.io/Portfolio/`).

### 2. Creating a Fine-Grained Personal Access Token (PAT)
To allow the Admin Panel to publish live edits back to your repository:
1. On GitHub, go to **Settings** -> **Developer Settings** -> **Personal access tokens** -> **Fine-grained tokens**.
2. Click **Generate new token**.
3. Give the token a name (e.g., `Apex Store Admin Token`).
4. Under **Repository access**, select **Only select repositories** and pick `hafedazerty100/Portfolio`.
5. Under **Permissions** -> **Repository permissions**:
   - Locate **Contents** -> Set to **Read and write**.
6. Click **Generate token** and copy the generated `github_pat_...` string.
7. Paste this PAT into the Admin Login or Publish tab when making changes.

---

## Security Policy

- **Token Storage**: Your PAT is stored strictly in browser `sessionStorage` (cleared when the browser tab closes). It is **never** committed to Git, logged to console, or saved to `localStorage`.
- **Password Hash Visibility**: Because GitHub Free Pages repositories are public, `data/config.json` (including `admin.passwordHash`) is visible to the public. Admin passwords MUST be at least 12 characters long.

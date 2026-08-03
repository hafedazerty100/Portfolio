# Apex Online-Store & Portfolio (Zero-Backend Engine)

A responsive, high-performance static website and online catalog system hosted entirely on **GitHub Pages**, featuring a client-side **"God-Mode" Admin Panel**.

The site requires **no database, server, or build step**. All site content, theme colors, typography, grid layouts, catalog items, and admin configuration live in `data/config.json`. Admin edits update the live page DOM instantly in real-time, and can be committed directly back to the GitHub repository using the GitHub REST Contents API.

---

## Features

- **100% Data-Driven Architecture**: Every piece of content, image URL, contact link, color token, and layout breakpoint is read dynamically from `data/config.json`.
- **God-Mode Client-Side Admin Panel**:
  - **Shop Info Manager**: Edit shop name, tagline, description, logo URL, contact email, phone, and social links.
  - **Theme Customizer with Live Preview**: Color pickers for primary/secondary/background/card colors, Google font selector, border-radius sliders.
  - **Grid Layout Controls**: Set desktop (1–6), tablet (1–4), and mobile (1–2) column counts and grid gap spacing.
  - **Items Catalog CRUD**: Add, edit, delete, and reorder items.
  - **Image Resizing & Compression Guard**: File uploads are automatically scaled & compressed (max 800px) using client-side Canvas before converting to Base64 to prevent repo bloat.
  - **Item Delete Confirmation**: Requires explicit confirmation step before deleting catalog items.
  - **409 Stale-Commit Conflict Handling**: Detects if another admin published a newer version of `config.json` and alerts the user with a 1-click reload option.
  - **Security Settings**: Password change with Web Crypto SHA-256 re-hashing and password strength validation (minimum 12 characters).
- **GitHub Pages Direct Sync**: Publish changes directly to GitHub via fine-grained Personal Access Tokens (PAT).

---

## Initial Default Admin Credentials

> [!WARNING]
> Change the default password immediately after logging in for the first time!

- **Username**: `admin`
- **Default Password**: `AdminPassword123!`

To update the password:
1. Click **Admin God-Mode** at the bottom of the page.
2. Log in with `admin` / `AdminPassword123!`.
3. Open the **Security & Repo** tab.
4. Enter a new strong password (12+ characters) and click **Publish & Sync** -> **Commit & Publish to GitHub**.

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
- **Password Hash Visibility**: Because GitHub Free Pages repositories are public, `data/config.json` (including `admin.passwordHash`) is visible to the public. Admin passwords MUST be at least 12 characters long to prevent offline rainbow-table cracking.

---

## Known Architecture Caveats & Trade-offs

- **Publish Delay (~30–90 seconds)**: When you click **Publish Changes**, the Admin panel commits an updated `data/config.json` file to GitHub via API. GitHub Pages then automatically triggers a rebuild. Changes will be visible to all web visitors within 30 to 90 seconds.
- **Sub-Second Instant Sync Comparison**: If instant sub-second writes without GitHub build delays are required in the future, a micro-backend service (e.g., Render / Cloudflare Workers + SQLite) can be attached, but for a 100% free static site, GitHub Pages + Contents API provides zero server maintenance cost.

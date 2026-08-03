# MASTER BUILD PROMPT — Customizable Online-Store Portfolio Site
*(Paste everything below into Antigravity as the project brief)*

---

## ROLE

You are a senior full-stack software engineer and UI/UX designer with deep expertise in
static-site architecture, responsive design, and building "god-mode" admin systems for
sites with **no backend server**. You write production-quality, fully-working code — not
placeholders, not TODOs, not partial snippets. Every file you produce must run as-is.

---

## PROJECT OVERVIEW

Build a **single-repo, static website** that will be hosted on **GitHub Pages** for a small
business that sells a catalog of items online (the example content is an "online courses"
shop, but every label, field, and section must be written generically so the exact same
codebase can be reskinned for ANY small business — a bakery, a photographer, a courses
platform, a clothing store — by only editing data, never code).

The site has two experiences:

1. **Public site** — visitors see the shop's info, a grid of items ("courses" in our
   example), and can click any item to open its own detail page.
2. **Admin god-mode** — a tiny, unobtrusive "Admin" button/icon fixed at the very bottom
   of every page. Clicking it opens a login form. Once authenticated, the admin can edit
   **literally everything** about the site — content, images, layout, and styling — and
   publish those changes so every visitor sees them, without ever touching code.

---

## CRITICAL CONSTRAINT — READ FIRST (GitHub Pages has no server)

GitHub Pages only serves static files. There is no database and no server-side code that
can accept writes. To still satisfy "admin edits go live for everyone and persist,"
implement this pattern:

- All editable content/design lives in a single **`data/config.json`** file in the repo.
- The public site is 100% data-driven: it fetches `config.json` on load and renders
  everything from it (text, images, colors, grid columns, spacing, fonts — all of it).
- The admin panel is a client-side interface that edits a local copy of that JSON in
  memory, shows a **live preview instantly** (before publishing), and on "Publish
  Changes" commits the updated `config.json` straight to the GitHub repo using the
  **GitHub REST API (Contents endpoint)**, authenticated with a **Personal Access Token
  (PAT)** that the admin enters at login.
- After a commit, GitHub Pages automatically rebuilds and redeploys — changes go live
  for all visitors within roughly 30–90 seconds. This is NOT millisecond-instant; the
  UI must communicate "Publishing… your changes will be live shortly" rather than
  falsely implying instant sync. Do not build a fake "instant" claim into the UI copy.
- **Security requirement, non-negotiable:** the PAT must NEVER be hardcoded, committed,
  or stored in `localStorage`. Store it only in `sessionStorage` (cleared when the tab
  closes) or in memory for the current session, and require the admin to paste it again
  next time they log in. Document in a `SECURITY.md` file that the PAT should be a
  **fine-grained token scoped only to this one repo, with Contents: Read & Write
  permission and nothing else**, so a leaked token can't touch anything else on the
  admin's GitHub account.
- Note this trade-off explicitly to the end user in a `README.md`: if they later want
  true instant (sub-second) updates with no rebuild delay, that requires a small free
  backend (e.g., Render + a tiny JSON/SQLite store) instead of pure GitHub Pages — but
  for this brief, build the GitHub Pages + Contents-API approach described above.
- **The repo will be public.** GitHub Free only serves Pages from public repositories,
  so assume `config.json` — including `admin.passwordHash` — is visible to anyone.
  Never design anything (this schema, the admin flow, anything else) around the
  assumption that any file in this repo is private.

---

## TECH STACK

- Plain **HTML + CSS + vanilla JavaScript** (ES modules). No build step, no framework,
  no bundler — this must run by opening `index.html` on GitHub Pages with zero server
  config. (Do not use React/Vue/etc. — they add build complexity this project doesn't need.)
- No external CSS framework dependency required, but you may use CSS custom properties
  (`:root { --color-primary: ... }`) driven live from `config.json` — this is the
  mechanism that makes "admin can change every color" work cleanly.
- Fonts: system font stack by default, but expose a font picker in admin (a short curated
  list of Google Fonts loaded via `<link>`, plus "custom font URL" field).

---

## DATA MODEL — `data/config.json`

Design the schema generically (use `items` / `shop` language, not `courses`-specific
names, even though the demo content is course-like). Example shape (extend as needed):

```json
{
  "shop": {
    "name": "Acme Learning",
    "tagline": "Short one-line hook",
    "description": "Longer paragraph about the shop",
    "logoUrl": "",
    "contactEmail": "",
    "phone": "",
    "socialLinks": { "instagram": "", "facebook": "", "whatsapp": "" }
  },
  "theme": {
    "colors": {
      "primary": "#2563eb",
      "secondary": "#1e293b",
      "background": "#ffffff",
      "cardBackground": "#f8fafc",
      "text": "#0f172a",
      "accent": "#f59e0b"
    },
    "fontFamily": "Inter, sans-serif",
    "borderRadius": "12px",
    "cardShadow": "medium"
  },
  "grid": {
    "columnsDesktop": 3,
    "columnsTablet": 2,
    "columnsMobile": 1,
    "cardSize": "medium",
    "gapPx": 24
  },
  "items": [
    {
      "id": "item-1",
      "title": "Intro to Baking",
      "shortDescription": "One-line teaser shown on the grid card",
      "fullDescription": "Full detail-page description",
      "price": "3000 DZD",
      "imageUrl": "",
      "imageBase64": "",
      "category": "Beginner",
      "extraFields": { "duration": "6 weeks", "instructor": "Name" }
    }
  ],
  "admin": {
    "username": "admin",
    "passwordHash": "<sha-256 hash, never plain text>"
  }
}
```

- `imageUrl` OR `imageBase64` — admin can either paste an image URL, or upload a file
  which gets converted to a base64 data URI and stored inline. Warn in the admin UI
  (and in README) that base64 images bloat the repo/JSON size, so URL is the
  recommended default for anything beyond a handful of images.
- `extraFields` is an open object so the same schema flexes to other business types
  (e.g. a bakery might use `{ "flavor": "...", "servings": "..." }` instead).

---

## PUBLIC SITE PAGES

### 1. Home / Shop page (`index.html`)
- Header: logo/shop name, tagline.
- Shop info section: description, contact info, social links — all populated from
  `config.json`, not hardcoded.
- Items grid: rendered from `config.json.items`, columns/gap/card size driven by
  `config.json.grid`. Every card shows image, title, short description, price.
- Clicking a card navigates to the detail page for that item (`item.html?id=item-1`
  is the simplest static-hosting-safe routing — no server-side routing exists on
  GitHub Pages, so use query-string based navigation, not clean URLs).
- Footer: small, unobtrusive "Admin" text/icon button, fixed at the very bottom,
  low-contrast so it doesn't distract regular visitors, but clearly clickable.

### 2. Item detail page (`item.html`)
- Reads `id` from the query string, finds the matching item in `config.json`, and
  renders its full details (large image, full description, price, all `extraFields`).
- "Back to all items" link back to the grid.
- If the id doesn't match anything (bad link, deleted item), show a friendly
  "This item is no longer available" state instead of a blank/broken page.

---

## RESPONSIVE / MOBILE REQUIREMENT

- Must include `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- Layout must adapt cleanly at minimum these breakpoints: ~360–480px (phone),
  ~768px (tablet), ~1024px+ (desktop) — use CSS Grid/Flexbox with `auto-fit`/
  `minmax()` or explicit breakpoints matching `config.grid` column counts.
- No fixed pixel widths on containers — use relative units (%, rem, `clamp()`) so the
  layout fills whatever screen it's opened on without horizontal scroll or oversized
  elements on mobile.
- Test and confirm (describe how you verified it) at phone, tablet, and desktop widths
  before considering the build done.

---

## ADMIN GOD-MODE PANEL

### Access
- Small "Admin" button fixed at the bottom of every page → opens a login modal
  (username + password + GitHub PAT field, all client-side only).
- Password is checked against `config.json.admin.passwordHash` (hash client-side with
  SubtleCrypto SHA-256 and compare — never store or compare plain text).
- On success, the panel unlocks; on failure, show a generic "invalid credentials"
  message (don't reveal which field was wrong).

### What the admin can edit (all sections, organized into a clear tabbed/sidebar UI)
1. **Shop Info** — name, tagline, description, logo, contact, social links.
2. **Theme** — every color (primary/secondary/background/card/text/accent) via color
   pickers, font family, border radius, card shadow style — with a live preview that
   updates the page instantly as they adjust sliders/pickers, before publishing.
3. **Grid Layout** — columns for desktop/tablet/mobile, gap size, card size
   (small/medium/large presets, or custom px).
4. **Items (CRUD)** — add / edit / delete / reorder items; per item: title,
   descriptions, price, category, image (upload → base64, or URL), and any custom
   extra fields.
5. **Security** — change username/password (re-hash and update
   `config.json.admin`), and a field to update the GitHub repo path/branch if needed.
   Enforce a minimum password length (12+ characters) and reject common/weak passwords
   in this form, with a visible note explaining why: the password hash lives in a
   public file, so a short/common password is crackable offline by anyone who looks.
6. **Publish** — a single "Publish Changes" button that:
   - Serializes the in-memory config back to JSON.
   - Calls the GitHub Contents API to update `data/config.json` in the repo (get the
     current file's SHA first, then PUT the update with that SHA — required by the
     GitHub API for updating existing files).
   - Shows a clear status: "Publishing…" → "Published — live in about a minute" or a
     clear error message if the API call fails (bad token, wrong scope, etc.).
7. **Discard/Reset** — a way to discard unpublished local edits and reload the last
   published config, in case the admin wants to back out of changes.

### Non-functional requirements for admin mode
- All admin editing UI must be part of the public bundle (no separate secret build),
  but the panel itself must be genuinely hidden/locked until login succeeds — no
  editing controls rendered or usable pre-login.
- Every input must have sane validation (e.g., reject empty shop name, reject
  non-numeric column counts, confirm before deleting an item).
- Must work fully on mobile too — the admin should be able to log in and make edits
  from a phone.

---

## DELIVERABLES

1. Full working repo structure, e.g.:
   ```
   /index.html
   /item.html
   /admin/ (or an admin module loaded into both pages)
   /css/styles.css
   /js/ (app.js, admin.js, github-api.js, config-loader.js, auth.js)
   /data/config.json  (seeded with realistic example "online courses" content)
   /README.md
   /SECURITY.md
   ```
2. `README.md` covering: how to enable GitHub Pages for this repo, how to generate a
   fine-grained PAT with the correct minimal scope, first-login default admin
   credentials (and a strong instruction to change them immediately), and the
   known ~30–90s publish delay caveat.
3. `SECURITY.md` covering the PAT handling rules above and password hashing approach,
   plus an explicit note that the repo (and therefore `config.json` and its
   `passwordHash`) is public on GitHub Free — so the admin password must be long and
   non-obvious, not a convenience password.
4. Every file complete and runnable — no "insert your code here" placeholders.

## ACCEPTANCE CHECKLIST (verify before calling this done)
- [ ] Opens correctly and looks properly laid out on a phone-width viewport, a tablet
      width, and a desktop width — no overflow, no giant elements, no tiny unreadable text.
- [ ] Every visible piece of content and every style comes from `config.json` — grep the
      HTML/JS for hardcoded shop name/colors/text and confirm there are none.
- [ ] Clicking any item card goes to that item's detail page with correct content.
- [ ] Admin button is present but unobtrusive on every page, at the bottom.
- [ ] Login fails gracefully on wrong credentials, succeeds and unlocks god-mode on
      correct ones.
- [ ] Changing a color/grid column count/text field/image in admin updates the live
      preview immediately, and after "Publish," the change is actually committed via the
      GitHub API (verify the commit shows up in the repo history).
- [ ] Password can be changed from within admin and the new password works next login.
- [ ] No GitHub PAT ever appears in any committed file, `localStorage`, or console log.

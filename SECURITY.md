# Security & Token Management Guidelines

This document outlines the security parameters, token storage rules, and password hashing policies for the **Apex Online-Store & Portfolio Engine**.

---

## 1. GitHub Personal Access Token (PAT) Policy

- **Minimal Scope Enforcement**: Always use a **Fine-Grained Personal Access Token** scoped exclusively to `hafedazerty100/Portfolio`.
- **Permissions**: Grant only **Contents: Read & Write** permissions. Do not grant access to issues, pull requests, actions, or organization settings.
- **Session Lifespan**: PATs entered into the Admin Login or Publish form are stored in browser `sessionStorage`. `sessionStorage` data is isolate to the active browser tab and is permanently purged when the tab or window is closed.
- **No Hardcoding / No LocalStorage**: PAT tokens must NEVER be hardcoded in JS files, saved to `localStorage`, or committed to any Git repository branch.

---

## 2. Public Repository Security Model

- **Public Visibility**: GitHub Pages hosted on free tier repositories are publicly accessible. Consequently, `data/config.json` is a public file.
- **Password Hash Visibility**: Anyone viewing `data/config.json` can inspect the `admin.username` and `admin.passwordHash` SHA-256 string.
- **Password Requirements**:
  - Minimum length: **12 characters**.
  - Passwords must contain a combination of uppercase, lowercase, numbers, and symbols.
  - Common weak passwords (e.g. `password12345`) are rejected by the Admin Security interface to prevent offline rainbow-table brute forcing.

---

## 3. Cryptographic Implementation

- Password verification and updates use the browser's native **Web Crypto API**:
  ```javascript
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  ```
- Passwords are **never** transmitted in plain text or saved unhashed.

---

## 4. Stale-Commit & Data Integrity

- The GitHub REST API client checks commit blob SHAs before submitting updates.
- If a 409 Conflict status is returned by GitHub (indicating another session committed changes in parallel), the write operation halts immediately to prevent data corruption.

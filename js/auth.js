/**
 * Auth — Client-side Web Crypto SHA-256 Authentication & PAT Session Storage Manager
 */

const PAT_SESSION_KEY = 'apex_admin_pat_token';
let authenticatedSession = false;

/**
 * Computes SHA-256 hash string for given plain text
 */
export async function hashPassword(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Authenticates user credentials against config admin data and stores PAT in sessionStorage
 */
export async function loginAdmin(usernameInput, passwordInput, patTokenInput, configAdmin) {
  if (!configAdmin || !configAdmin.username || !configAdmin.passwordHash) {
    throw new Error('Invalid system configuration: Admin credentials missing.');
  }

  const inputHash = await hashPassword(passwordInput);

  if (usernameInput.trim() !== configAdmin.username || inputHash !== configAdmin.passwordHash) {
    return { success: false, error: 'Invalid username or password credentials.' };
  }

  if (patTokenInput && patTokenInput.trim()) {
    sessionStorage.setItem(PAT_SESSION_KEY, patTokenInput.trim());
  }

  authenticatedSession = true;
  return { success: true };
}

/**
 * Returns currently saved PAT token from sessionStorage
 */
export function getSavedPAT() {
  return sessionStorage.getItem(PAT_SESSION_KEY) || '';
}

/**
 * Saves PAT token to sessionStorage
 */
export function setSavedPAT(token) {
  if (token) {
    sessionStorage.setItem(PAT_SESSION_KEY, token.trim());
  } else {
    sessionStorage.removeItem(PAT_SESSION_KEY);
  }
}

/**
 * Checks if current admin session is authenticated
 */
export function isSessionActive() {
  return authenticatedSession;
}

/**
 * Terminate session & clear stored PAT
 */
export function logoutAdmin() {
  authenticatedSession = false;
  sessionStorage.removeItem(PAT_SESSION_KEY);
}

/**
 * Enforces minimum password strength requirements:
 * - At least 12 characters long
 * - Not a common/weak password
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long.' };
  }

  const commonWeak = ['password12345', '123456789012', 'adminadmin123', 'qwertyuiop12', 'letmein123456'];
  if (commonWeak.includes(password.toLowerCase())) {
    return { valid: false, message: 'Password is too common or easily guessable.' };
  }

  return { valid: true };
}

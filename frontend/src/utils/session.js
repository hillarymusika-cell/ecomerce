/**
 * Token / preference storage with optional "remember me".
 * remember=true  → localStorage (survives browser close)
 * remember=false → sessionStorage (cleared when tab/browser closes)
 */

const ACCESS = "access_token";
const REFRESH = "refresh_token";
const REMEMBER = "auth_remember";
const EMAIL = "auth_remember_email";

function primaryStore() {
  const remember = localStorage.getItem(REMEMBER);
  if (remember === "0") return sessionStorage;
  return localStorage;
}

export function getRememberPreference() {
  return localStorage.getItem(REMEMBER) !== "0";
}

export function setRememberPreference(remember) {
  localStorage.setItem(REMEMBER, remember ? "1" : "0");
}

export function getRememberedEmail() {
  return localStorage.getItem(EMAIL) || "";
}

export function setRememberedEmail(email) {
  if (email) localStorage.setItem(EMAIL, email);
  else localStorage.removeItem(EMAIL);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS) || sessionStorage.getItem(ACCESS) || null;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH) || sessionStorage.getItem(REFRESH) || null;
}

export function saveTokens({ access, refresh }, remember = true) {
  setRememberPreference(remember);
  // Clear both so we don't leave stale tokens in the other store
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(REFRESH);

  const store = remember ? localStorage : sessionStorage;
  if (access) store.setItem(ACCESS, access);
  if (refresh) store.setItem(REFRESH, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(REFRESH);
}

export function updateAccessToken(access) {
  if (!access) return;
  // Write to whichever store currently holds the session
  if (sessionStorage.getItem(ACCESS) || sessionStorage.getItem(REFRESH)) {
    sessionStorage.setItem(ACCESS, access);
  } else {
    localStorage.setItem(ACCESS, access);
  }
}

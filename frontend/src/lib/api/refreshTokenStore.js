const REFRESH_TOKEN_KEY = 'refreshToken';

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (token) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearRefreshToken() {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Remove refresh tokens stored by the previous cross-tab implementation. */
export function clearLegacyRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

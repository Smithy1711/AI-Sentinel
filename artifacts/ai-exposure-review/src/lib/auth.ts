const ACCESS_TOKEN_STORAGE_KEY = "ai_exposure_review_access_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function persistAccessToken(accessToken: string) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function logout() {
  clearAccessToken();
}

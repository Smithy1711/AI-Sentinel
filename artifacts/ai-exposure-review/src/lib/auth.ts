export function isAuthenticated(): boolean {
  return localStorage.getItem("ai_exposure_authed") === "true";
}

export function login(): void {
  localStorage.setItem("ai_exposure_authed", "true");
}

export function logout(): void {
  localStorage.removeItem("ai_exposure_authed");
}

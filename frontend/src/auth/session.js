/**
 * Dream Network — Módulo de verificação de sessão.
 *
 * Separado do App.jsx para evitar problemas de importação circular
 * e garantir que o fetch é feito de forma fiável.
 */

export async function checkSession() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("/api/auth/me", {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.ok) {
      return response.json();
    }
    return null;
  } catch (err) {
    console.warn("[Session] Check failed:", err?.message);
    return null;
  }
}

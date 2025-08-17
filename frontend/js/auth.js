// js/auth.js
import { api } from "./api.js";

const LS_USER = "tiksepet_user";
const LS_TOKEN = "tiksepet_token";

export function setAuth({ user, token }) {
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
  if (token) localStorage.setItem(LS_TOKEN, token);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(LS_USER) || "null");
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(LS_TOKEN);
}

export function logout() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_TOKEN);
  location.href = "login.html";
}

export async function me() {
  return api("/auth/me", { auth: true });
}

/** Yalnızca admin erişimi */
export async function requireAdmin() {
  const token = getToken();
  if (!token) throw new Error("unauthorized");
  const u = await me().catch(() => null);
  if (!u || u.role !== "admin") throw new Error("not-admin");
  return u;
}

/** Giriş zorunluluğu olan normal sayfalar için */
export function requireAuth() {
  if (!getToken()) {
    location.href = "login.html";
    throw new Error("unauthorized");
  }
}

// js/main.js == Backend API helper (main.js, module değil) ==
const API_BASE = "http://localhost:5000/api"; // api.js ile aynı olmalı

async function apiMain(
  path,
  { method = "GET", body, auth = false, headers = {} } = {}
) {
  const h = { ...headers };
  let finalBody = body;
  if (body && !(body instanceof FormData)) {
    h["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }
  if (auth) {
    const t = localStorage.getItem("tiksepet_token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers: h,
    body: finalBody,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) throw new Error(data?.message || text || `HTTP ${res.status}`);
  return data;
}

// ==============================
// Header ve footer logolarını tema ile uyumlu tut
// ==============================
function updateHeaderLogo(theme) {
  const logo = document.getElementById("site-logo");
  if (!logo) return;
  logo.src =
    theme === "dark"
      ? "assets/images/logos/logo_dark.png"
      : "assets/images/logos/logo_light.png";
}
function updateFooterLogo(theme) {
  const footerLogo = document.getElementById("footer-logo");
  if (!footerLogo) return;
  footerLogo.src =
    theme === "dark"
      ? "assets/images/logos/logo_dark.png"
      : "assets/images/logos/logo_light.png";
}

// ==============================
// Tema yönetimi
// ==============================
function applyTheme(theme) {
  const root = document.body;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem("tiksepet_theme", theme);
  updateHeaderLogo(theme);
  updateFooterLogo(theme);
}
function resolveInitialTheme() {
  const saved = localStorage.getItem("tiksepet_theme");
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)"
  )?.matches;
  return prefersDark ? "dark" : "light";
}
function toggleTheme() {
  const root = document.body;
  const next = root.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
}

// ==============================
// Menü (mobil)
// ==============================
function toggleMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("active");
}

// ==============================
// Sepet rozeti (tamamen backend)
// ==============================
async function updateCartCount() {
  const el = document.getElementById("cart-count");
  if (!el) return;

  const token = localStorage.getItem("tiksepet_token");
  if (!token) {
    el.textContent = "0";
    return;
  }

  try {
    const rows = await apiMain("/cart", { auth: true }); // [{product_id, quantity, ...}]
    const totalQty = (rows || []).reduce(
      (s, it) => s + (parseInt(it.quantity || 0, 10) || 0),
      0
    );
    el.textContent = String(totalQty);
  } catch {
    el.textContent = "0";
  }
}

// Sadece auth değişimleri için çapraz-sekme bildirimleri
(function patchAuthEvents() {
  const _setItem = localStorage.setItem;
  const _removeItem = localStorage.removeItem;

  localStorage.setItem = function (key, value) {
    const oldVal = localStorage.getItem(key);
    _setItem.apply(this, arguments);
    if (
      (key === "tiksepet_token" || key === "tiksepet_user") &&
      oldVal !== value
    ) {
      window.dispatchEvent(new Event("auth-changed"));
    }
  };
  localStorage.removeItem = function (key) {
    _removeItem.apply(this, arguments);
    if (key === "tiksepet_token" || key === "tiksepet_user") {
      window.dispatchEvent(new Event("auth-changed"));
    }
  };
  window.addEventListener("storage", (e) => {
    if (e.key === "tiksepet_token" || e.key === "tiksepet_user") {
      window.dispatchEvent(new Event("auth-changed"));
    }
  });
})();

// ==============================
// Hesap menüsü (login/register ↔ userDropdown)
// ==============================
function updateAccountMenu() {
  // Gerçek anahtar: tiksepet_token (eski alışkanlık varsa 'token' da bak)
  const token =
    localStorage.getItem("tiksepet_token") ||
    localStorage.getItem("token") ||
    null;

  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const userDropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  if (token) {
    loginLink?.classList.add("hidden");
    registerLink?.classList.add("hidden");
    userDropdown?.classList.remove("hidden");
  } else {
    loginLink?.classList.remove("hidden");
    registerLink?.classList.remove("hidden");
    userDropdown?.classList.add("hidden");
  }

  // Logout (çift dinlemeyi engelle)
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "1";
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        // Onay verdiyse tokenları temizle
        localStorage.removeItem("tiksepet_token");
        localStorage.removeItem("tiksepet_user");
        localStorage.removeItem("token"); // olası eski anahtar

        // Eğer logout() fonksiyonun varsa çalıştır
        if (typeof logout === "function") {
          logout();
        }

        updateAccountMenu();
        location.href = "index.html";
      }
    });
  }
}

// ==============================
// INIT (tüm sayfalarda)
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  // Tema
  applyTheme(resolveInitialTheme());
  document
    .getElementById("theme-toggle")
    ?.addEventListener("click", toggleTheme);

  // Hamburger
  const burger = document.getElementById("hamburger");
  if (burger) {
    const click = () => toggleMenu();
    burger.addEventListener("click", click);
    burger.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") click();
    });
  }

  // Sepet rozeti
  updateCartCount();

  // Hesap menüsü kontrol
  updateAccountMenu();
});

// ==============================
// Loader
// ==============================
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
});

// Canlı dinleyiciler
window.addEventListener("cart-changed", updateCartCount);
window.addEventListener("auth-changed", updateAccountMenu);
window.addEventListener("auth-changed", updateCartCount);

// Eski inline çağrımlar bozulmasın diye:
window.toggleTheme = toggleTheme;
window.toggleMenu = toggleMenu;
// 👇 Hesap menüsünü globale aç (login.js'ten çağırabilmek için)
window.updateAccountMenu = updateAccountMenu;

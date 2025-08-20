// js/main.js (global, module değil)

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
// Sepet rozeti
// ==============================
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const el = document.getElementById("cart-count");
  if (!el) return;
  const totalQty = cart.reduce(
    (s, it) => s + (parseInt(it.quantity || 0, 10) || 0),
    0
  );
  el.textContent = String(totalQty);
}

// cart değişimlerini diğer sekmelere de ilet
(function patchCartEvents() {
  const _setItem = localStorage.setItem;
  const _removeItem = localStorage.removeItem;

  localStorage.setItem = function (key, value) {
    const oldVal = localStorage.getItem(key);
    _setItem.apply(this, arguments);
    if (key === "cart" && oldVal !== value)
      window.dispatchEvent(new Event("cart-changed"));
    if (
      (key === "tiksepet_token" || key === "tiksepet_user") &&
      oldVal !== value
    )
      window.dispatchEvent(new Event("auth-changed"));
  };
  localStorage.removeItem = function (key) {
    _removeItem.apply(this, arguments);
    if (key === "cart") window.dispatchEvent(new Event("cart-changed"));
    if (key === "tiksepet_token" || key === "tiksepet_user")
      window.dispatchEvent(new Event("auth-changed"));
  };
  window.addEventListener("storage", (e) => {
    if (e.key === "cart") window.dispatchEvent(new Event("cart-changed"));
    if (e.key === "tiksepet_token" || e.key === "tiksepet_user")
      window.dispatchEvent(new Event("auth-changed"));
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
      localStorage.removeItem("tiksepet_token");
      localStorage.removeItem("tiksepet_user");
      localStorage.removeItem("token"); // olası eski anahtar
      updateAccountMenu();
      location.href = "index.html";
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

// Eski inline çağrımlar bozulmasın diye:
window.toggleTheme = toggleTheme;
window.toggleMenu = toggleMenu;
// 👇 Hesap menüsünü globale aç (login.js'ten çağırabilmek için)
window.updateAccountMenu = updateAccountMenu;

// js/profile.js (module)
"use strict";

import { api } from "./api.js";
import { getAuth, clearAuth } from "./auth.js";

/* ========== Helpers ========== */
function fmtTRY(n) {
  return (Number(n) || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

function statusToTR(s) {
  switch ((s || "").toLowerCase()) {
    case "pending":
      return "Bekliyor";
    case "paid":
      return "Ödendi";
    case "shipped":
      return "Kargoda";
    case "delivered":
      return "Teslim";
    case "cancelled":
      return "İptal";
    default:
      return s || "-";
  }
}

/* ========== UI fill ========== */
function fillUserHeader(user) {
  const nameEl = document.getElementById("u-name");
  const emailEl = document.getElementById("u-email");
  if (nameEl) nameEl.textContent = user?.name || "—";
  if (emailEl) emailEl.textContent = user?.email || "—";
}

/* ========== Orders render ========== */
function renderOrders(rows = []) {
  // Tercihen .orders .order-list kullan; yoksa #order-list fallback
  const wrap =
    document.querySelector(".orders .order-list") ||
    document.getElementById("order-list");
  const empty =
    document.querySelector(".orders #orders-empty") ||
    document.getElementById("orders-empty");

  if (!wrap) return;

  wrap.innerHTML = "";

  if (!rows.length) {
    if (empty) {
      empty.style.display = "block";
      empty.innerHTML = "Henüz siparişiniz yok.";
    } else {
      wrap.innerHTML = '<div class="empty-state">Henüz siparişiniz yok.</div>';
    }
    return;
  }
  if (empty) empty.style.display = "none";

  for (const o of rows) {
    const when = o.created_at
      ? new Date(o.created_at).toLocaleString("tr-TR")
      : "-";
    const items = Array.isArray(o.items) ? o.items : [];

    const itemsHtml = items
      .map(
        (it) => `
        <div style="display:flex; gap:8px; align-items:center; margin:4px 0;">
          <img
            src="${
              it.image_path
                ? `http://localhost:5000${it.image_path}`
                : "assets/images/products/placeholder.png"
            }"
            alt="${it.title || "Ürün"}"
            style="width:40px;height:40px;object-fit:contain;border:1px solid #eee;border-radius:6px;background:#fff"
          />
          <div>
            <div>${it.title || "Ürün"} <strong>x${it.quantity}</strong></div>
            <div class="muted" style="font-size:.9rem">${fmtTRY(
              it.unit_price
            )}</div>
          </div>
        </div>`
      )
      .join("");

    const el = document.createElement("div");
    el.className = "order-item";
    el.innerHTML = `
      <div class="order-info">
        <div><strong>#${
          o.id
        }</strong> • ${when} • <span class="badge">${statusToTR(
      o.status
    )}</span></div>
        <div>Toplam: <strong>${fmtTRY(o.total)}</strong></div>
        <div style="margin-top:8px">${itemsHtml}</div>
      </div>
    `;
    wrap.appendChild(el);
  }
}

/* ========== Data loaders ========== */
async function loadMyOrders() {
  try {
    // api() içinde auth:true => localStorage'daki token'ı otomatik ekler
    const rows = await api("/orders/my", { auth: true });
    renderOrders(rows || []);
  } catch (e) {
    const wrap =
      document.querySelector(".orders .order-list") ||
      document.getElementById("order-list");
    if (wrap) {
      wrap.innerHTML = `<div class="empty-state">Siparişler çekilemedi: ${
        e?.message || e
      }</div>`;
    }
  }
}

async function loadUserData() {
  const auth = getAuth();
  if (!auth?.user || !auth?.token) {
    location.href = `login.html?return=${encodeURIComponent(
      location.pathname
    )}`;
    return;
  }
  fillUserHeader(auth.user);
  await loadMyOrders();
}

/* ========== Init ========== */
document.addEventListener("DOMContentLoaded", () => {
  loadUserData();

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    clearAuth();
    location.href = "index.html";
  });
});

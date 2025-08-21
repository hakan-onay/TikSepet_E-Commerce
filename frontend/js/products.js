"use strict";
import { api } from "./api.js";

/* ========== Yardımcılar ========== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmtTRY = (n) =>
  (Number(n) || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });

function ensureToastContainer() {
  let c = $("#toast-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "toast-container";
    document.body.appendChild(c);
  }
  return c;
}
function showToast(message) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
function trNormalize(s) {
  return (s || "")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}
function userLoggedIn() {
  return !!localStorage.getItem("tiksepet_token");
}

/* ========== DOM refs ========== */
const gridEl = $("#product-grid") || $(".product-grid");
const searchEl = $(".search-input");
const catEl = $(".category-filter");
const sortEl = $(".sort-select");
const loader = $("#loader");

/* ========== URL params -> state ========== */
const urlParams = new URLSearchParams(location.search);
let page = Number(urlParams.get("page") || 1) || 1;
let limit = 12;
let total = 0;
let currentItems = [];
let currentCategories = new Set();

/* ========== API ========== */
async function fetchProducts() {
  const q = (searchEl?.value || "").trim();
  const ct = catEl?.value || "all";
  const category = ct && ct !== "all" ? ct : "";

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return api(`/public/products?${qs.toString()}`); // { items, page, limit, total }
}

// Backend sepet: toplam hesaplamak için sepeti çek
async function fetchCartAndSum() {
  try {
    const rows = await api("/cart", { auth: true });
    const sum = (rows || []).reduce(
      (acc, it) =>
        acc + (Number(it.price) || 0) * (parseInt(it.quantity || 1, 10) || 1),
      0
    );
    return { rows, sum };
  } catch {
    return { rows: [], sum: 0 };
  }
}

// Sepete ekle (backend)
async function addToCartAPI(productId, quantity = 1) {
  return api("/cart", {
    method: "POST",
    auth: true,
    body: { product_id: Number(productId), quantity: Number(quantity) },
  });
}

/* ========== Render helpers ========== */
function starsHTML(rating = 0) {
  const r = Math.round(Number(rating || 0));
  return Array.from(
    { length: 5 },
    (_, i) => `<span class="star">${i < r ? "&#9733;" : "&#9734;"}</span>`
  ).join("");
}

function productCard(p) {
  const img = p.image_path
    ? `http://localhost:5000${p.image_path}`
    : "assets/images/products/placeholder.png";

  const cat = (p.category || "").toLowerCase();
  return `
  <div class="product-card" data-id="${p.id}" data-category="${cat}">
    <img src="${img}" alt="${p.title || "Ürün"}" />
    <div class="card-body">
      ${p.category ? `<span class="badge">${p.category}</span>` : ""}
      <h3 title="${p.title || ""}">${p.title || "-"}</h3>
      <p class="price">${fmtTRY(p.price)}</p>
      <div class="rating" aria-label="Ürün puanı">${starsHTML(p.rating)}</div>
    </div>
    <div class="card-footer">
      <button
        class="btn add-to-cart"
        data-id="${p.id}"
        data-name="${(p.title || "").replace(/"/g, "&quot;")}"
        data-price="${Number(p.price) || 0}"
        data-image="${img}"
      >
        🛒 Sepete Ekle
      </button>
    </div>
  </div>`;
}

function renderGrid(items = []) {
  if (!gridEl) return;
  if (!items.length) {
    gridEl.innerHTML = `<p class="muted">Ürün bulunamadı.</p>`;
    return;
  }
  gridEl.innerHTML = items.map(productCard).join("");
  wireAddToCart();
  wireRating();
}

function renderCategories(items = []) {
  if (!catEl) return;
  if (catEl.dataset._filled === "1") return;
  currentCategories = new Set(items.map((x) => x.category).filter(Boolean));
  if (catEl && catEl.options.length <= 1) {
    [...currentCategories]
      .sort((a, b) => trNormalize(a).localeCompare(trNormalize(b), "tr"))
      .forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        catEl.appendChild(opt);
      });
    catEl.dataset._filled = "1";
  }
}

function renderPager() {
  const pagerId = "pager";
  let pager = document.getElementById(pagerId);
  if (!pager) {
    pager = document.createElement("div");
    pager.id = pagerId;
    pager.className = "pager";
    gridEl?.after(pager);
  }
  const pages = Math.max(1, Math.ceil(total / limit));
  pager.innerHTML = `
    <button class="btn ghost" id="prev-page" ${
      page <= 1 ? "disabled" : ""
    }>‹ Önceki</button>
    <span class="muted">Sayfa ${page}/${pages}</span>
    <button class="btn ghost" id="next-page" ${
      page >= pages ? "disabled" : ""
    }>Sonraki ›</button>
  `;
  $("#prev-page")?.addEventListener("click", async () => {
    if (page > 1) {
      page--;
      await load();
    }
  });
  $("#next-page")?.addEventListener("click", async () => {
    const pages = Math.max(1, Math.ceil(total / limit));
    if (page < pages) {
      page++;
      await load();
    }
  });
}

/* ========== Etkileşimler ========== */
function wireRating() {
  $$(".product-card .rating").forEach((wrap) => {
    wrap.addEventListener("click", (e) => {
      const star = e.target.closest(".star");
      if (!star) return;
      const stars = Array.from(wrap.querySelectorAll(".star"));
      const idx = stars.indexOf(star);
      stars.forEach((s, i) => s.classList.toggle("selected", i <= idx));

      const card = wrap.closest(".product-card");
      if (card) {
        const rating = idx + 1;
        card.dataset.rating = String(rating);
        const id = card.querySelector(".add-to-cart")?.dataset.id;
        if (id) {
          const ratings = JSON.parse(localStorage.getItem("ratings") || "{}");
          ratings[id] = rating;
          localStorage.setItem("ratings", JSON.stringify(ratings));
        }
      }
    });
  });
}

function wireAddToCart() {
  $$(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!userLoggedIn()) {
        const ret = encodeURIComponent(location.href);
        location.href = `login.html?return=${ret}`;
        return;
      }
      const pid = String(btn.dataset.id || "");
      const name = btn.dataset.name || "Ürün";

      try {
        await addToCartAPI(pid, 1);

        const { sum } = await fetchCartAndSum();

        window.dispatchEvent(new Event("cart-changed"));

        showToast(`${name} sepete eklendi. Toplam: ${fmtTRY(sum)}`);
      } catch (e) {
        alert(e?.message || "Sepete eklenemedi");
      }
    });
  });
}

function applyClientFilters() {
  if (!searchEl && !catEl) return;
  const q = trNormalize(searchEl?.value || "");
  const cat = trNormalize(catEl?.value || "all");
  const cards = $$(".product-card");
  for (const card of cards) {
    const name = trNormalize(card.querySelector("h3")?.textContent || "");
    const c = trNormalize(card.getAttribute("data-category") || "all");
    const okSearch = !q || name.includes(q);
    const okCat = cat === "all" || c === cat;
    card.style.display = okSearch && okCat ? "" : "none";
  }
  if (sortEl) {
    const mode = sortEl.value; // default | price-asc | price-desc
    if (mode !== "default") {
      const grid = gridEl;
      const visible = $$(".product-card").filter(
        (c) => c.style.display !== "none"
      );
      visible.sort((a, b) => {
        const pa = Number(
          a.querySelector(".add-to-cart")?.dataset.price || "0"
        );
        const pb = Number(
          b.querySelector(".add-to-cart")?.dataset.price || "0"
        );
        return mode === "price-asc" ? pa - pb : pb - pa;
      });
      visible.forEach((c) => grid.appendChild(c));
    }
  }
}

/* ========== LOAD ========== */
async function load() {
  if (loader) loader.style.display = "block";
  try {
    const data = await fetchProducts();
    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];
    total = Number(data?.total || items.length || 0);
    currentItems = items;

    renderGrid(items);
    renderCategories(items);
    renderPager();
    applyClientFilters();
  } catch (e) {
    console.error(e);
    if (gridEl)
      gridEl.innerHTML = `<p class="muted">Ürünler alınamadı: ${
        e.message || e
      }</p>`;
  } finally {
    if (loader) loader.style.display = "none";
  }
}

/* ========== Event wiring ========== */
let debounce;
searchEl?.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    page = 1;
    await load();
    const u = new URL(location.href);
    const q = (searchEl.value || "").trim();
    if (q) u.searchParams.set("q", q);
    else u.searchParams.delete("q");
    history.replaceState(null, "", u.toString());
  }, 250);
});

catEl?.addEventListener("change", async () => {
  page = 1;
  await load();
  const u = new URL(location.href);
  const v = catEl.value;
  if (v && v !== "all") u.searchParams.set("category", v);
  else u.searchParams.delete("category");
  history.replaceState(null, "", u.toString());
});

sortEl?.addEventListener("change", () => applyClientFilters());

document.addEventListener("DOMContentLoaded", load);

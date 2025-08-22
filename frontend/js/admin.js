// admin.js
import { api } from "./api.js";
import { requireAdmin, me, logout } from "./auth.js";

let editingId = null;
let _ordersCache = []; // istemci tarafı filtre için

// Kısayollar
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmt = (n) =>
  (Number(n) || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ================== GUARD ================== */
async function initAdminGuard() {
  const guard = $("#admin-guard");
  const content = $("#admin-content");

  try {
    await requireAdmin();

    if (content) {
      content.classList.remove("hidden");
      content.style.display = "block";
    }
    if (guard) {
      guard.classList.add("hidden");
      guard.style.display = "none";
    }

    const u = await me().catch(() => null);
    const navName = $("#nav-username");
    if (u && navName) navName.textContent = `Admin: ${u.name || u.email}`;
    $("#logout-btn")?.addEventListener("click", logout);
  } catch {
    if (content) {
      content.classList.add("hidden");
      content.style.display = "none";
    }
    if (guard) {
      guard.classList.remove("hidden");
      guard.style.display = "block";
    }
    throw new Error("unauthorized");
  }
}

/* ================== MODAL HELPERS ================== */
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
}

/* ================== ÜRÜNLER ================== */
async function fetchProducts() {
  const q = $("#search-input")?.value?.trim();
  const category = $("#category-filter")?.value || "";
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return api(`/admin/products?${params.toString()}`, { auth: true });
}

function renderProducts(rows = []) {
  const tb = $("#products-table tbody");
  tb.innerHTML = "";
  if (!rows.length) {
    $("#products-empty").classList.remove("hidden");
    return;
  }
  $("#products-empty").classList.add("hidden");

  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  const sel = $("#category-filter");
  if (sel && sel.options.length <= 1) {
    for (const c of categories) {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      sel.appendChild(o);
    }
  }

  for (const p of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td><strong>${p.title}</strong><div class="muted">${
      p.description ? p.description.slice(0, 80) : ""
    }</div></td>
      <td>${p.category || "-"}</td>
      <td class="right">₺${fmt(p.price)}</td>
      <td>${p.stock ?? 0}</td>
      <td>${p.rating ?? 0}</td>
      <td class="right">
        <button class="btn ghost btn-edit" data-id="${p.id}">Düzenle</button>
        <button class="btn warn btn-del" data-id="${p.id}">Sil</button>
      </td>
    `;
    tb.appendChild(tr);
  }

  $$(".btn-edit").forEach((b) =>
    b.addEventListener("click", () => openEdit(b.dataset.id))
  );
  $$(".btn-del").forEach((b) =>
    b.addEventListener("click", () => delProduct(b.dataset.id))
  );
}

async function loadProducts() {
  try {
    renderProducts(await fetchProducts());
  } catch (e) {
    alert("Ürünleri çekerken hata: " + (e.message || e));
  }
}

// Ürün formu (ikinci modal)
function clearForm() {
  $("#p-title").value = "";
  $("#p-category").value = "";
  $("#p-price").value = "";
  $("#p-stock").value = "";
  $("#p-rating").value = "";
  $("#p-image").value = "";
  $("#p-desc").value = "";
  $("#p-image-file").value = "";
}
function fillForm(p) {
  $("#p-title").value = p.title || "";
  $("#p-category").value = p.category || "";
  $("#p-price").value = p.price || "";
  $("#p-stock").value = p.stock || 0;
  $("#p-rating").value = p.rating || 0;
  $("#p-image").value = p.image_path || "";
  $("#p-desc").value = p.description || "";
}

async function saveProduct() {
  const title = $("#p-title").value.trim();
  const price = $("#p-price").value;
  if (!title || !price) {
    alert("Başlık ve fiyat zorunludur.");
    return;
  }

  const fd = new FormData();
  fd.append("title", title);
  fd.append("price", price);

  if ($("#p-category").value.trim())
    fd.append("category", $("#p-category").value.trim());
  if ($("#p-stock").value) fd.append("stock", $("#p-stock").value);
  if ($("#p-rating").value) fd.append("rating", $("#p-rating").value);
  if ($("#p-desc").value.trim())
    fd.append("description", $("#p-desc").value.trim());

  const file = $("#p-image-file").files?.[0];
  const imageUrl = $("#p-image").value.trim();
  if (file) {
    fd.append("image", file);
  } else if (imageUrl) {
    fd.append("image_url", imageUrl);
  }

  try {
    const path = editingId ? `/admin/products/${editingId}` : "/admin/products";
    const method = editingId ? "PUT" : "POST";
    await api(path, { method, body: fd, auth: true });
    await loadProducts();
    closeModal("product-form-modal");
  } catch (e) {
    alert("Kaydetme hatası: " + (e.message || e));
  }
}

async function openEdit(id) {
  try {
    const rows = await api(`/admin/products`, { auth: true });
    const p = rows.find((r) => r.id == id);
    if (!p) return alert("Ürün bulunamadı");
    editingId = id;
    $("#modal-title").textContent = `Ürün Düzenle #${id}`;
    fillForm(p);
    openModal("product-form-modal");
  } catch (e) {
    alert("Düzenleme hatası: " + (e.message || e));
  }
}

async function delProduct(id) {
  if (!confirm(`#${id} ürün silinsin mi?`)) return;
  try {
    await api(`/admin/products/${id}`, { method: "DELETE", auth: true });
    await loadProducts();
  } catch (e) {
    alert("Silme hatası: " + (e.message || e));
  }
}

/* ================== SİPARİŞLER ================== */
async function fetchOrders() {
  const status = $("#status-filter")?.value || "";
  const q = $("#orders-search")?.value?.trim();
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q); // Backend destekliyorsa
  const rows = await api(`/admin/orders?${params.toString()}`, { auth: true });
  _ordersCache = Array.isArray(rows) ? rows : [];
  // Backend q desteklemezse istemci filtresi uygula
  if (q && !_serverLikelyFiltered(rows, q)) {
    return _filterOrdersClient(_ordersCache, q);
  }
  return _ordersCache;
}

function _serverLikelyFiltered(rows, q) {
  if (!Array.isArray(rows) || !rows.length) return true;
  // Çok kaba bir sezgi: eğer hem eşleşen hem eşleşmeyen çokça kayıt geliyorsa backend filtrelememiş olabilir
  const hit = rows.some((o) => _orderSearchText(o).includes(q.toLowerCase()));
  const miss = rows.some((o) => !_orderSearchText(o).includes(q.toLowerCase()));
  return !(hit && miss); // hit+miss birlikteyse muhtemelen filtrelenmedi
}

function _orderSearchText(o) {
  const addr = [o.address, o.district, o.city, o.postal_code]
    .filter(Boolean)
    .join(", ");
  const user = [o.user_email, o.user_name].filter(Boolean).join(" ");
  return [`#${o.id}`, user, o.phone || "", addr].join(" ").toLowerCase();
}

function _filterOrdersClient(rows, q) {
  const s = q.toLowerCase();
  return rows.filter((o) => _orderSearchText(o).includes(s));
}

function renderOrders(rows = []) {
  const tb = $("#orders-table tbody");
  tb.innerHTML = "";
  if (!rows.length) {
    $("#orders-empty").classList.remove("hidden");
    return;
  }
  $("#orders-empty").classList.add("hidden");

  const labels = {
    pending: "Bekliyor",
    paid: "Ödendi",
    shipped: "Kargoda",
    delivered: "Teslim",
    cancelled: "İptal",
  };

  for (const o of rows) {
    const tr = document.createElement("tr");
    const addr = [o.address, o.district, o.city, o.postal_code]
      .filter(Boolean)
      .join(", ");

    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.user_email || o.user_name || "-"}</td>
      <td>₺${fmt(o.total_amount ?? o.total)}
          <div class="muted">${
            o.payment_method === "card"
              ? "Kart"
              : o.payment_method === "cod"
              ? "Kapıda Ödeme"
              : ""
          }</div>
      </td>
      <td><div class="muted">${addr || "-"}</div><div class="muted">${
      o.phone || ""
    }</div></td>
      <td><span class="badge">${labels[o.status] || o.status}</span></td>
      <td>${new Date(o.created_at).toLocaleString("tr-TR")}</td>
      <td class="right">
        <select class="order-status" data-id="${o.id}">
          ${Object.entries(labels)
            .map(
              ([val, label]) =>
                `<option value="${val}" ${
                  o.status === val ? "selected" : ""
                }>${label}</option>`
            )
            .join("")}
        </select>
        <button class="btn ghost btn-update-status" data-id="${
          o.id
        }">Güncelle</button>
      </td>
    `;
    tb.appendChild(tr);
  }

  $$(".btn-update-status").forEach((b) =>
    b.addEventListener("click", async () => {
      const id = b.dataset.id;
      const sel = document.querySelector(
        `select.order-status[data-id="${id}"]`
      );
      const status = sel.value;

      try {
        await api(`/admin/orders/${id}/status`, {
          method: "PUT",
          auth: true,
          body: { status },
        });
        const fresh = await fetchOrders();
        renderOrders(fresh);
        alert("Sipariş durumu güncellendi!");
      } catch (e) {
        alert("Durum güncellenemedi: " + (e.message || e));
      }
    })
  );
}

async function loadOrders() {
  try {
    const rows = await fetchOrders();
    renderOrders(rows);
  } catch (e) {
    alert("Siparişleri çekerken hata: " + (e.message || e));
  }
}

/* ================== INIT ================== */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initAdminGuard();
  } catch {
    return;
  }

  // Ana sayfa üzerindeki açma butonları
  $("#open-products-modal")?.addEventListener("click", () => {
    openModal("products-modal");
    // ilk girişte yükleme
    loadProducts();
  });
  $("#open-orders-modal")?.addEventListener("click", () => {
    openModal("orders-modal");
    loadOrders();
  });

  // Modal kapatma
  $("#btn-close-products")?.addEventListener("click", () =>
    closeModal("products-modal")
  );
  $("#btn-close-orders")?.addEventListener("click", () =>
    closeModal("orders-modal")
  );

  // backdrop tıklayınca kapat
  ["products-modal", "orders-modal", "product-form-modal"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      if (e.target.id === id) closeModal(id);
    });
  });

  /* Ürün modal içi */
  $("#btn-new-product")?.addEventListener("click", () => {
    editingId = null;
    $("#modal-title").textContent = "Yeni Ürün";
    clearForm();
    openModal("product-form-modal");
  });
  $("#btn-close-product-form")?.addEventListener("click", () =>
    closeModal("product-form-modal")
  );
  $("#btn-refresh-products")?.addEventListener("click", loadProducts);
  $("#search-input")?.addEventListener("input", () => {
    clearTimeout(window._pdebounce);
    window._pdebounce = setTimeout(loadProducts, 300);
  });
  $("#category-filter")?.addEventListener("change", loadProducts);
  $("#btn-save")?.addEventListener("click", saveProduct);
  $("#btn-cancel")?.addEventListener("click", () =>
    closeModal("product-form-modal")
  );

  /* Sipariş modal içi */
  $("#btn-refresh-orders")?.addEventListener("click", loadOrders);
  $("#status-filter")?.addEventListener("change", loadOrders);
  $("#orders-search")?.addEventListener("input", () => {
    clearTimeout(window._odebounce);
    window._odebounce = setTimeout(async () => {
      const rows = await fetchOrders();
      renderOrders(rows);
    }, 300);
  });
});

// js/admin.js (module)
import { api } from "./api.js";
import { requireAdmin, me, logout } from "./auth.js";

let editingId = null;

// Kısayollar
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmt = (n) =>
  (Number(n) || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ---- Admin Guard & Navbar ----
async function initAdminGuard() {
  const guard = $("#admin-guard");
  const content = $("#admin-content");

  try {
    await requireAdmin();

    // GÖSTER / GİZLE işlemleri
    if (content) {
      content.classList.remove("hidden");
      content.style.display = "grid";
    }
    if (guard) {
      guard.classList.add("hidden");
      guard.style.display = "none";
    }

    // Navbar ismi ve logout
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

  // Kategori filtresi (benzersiz)
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
      <td>${
        p.image_path ? `<a href="${p.image_path}" target="_blank">Gör</a>` : "-"
      }</td>
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

// ---- Modal ----
function openModal() {
  $("#modal-backdrop").style.display = "flex";
}
function closeModal() {
  $("#modal-backdrop").style.display = "none";
  editingId = null;
  clearForm();
}

function clearForm() {
  $("#p-title").value = "";
  $("#p-category").value = "";
  $("#p-price").value = "";
  $("#p-stock").value = "";
  $("#p-rating").value = "";
  $("#p-image").value = "";
  $("#p-desc").value = "";
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
    closeModal();
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
    openModal();
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
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  return api(`/admin/orders?${params.toString()}`, { auth: true });
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
      <td>₺${fmt(o.total_amount)}</td>
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
      const sel = $(`select.order-status[data-id="${id}"]`);
      const status = sel.value;
      try {
        await api(`/admin/orders/${id}/status`, {
          method: "POST", // backend PUT/PATCH destekliyorsa değiştir
          auth: true,
          body: { status },
        });
        await loadOrders();
      } catch (e) {
        alert("Durum güncellenemedi: " + (e.message || e));
      }
    })
  );
}

async function loadOrders() {
  try {
    renderOrders(await fetchOrders());
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

  // Ürünler
  $("#btn-new-product").addEventListener("click", () => {
    editingId = null;
    $("#modal-title").textContent = "Yeni Ürün";
    clearForm();
    openModal();
  });
  $("#btn-refresh-products").addEventListener("click", loadProducts);
  $("#search-input").addEventListener("input", () => {
    clearTimeout(window._pdebounce);
    window._pdebounce = setTimeout(loadProducts, 300);
  });
  $("#category-filter").addEventListener("change", loadProducts);
  $("#btn-save").addEventListener("click", saveProduct);
  $("#btn-cancel").addEventListener("click", closeModal);
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });

  // Siparişler
  $("#btn-refresh-orders").addEventListener("click", loadOrders);
  $("#status-filter").addEventListener("change", loadOrders);

  // İlk yüklemeler
  await loadProducts();
  await loadOrders();
});

// js/profile.js
import { me, logout, getToken } from "./auth.js";
import { api } from "./api.js";

console.log("Profile.js yüklendi");

const $ = (s) => document.querySelector(s);

function fmtTRY(n) {
  return (Number(n) || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

function statusToTR(s) {
  const statusMap = {
    pending: "Beklemede",
    paid: "Ödendi",
    shipped: "Kargoda",
    delivered: "Teslim Edildi",
    cancelled: "İptal Edildi",
  };
  return statusMap[s] || s;
}

function renderOrders(orders = []) {
  const container = $("#order-list");
  const empty = $("#orders-empty");

  if (!container) {
    console.error("order-list elementi bulunamadı");
    return;
  }

  container.innerHTML = "";

  if (!orders || !orders.length) {
    if (empty) {
      empty.style.display = "block";
      empty.textContent = "Henüz siparişiniz bulunmamaktadır.";
    }
    return;
  }

  if (empty) empty.style.display = "none";

  orders.forEach((order) => {
    const orderEl = document.createElement("div");
    orderEl.className = "order-item";

    orderEl.innerHTML = `
      <div class="order-header">
        <h3>Sipariş #${order.id}</h3>
        <span class="order-status ${order.status}">${statusToTR(
      order.status
    )}</span>
      </div>
      <div class="order-details">
        <p><strong>Tarih:</strong> ${new Date(order.created_at).toLocaleString(
          "tr-TR"
        )}</p>
        <p><strong>Toplam:</strong> ${fmtTRY(order.total)}</p>
        <p><strong>Ödeme Yöntemi:</strong> ${
          order.payment_method === "card" ? "Kredi Kartı" : "Kapıda Ödeme"
        }</p>
        ${
          order.address
            ? `<p><strong>Adres:</strong> ${order.address}, ${order.district}, ${order.city}</p>`
            : ""
        }
      </div>
      <div class="order-items">
        <h4>Sipariş Edilen Ürünler (${order.items?.length || 0} adet)</h4>
        ${
          order.items && order.items.length
            ? order.items
                .map(
                  (item) => `
          <div class="order-item-product">
            <img src="${
              item.image_path
                ? "http://localhost:5000" + item.image_path
                : "assets/images/placeholder.png"
            }" alt="${item.title || "Ürün"}" width="50" height="50">
            <div>
              <p>${item.title || "Ürün"}</p>
              <p>${fmtTRY(item.unit_price)} x ${item.quantity} adet</p>
            </div>
          </div>
        `
                )
                .join("")
            : "<p>Ürün bilgisi bulunamadı</p>"
        }
      </div>
    `;

    container.appendChild(orderEl);
  });
}

function fillUserInfo(user) {
  console.log("Kullanıcı bilgileri dolduruluyor:", user);
  const userName = $("#u-name");
  const userEmail = $("#u-email");
  if (userName) userName.textContent = user.name || "Belirtilmemiş";
  if (userEmail) userEmail.textContent = user.email || "Belirtilmemiş";
}

function showEmptyOrderMessage(
  message = "Siparişler yüklenirken hata oluştu veya henüz siparişiniz yok."
) {
  const empty = $("#orders-empty");
  if (empty) {
    empty.style.display = "block";
    empty.textContent = message;
  }
}

async function loadUserOrders() {
  try {
    console.log("Siparişler yükleniyor...");
    const orders = await api("/orders/my", { auth: true });
    console.log("Siparişler alındı:", orders);

    if (orders && Array.isArray(orders)) {
      renderOrders(orders);
    } else {
      console.error("Beklenmeyen sipariş formatı:", orders);
      showEmptyOrderMessage();
    }
  } catch (error) {
    console.error("Siparişler yüklenirken hata:", error);
    showEmptyOrderMessage();
  }
}

async function loadProfile() {
  try {
    console.log("Profil yükleniyor...");
    const token = getToken();
    console.log("Token:", token);

    if (!token) {
      console.log("Token bulunamadı, login sayfasına yönlendiriliyor...");
      location.href = "login.html";
      return;
    }

    console.log("Kullanıcı bilgileri isteniyor...");
    const user = await me();
    console.log("Kullanıcı bilgileri alındı:", user);

    if (!user) {
      throw new Error("Kullanıcı bilgileri alınamadı");
    }

    fillUserInfo(user);
    await loadUserOrders();
  } catch (error) {
    console.error("Profil yüklenirken hata:", error);
    alert(
      "Profil yüklenirken hata oluştu: " +
        error.message +
        "\nLütfen tekrar giriş yapın."
    );
    logout();
  }
}

/* ==== Şifre Değiştir Modal ==== */
function openChangePassModal() {
  const modal = $("#change-pass-modal");
  if (!modal) return;
  const err = $("#change-pass-error");
  const ok = $("#change-pass-success");
  if (err) err.style.display = "none";
  if (ok) ok.style.display = "none";
  const cp = $("#current-password");
  const np = $("#new-password");
  const np2 = $("#new-password2");
  if (cp) cp.value = "";
  if (np) np.value = "";
  if (np2) np2.value = "";
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeChangePassModal() {
  const modal = $("#change-pass-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function showFormError(msg) {
  const el = $("#change-pass-error");
  if (el) {
    el.textContent = msg || "Bir hata oluştu.";
    el.style.display = "block";
  }
}
function showFormSuccess(msg) {
  const el = $("#change-pass-success");
  if (el) {
    el.textContent = msg || "Şifre başarıyla güncellendi.";
    el.style.display = "block";
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const cur = $("#current-password")?.value?.trim() || "";
  const npw = $("#new-password")?.value?.trim() || "";
  const npw2 = $("#new-password2")?.value?.trim() || "";

  const err = $("#change-pass-error");
  const ok = $("#change-pass-success");
  if (err) err.style.display = "none";
  if (ok) ok.style.display = "none";

  if (npw.length < 6) {
    showFormError("Yeni şifre en az 6 karakter olmalı.");
    return;
  }
  if (npw !== npw2) {
    showFormError("Yeni şifreler eşleşmiyor.");
    return;
  }
  if (cur === npw) {
    showFormError("Yeni şifre mevcut şifreyle aynı olamaz.");
    return;
  }

  try {
    await api("/auth/change-password", {
      method: "PUT",
      auth: true,
      body: { current_password: cur, new_password: npw },
    });
    showFormSuccess(
      "Şifre güncellendi. Bir sonraki girişinizde yeni şifreyi kullanın."
    );
    setTimeout(() => {
      closeChangePassModal();
    }, 1200);
  } catch (err0) {
    console.error(err0);
    const msg = err0?.message || "Şifre güncellenemedi.";
    showFormError(msg);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM yüklendi, profil sayfası başlatılıyor...");

  // Çıkış
  const logoutBtn = $("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        logout();
      }
    });
  }

  // Şifre Değiştir aç/kapat
  $("#change-pass-btn")?.addEventListener("click", openChangePassModal);
  $("#cancel-change-pass")?.addEventListener("click", closeChangePassModal);
  $("#change-pass-modal .modal-backdrop")?.addEventListener(
    "click",
    closeChangePassModal
  );

  // Form submit
  $("#change-pass-form")?.addEventListener("submit", handleChangePassword);

  // Profili yükle
  loadProfile();
});

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
            }" 
                 alt="${item.title || "Ürün"}" width="50" height="50">
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

  // Doğru element ID'lerini kullan
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

    // Önce token kontrolü
    const token = getToken();
    console.log("Token:", token);

    if (!token) {
      console.log("Token bulunamadı, login sayfasına yönlendiriliyor...");
      location.href = "login.html";
      return;
    }

    // Kullanıcı bilgilerini al
    console.log("Kullanıcı bilgileri isteniyor...");
    const user = await me();
    console.log("Kullanıcı bilgileri alındı:", user);

    if (!user) {
      throw new Error("Kullanıcı bilgileri alınamadı");
    }

    // Kullanıcı bilgilerini göster
    fillUserInfo(user);

    // Siparişleri yükle
    await loadUserOrders();
  } catch (error) {
    console.error("Profil yüklenirken hata:", error);

    // Hata mesajını göster (basit versiyon)
    alert(
      "Profil yüklenirken hata oluştu: " +
        error.message +
        "\nLütfen tekrar giriş yapın."
    );
    logout();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM yüklendi, profil sayfası başlatılıyor...");

  // Çıkış butonunu dinle
  const logoutBtn = $("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        logout();
      }
    });
  }

  // Profili yükle
  loadProfile();
});

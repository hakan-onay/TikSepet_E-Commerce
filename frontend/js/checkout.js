"use strict";

import { api } from "./api.js";

/* ===== Utils ===== */
const fmtTRY = (n) =>
  (Number(n) || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });

function isLoggedIn() {
  return !!localStorage.getItem("tiksepet_token");
}

async function fetchCartForCheckout() {
  try {
    const rows = await api("/cart", { auth: true });
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/* ===== Guards ===== */
async function guardCheckout() {
  if (!isLoggedIn()) {
    const ret = encodeURIComponent("checkout.html");
    location.href = `login.html?return=${ret}`;
    return false;
  }

  const rows = await fetchCartForCheckout();
  if (!rows.length) {
    alert("Sepetiniz boş. Lütfen ürün ekleyin.");
    location.href = "products.html";
    return false;
  }
  return true;
}

/* ===== Summary Renderer ===== */
async function renderOrderSummary() {
  const listEl = document.getElementById("summary-list");
  const totalEl = document.getElementById("summary-total");
  if (!listEl || !totalEl) return;

  const cartRows = await fetchCartForCheckout();
  listEl.innerHTML = "";
  let total = 0;

  for (const item of cartRows) {
    const name = item.title || item.name || "Ürün";
    const qty = Math.max(1, parseInt(item.quantity || 1, 10));
    const price = Number(item.price) || 0;
    const line = price * qty;
    total += line;

    const row = document.createElement("div");
    row.className = "summary-item";
    row.innerHTML = `
      <div class="summary-name">${name}</div>
      <div class="summary-qty">x${qty}</div>
      <div class="summary-line">${fmtTRY(line)}</div>
    `;
    listEl.appendChild(row);
  }

  totalEl.textContent = fmtTRY(total);
}

/* ===== Payment Method Toggle ===== */
function wirePaymentMethod() {
  const sel = document.getElementById("payment-method");
  const cardBox = document.getElementById("card-info");
  if (!sel || !cardBox) return;

  const toggle = () => {
    const useCard = (sel.value || "").toLowerCase() === "card";
    cardBox.style.display = useCard ? "block" : "none";

    // Kapıda ödeme seçilirse kart alanlarını pasifleştir (zorunluluk çakışmasın)
    ["card-number", "expiry", "cvv"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (useCard) {
        el.removeAttribute("disabled");
      } else {
        el.setAttribute("disabled", "disabled");
      }
    });
  };

  sel.addEventListener("change", toggle);
  sel.addEventListener("input", toggle);
  setTimeout(toggle, 0); // ilk yüklemede doğru görünüm
}

/* ===== Input Masks ===== */
function wireMasks() {
  const phone = document.getElementById("phone");
  const cardNumber = document.getElementById("card-number");
  const expiry = document.getElementById("expiry");
  const cvv = document.getElementById("cvv");

  if (phone) {
    phone.addEventListener("input", () => {
      const d = phone.value.replace(/\D/g, "").slice(0, 11);
      let parts;
      if (d.length <= 4) parts = [d];
      else if (d.length <= 7) parts = [d.slice(0, 4), d.slice(4)];
      else if (d.length <= 9)
        parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7)];
      else parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9)];
      phone.value = parts.filter(Boolean).join(" ");
    });
  }

  if (cardNumber) {
    cardNumber.addEventListener("input", () => {
      let v = cardNumber.value.replace(/\D/g, "").slice(0, 16);
      cardNumber.value = v.replace(/(.{4})/g, "$1 ").trim();
    });
  }

  if (expiry) {
    expiry.addEventListener("input", () => {
      let v = expiry.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
      expiry.value = v;
    });
  }

  if (cvv) {
    cvv.addEventListener("input", () => {
      cvv.value = cvv.value.replace(/\D/g, "").slice(0, 4);
    });
  }
}

/* ===== Card Validation ===== */
function validateCardFields() {
  const numRaw =
    document.getElementById("card-number")?.value?.replace(/\s/g, "") || "";
  const expiry = document.getElementById("expiry")?.value || "";
  const cvv = document.getElementById("cvv")?.value || "";

  if (!numRaw || numRaw.length < 13) {
    alert("Kart numarası geçersiz.");
    return false;
  }

  const [mm, yy] = expiry.split("/");
  const m = parseInt(mm, 10);
  const y = parseInt("20" + yy, 10);

  if (!(m >= 1 && m <= 12) || !y) {
    alert("Son kullanma tarihi hatalı. (AA/YY formatında girin)");
    return false;
  }

  if (!(cvv.length === 3 || cvv.length === 4)) {
    alert("CVV 3 veya 4 haneli olmalı.");
    return false;
  }

  const now = new Date();
  const exp = new Date(y, m - 1, 1);
  if (exp < new Date(now.getFullYear(), now.getMonth(), 1)) {
    alert("Kartın son kullanma tarihi geçmiş.");
    return false;
  }

  return true;
}

/* ===== Submit ===== */
function wireSubmit() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  let submitting = false;
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;

    submitting = true;
    submitBtn?.setAttribute("disabled", "disabled");
    if (submitBtn) submitBtn.textContent = "İşleniyor...";

    try {
      const fd = new FormData(form);
      const getVal = (n, id) =>
        fd.get(n) ?? document.getElementById(id)?.value ?? "";

      const payment_method = (
        getVal("payment-method", "payment-method") || ""
      ).toLowerCase();

      const orderData = {
        address: getVal("address", "address"),
        district: getVal("district", "district"),
        city: getVal("city", "city"),
        postal_code: getVal("postal-code", "postal-code") || null,
        phone: getVal("phone", "phone"),
        payment_method,
      };

      // Zorunlu alanlar
      if (
        !orderData.address ||
        !orderData.district ||
        !orderData.city ||
        !orderData.phone
      ) {
        alert("Lütfen tüm zorunlu alanları doldurun.");
        submitting = false;
        submitBtn?.removeAttribute("disabled");
        if (submitBtn) submitBtn.textContent = "Siparişi Tamamla";
        return;
      }

      if (payment_method === "card") {
        if (!validateCardFields()) {
          submitting = false;
          submitBtn?.removeAttribute("disabled");
          if (submitBtn) submitBtn.textContent = "Siparişi Tamamla";
          return;
        }
      } else {
        // Kapıda ödeme ise kart alanlarını temizle
        ["card-number", "expiry", "cvv"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
      }

      // Sipariş oluştur
      const result = await api("/orders", {
        method: "POST",
        body: orderData,
        auth: true,
      });

      // Özet için localStorage
      localStorage.setItem(
        "latestOrder",
        JSON.stringify({
          id: result?.id,
          total: result?.total,
          paymentMethod: payment_method,
          date: new Date().toISOString(),
        })
      );

      location.href = "order-confirmation.html";
    } catch (error) {
      console.error("Sipariş hatası:", error);
      alert("Sipariş oluşturulamadı: " + (error?.message || "Bilinmeyen hata"));
    } finally {
      submitting = false;
      submitBtn?.removeAttribute("disabled");
      if (submitBtn) submitBtn.textContent = "Siparişi Tamamla";
    }
  });
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await guardCheckout();
  if (!ok) return;

  await renderOrderSummary();
  wirePaymentMethod();
  wireMasks();
  wireSubmit();
});

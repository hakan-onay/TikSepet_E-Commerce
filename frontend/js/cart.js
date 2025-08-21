"use strict";

/* Bu dosyada API_BASE/ apiMain tekrar TANIMLANMAZ.
   apiMain, main.js tarafından globalde sağlanır ve cart.html'de
   main.js > cart.js sırasıyla yüklendiği için burada hazırdır. */

/* ====== Utils ====== */
function fmtTRY(n) {
  return (Number(n) || 0).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

/* ====== Cart API wrappers (apiMain ile) ====== */
async function fetchCart() {
  // [{id, product_id, quantity, title, price, image_path}]
  return apiMain("/cart", { method: "GET", auth: true });
}

async function updateCartItem(id, quantity) {
  return apiMain(`/cart/${id}`, {
    method: "PUT",
    body: { quantity },
    auth: true,
  });
}

async function removeCartItem(id) {
  return apiMain(`/cart/${id}`, { method: "DELETE", auth: true });
}

/* ====== Render ====== */
async function renderCart() {
  const container = document.getElementById("cart-items");
  const empty = document.getElementById("cart-empty");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  container.innerHTML = "";

  const token = localStorage.getItem("tiksepet_token");
  if (!token) {
    empty.style.display = "block";
    empty.textContent = "Sepetinizi görmek için giriş yapın.";
    totalEl.style.display = "none";
    checkoutBtn.style.display = "none";
    return;
  }

  let rows = [];
  try {
    rows = await fetchCart();
  } catch (e) {
    empty.style.display = "block";
    empty.textContent = "Sepet alınamadı.";
    totalEl.style.display = "none";
    checkoutBtn.style.display = "none";
    return;
  }

  if (!rows.length) {
    empty.style.display = "block";
    totalEl.style.display = "none";
    checkoutBtn.style.display = "none";
    return;
  }

  empty.style.display = "none";
  totalEl.style.display = "block";
  checkoutBtn.style.display = "inline-block";

  for (const item of rows) {
    const id = String(item.id); // cart_item id
    const price = Number(item.price) || 0;
    const qty = parseInt(item.quantity || 1, 10);
    const name = item.title || "Ürün";
    const image = item.image_path
      ? `http://localhost:5000${item.image_path.startsWith("/") ? "" : "/"}${
          item.image_path
        }`
      : "assets/images/placeholders/product.png";

    const el = document.createElement("div");
    el.className = "cart-item";
    el.setAttribute("data-id", id);
    el.setAttribute("data-price", String(price));
    el.innerHTML = `
      <img src="${image}" alt="${name}" />
      <div class="cart-item-info">
        <div class="cart-item-title">${name}</div>
        <div class="cart-item-price">${fmtTRY(price)}</div>
        <div class="cart-item-quantity">
          <button class="qty-btn decrease" type="button">-</button>
          <span class="item-qty">${qty}</span>
          <button class="qty-btn increase" type="button">+</button>
        </div>
      </div>
      <button class="cart-item-remove" type="button">Sil</button>
    `;
    container.appendChild(el);
  }

  wireItemEvents();
  updateCartTotal();
}

function updateCartTotal() {
  const items = Array.from(document.querySelectorAll(".cart-item"));
  let total = 0;
  for (const it of items) {
    const price = Number(it.getAttribute("data-price") || "0");
    const qty = parseInt(it.querySelector(".item-qty").textContent || "0", 10);
    total += price * qty;
  }
  document.getElementById("cart-total").textContent = `Toplam: ${fmtTRY(
    total
  )}`;

  const empty = document.getElementById("cart-empty");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  if (items.length === 0) {
    empty.style.display = "block";
    totalEl.style.display = "none";
    checkoutBtn.style.display = "none";
  } else {
    empty.style.display = "none";
    totalEl.style.display = "block";
    checkoutBtn.style.display = "inline-block";
  }
}

function wireItemEvents() {
  // Arttır
  document.querySelectorAll(".cart-item .increase").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const wrap = e.currentTarget.closest(".cart-item");
      const id = wrap.getAttribute("data-id");
      const qtyEl = wrap.querySelector(".item-qty");
      const qty = parseInt(qtyEl.textContent, 10) + 1;
      try {
        await updateCartItem(id, qty);
        qtyEl.textContent = qty;
        updateCartTotal();
        // Rozeti güncellemesi için global event
        window.dispatchEvent(new Event("cart-changed"));
      } catch (err) {
        alert(err.message || "Güncellenemedi");
      }
    });
  });

  // Azalt
  document.querySelectorAll(".cart-item .decrease").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const wrap = e.currentTarget.closest(".cart-item");
      const id = wrap.getAttribute("data-id");
      const qtyEl = wrap.querySelector(".item-qty");
      const cur = parseInt(qtyEl.textContent, 10);
      if (cur > 1) {
        const qty = cur - 1;
        try {
          await updateCartItem(id, qty);
          qtyEl.textContent = qty;
          updateCartTotal();
          window.dispatchEvent(new Event("cart-changed"));
        } catch (err) {
          alert(err.message || "Güncellenemedi");
        }
      }
    });
  });

  // Sil
  document.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const wrap = e.currentTarget.closest(".cart-item");
      const id = wrap.getAttribute("data-id");
      try {
        await removeCartItem(id);
        wrap.remove();
        updateCartTotal();
        window.dispatchEvent(new Event("cart-changed"));
      } catch (err) {
        alert(err.message || "Silinemedi");
      }
    });
  });
}

function wireCheckout() {
  const btn = document.getElementById("checkout-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  wireCheckout();
});

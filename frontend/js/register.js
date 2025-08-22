// js/register.js (module)
import { api } from "./api.js";
import { setAuth } from "./auth.js";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Backend kapalıyken yerel kayıt
function localFallbackRegister({ name, email, password }) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  if (users.some((u) => u.email === email)) {
    throw new Error("Bu e-posta ile zaten bir hesap var.");
  }
  const newUser = {
    id: Date.now(),
    name,
    email,
    password, // Demo amaçlı düz metin
    role: "user",
  };
  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  const token = "local_" + Math.random().toString(36).slice(2);
  setAuth({ user: newUser, token });
}

function redirectAfterRegister() {
  const params = new URLSearchParams(location.search);
  const ret = params.get("return");
  location.href = ret || "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const password = document.getElementById("password")?.value.trim();
    const password2 = document.getElementById("password2")?.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!name || !email || !password || !password2) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
    if (!validateEmail(email)) {
      alert("Geçerli bir e-posta girin.");
      return;
    }
    if (password.length < 6) {
      alert("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== password2) {
      alert("Şifreler eşleşmiyor.");
      return;
    }

    submitBtn?.setAttribute("disabled", "true");

    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: { name, email, password },
      });

      if (!data?.token || !data?.user) {
        throw new Error("Sunucu beklenen formatta yanıt vermedi.");
      }

      setAuth({ user: data.user, token: data.token });
      window.updateAccountMenu?.();
      redirectAfterRegister();
      return;
    } catch (err) {
      // Sadece ağ hatasında yerel fallback dene
      const isNetworkError =
        err instanceof TypeError ||
        ("" + err.message).includes("Failed to fetch");

      if (isNetworkError) {
        try {
          localFallbackRegister({ name, email, password });
          window.updateAccountMenu?.();
          redirectAfterRegister();
          return;
        } catch (localErr) {
          alert(localErr.message || "Yerel kayıt başarısız.");
        }
      } else {
        alert(err.message || "Kayıt başarısız.");
      }
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
});

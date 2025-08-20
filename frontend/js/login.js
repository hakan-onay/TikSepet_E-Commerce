// js/login.js (module)
import { api } from "./api.js";
import { setAuth, getToken, getUser } from "./auth.js";

function redirectAfterLogin() {
  const params = new URLSearchParams(location.search);
  const ret = params.get("return");

  const u = getUser();
  if (!ret && u?.role === "admin") {
    location.href = "admin.html";
    return;
  }
  location.href = ret || "index.html";
}

function localFallbackLogin(email, password) {
  try {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const found = users.find(
      (u) => u.email === email && u.password === password
    );
    if (!found) return false;

    const user = {
      id: found.id || Date.now(),
      name: found.name || email.split("@")[0],
      email,
      role: found.role || "user",
    };
    const token = "local_" + Math.random().toString(36).slice(2);
    setAuth({ user, token });

    // Menü hemen güncellensin (redirect öncesi)
    window.updateAccountMenu?.();
    return true;
  } catch {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Token varsa: SADECE geçerliyse yönlendir
  if (getToken()) {
    (async () => {
      try {
        const me = await api("/auth/me", { auth: true });
        setAuth({ user: me });
        window.updateAccountMenu?.();
        redirectAfterLogin();
      } catch {
        localStorage.removeItem("tiksepet_token");
        localStorage.removeItem("tiksepet_user");
        window.updateAccountMenu?.();
      }
    })();
  }

  const form = document.getElementById("login-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Lütfen e-posta ve şifre girin.");
      return;
    }

    submitBtn?.setAttribute("disabled", "true");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (!data?.token || !data?.user) throw new Error("Eksik yanıt");

      setAuth({ user: data.user, token: data.token });

      // Menü hemen güncellensin (redirect öncesi)
      window.updateAccountMenu?.();

      redirectAfterLogin();
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        ("" + err.message).includes("Failed to fetch");

      if (!isNetworkError) {
        alert(err.message || "Giriş başarısız.");
        submitBtn?.removeAttribute("disabled");
        return;
      }

      const ok = localFallbackLogin(email, password);
      if (!ok) {
        alert("Sunucuya ulaşılamıyor ve yerel giriş başarısız.");
        submitBtn?.removeAttribute("disabled");
        return;
      }
      redirectAfterLogin();
    } finally {
      // Eğer redirect olmadıysa buton kilitli kalmasın
      submitBtn?.removeAttribute("disabled");
    }
  });
});

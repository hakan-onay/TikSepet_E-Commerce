// js/api.js
export const API_BASE = "http://localhost:5000/api"; // ör: Express/.NET backend

/**
 * Küçük ama güçlü fetch wrapper'ı
 * - JSON body ise Content-Type ayarlar
 * - FormData ise Content-Type'ı fetch belirler
 * - auth:true verilirse geçerli token yoksa hata fırlatır (Bearer null gitmez)
 * - Hata gövdesinde message/detail varsa bunları kullanıcıya döndürür
 */
export async function api(
  path,
  { method = "GET", body, auth = false, headers = {} } = {}
) {
  const h = { ...headers, Accept: "application/json" };

  // Body hazırlama
  let finalBody = body;
  const isFormData = body instanceof FormData;
  if (body && !isFormData) {
    h["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  // Yetkilendirme başlığı
  const token = localStorage.getItem("tiksepet_token");
  if (auth) {
    if (!token) {
      // guard olarak çalışsın; "Bearer null" asla gitmesin
      throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");
    }
    h.Authorization = `Bearer ${token}`;
  } else if (token) {
    // auth:false olsa bile varsa ekleyebiliriz (opsiyonel kolaylık)
    h.Authorization = `Bearer ${token}`;
  }

  // İstek
  const res = await fetch(API_BASE + path, {
    method,
    headers: h,
    body: finalBody,
  });

  // Yanıtı güvenle parse et
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // HTML/text vs. gelirse sessiz geç
  }

  // Hata yükselt
  if (!res.ok) {
    const msg =
      data?.message ||
      data?.detail ||
      (typeof text === "string" && text.trim()) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

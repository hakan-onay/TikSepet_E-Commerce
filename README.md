# TikSepet – E-Ticaret Projesi

TikSepet; **Node.js (Express)** ve **MySQL** kullanan modern bir e-ticaret uygulamasıdır.  
Özellikler: kullanıcı/auth yönetimi, ürün kataloğu, kategori/arama filtreleri, sepet, sipariş akışı ve **admin paneli**.

> ⚠️ **Güvenlik Notu:** Kurulumdan sonra `.env` dosyasındaki `JWT_SECRET` değerini **güçlü** bir anahtarla değiştirin ve varsayılan admin şifresini mutlaka güncelleyin.

---

## 🚀 Özellikler

- **Kullanıcı Yönetimi:** Kayıt, giriş, profil, şifre değiştirme
- **Admin Paneli:** Ürün ve sipariş yönetimi
- **Ürün Kataloğu:** Kategoriye göre filtreleme, arama, sıralama
- **Sepet:** Gerçek zamanlı sepet işlemleri
- **Sipariş:** Sipariş oluşturma ve durum takibi
- **Tema:** Açık / Koyu tema
- **Responsive:** Mobil uyumlu arayüz

---

## 🧱 Teknoloji Yığını

- **Backend:** Node.js, Express, MySQL2, JWT, Multer
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Veritabanı:** MySQL 5.7+ (öneri: MySQL 8)
- **Araçlar:** Nodemon, http-server / Live Server

---

## 📋 Ön Koşullar

- **Node.js** v14+ (öneri: LTS v18+)
- **MySQL** v5.7+
- **npm** veya **yarn**

---

## 📁 Proje Yapısı

```
tiksepet/
├── backend/
│   ├── node_modules/
│   ├── src/
│   │   ├── config/          # DB, CORS, vb.
│   │   ├── middlewares/     # auth, isAdmin
│   │   ├── routes/          # auth, products, cart, orders, admin.*
│   │   ├── utils/           # yardımcı fonksiyonlar
│   │   ├── app.js           # Express app
│   │   └── uploads/         # ürün görselleri (Multer)
│   ├── scripts/             # seed:admin vb.
│   ├── package.json
│   ├── db.sql
│   └── .env
├── frontend/
│   ├── css/
│   ├── js/
│   ├── assets/
│   ├── *.html
└── └── ...

```

---

## 🗄️ Veritabanı

Projede aşağıdaki tablolar bulunur:

- `users` (kullanıcılar)
- `categories` (kategoriler)
- `products` (ürünler)
- `carts` (sepetler)
- `cart_items` (sepet öğeleri)
- `orders` (siparişler)
- `order_items` (sipariş öğeleri)

**Kurulum:**

```bash
mysql -u root -p
```

```sql
CREATE DATABASE tiksepet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tiksepet;
```

```bash
mysql -u root -p tiksepet < database.sql
```

---

## 🔧 Kurulum Adımları

### 1) Backend

```bash
cd backend
npm install
```

`.env` dosyasını oluştur:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=tiksepet
JWT_SECRET=your_jwt_secret_key
PORT=5000
CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500
```

**Uploads** klasörü yoksa oluştur:

```bash
mkdir -p uploads
```

Admin kullanıcısı seed et:

```bash
npm run seed:admin
```

Geliştirme sunucusu:

```bash
npm run dev
```

> Örnek `package.json` scriptleri:
>
> ```json
> {
>   "scripts": {
>     "dev": "nodemon src/app.js",
>     "start": "node src/app.js",
>     "seed:admin": "node scripts/seedAdmin.js"
>   }
> }
> ```

### 2) Frontend

Basit servis için:

```bash
# frontend dizininde
npx http-server -p 5500
```

veya VSCode **Live Server** kullanabilirsiniz.

---

## 🔌 API Uç Noktaları

### Kimlik Doğrulama

- `POST /api/auth/register` – Kayıt
- `POST /api/auth/login` – Giriş
- `GET /api/auth/me` – Mevcut kullanıcı
- `PUT /api/auth/change-password` – Şifre değiştir

### Ürünler

- `GET /api/public/products` – (Genel) Ürün listele
- `GET /api/admin/products` – (Admin) Ürün listele
- `POST /api/admin/products` – Ürün ekle
- `PUT /api/admin/products/:id` – Ürün güncelle
- `DELETE /api/admin/products/:id` – Ürün sil

### Sepet

- `GET /api/cart` – Sepeti getir
- `POST /api/cart` – Sepete ürün ekle
- `PUT /api/cart/:id` – Sepet öğesini güncelle
- `DELETE /api/cart/:id` – Sepet öğesini sil

### Siparişler

- `POST /api/orders` – Sipariş oluştur
- `GET /api/orders/my` – Kullanıcının siparişleri
- `GET /api/admin/orders` – (Admin) Sipariş listele
- `PUT /api/admin/orders/:id/status` – (Admin) Durum güncelle

---

## 👨‍💼 Varsayılan Admin

- **Email:** `admin@tiksepet.local`
- **Şifre:** `admin123`

> ⚠️ Giriş yaptıktan sonra **hemen şifreyi değiştirin**.

---

## 🚦 Kullanım

1. Frontend’i çalıştırın → `http://localhost:5500`
2. Backend’i çalıştırın → `http://localhost:5000`
3. Tarayıcıdan `http://localhost:5500` adresine gidin
4. Yeni kullanıcı oluşturun veya admin ile giriş yapın
5. Admin paneli için `http://localhost:5500/admin.html`

---

## 🛠️ Geliştirme & Faydalı Komutlar

### Yeni Bağımlılık

```bash
cd backend
npm install <paket-adi>
```

### Veritabanı Yedekleme

```bash
mysqldump -u root -p tiksepet > backup.sql
```

### Geri Yükleme

```bash
mysql -u root -p tiksepet < backup.sql
```

---

## ❗ Sorun Giderme

**“Cannot connect to MySQL”**

- MySQL servisinin çalıştığını doğrulayın.
- `.env` veritabanı bilgilerini kontrol edin.
- `DB_HOST/USER/PASS/NAME` değerlerini doğru girin.

**“JWT Secret” Hatası**

- `.env` içinde `JWT_SECRET` tanımlı mı kontrol edin.

**“uploads” İzinleri**

- `backend/uploads` klasörünü oluşturun.
- Yazma izni verin (Linux): `chmod -R 755 uploads`

**CORS Hatası**

- Frontend ve backend portlarını `.env`’deki `CORS_ORIGIN` ile eşleştirin.
- Gerekirse birden çok origin virgülle ekleyin.

**FK (Foreign Key) Silme Hataları**

- Ürün silmeden önce ilişkili `order_items` / `cart_items` kayıtlarını yönetmelisiniz.
- Uygun `ON DELETE` stratejisi veya soft delete tercih edin.

---

## 📝 Lisans

Bu proje **MIT** lisansı ile lisanslanmıştır.

---

## 🤝 Katkı

1. Fork’la
2. Feature branch aç: `git checkout -b feature/amazingFeature`
3. Commit: `git commit -m "Add some amazingFeature"`
4. Push: `git push origin feature/amazingFeature`
5. Pull Request oluştur

---

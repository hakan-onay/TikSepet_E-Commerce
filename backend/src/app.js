// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adminProductsRoutes = require("./routes/admin.products.routes");
const adminOrdersRoutes = require("./routes/admin.orders.routes");

// KAMU (catalog) ve KULLANICI uçları
const productsPublicRoutes = require("./routes/products.public.routes");
const ordersRoutes = require("./routes/orders.routes"); // GET /orders/my vb.
const cartRoutes = require("./routes/cart.routes");

const app = express();

// Güvenlik (uploads'a dış kaynaktan erişim için policy açıldı)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// JSON
app.use(express.json());

// CORS
const origins = (
  process.env.CORS_ORIGIN || "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

// Loglama
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// Statik: projenin kökünü ve uploads'ı servis et
const webRoot = path.join(__dirname, "..", "..");
app.use(express.static(webRoot)); // ihtiyari (frontend’i 5000’den de serve etmek istersen)
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // ürün görselleri

// API mount — /api prefix
app.use("/api/auth", authRoutes);

// ADMIN uçları
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);

// PUBLIC/KULLANICI uçları
app.use("/api/public/products", productsPublicRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/cart", cartRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Start
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

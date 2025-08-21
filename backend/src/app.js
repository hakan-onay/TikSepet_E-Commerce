require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adminProductsRoutes = require("./routes/admin.products.routes");
const adminOrdersRoutes = require("./routes/admin.orders.routes");
const productsPublicRoutes = require("./routes/products.public.routes");
const ordersRoutes = require("./routes/orders.routes");
const cartRoutes = require("./routes/cart.routes");

const app = express();

// Güvenlik + loglama
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // uploads için
  })
);
app.use(express.json());

// CORS (env yoksa fallback)
const origins = (
  process.env.CORS_ORIGIN || "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// Statik servisler
const webRoot = path.join(__dirname, "..", "..");
app.use(express.static(webRoot));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API mount'lar — ***/api prefix***
app.use("/api/auth", authRoutes);
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/admin/orders", adminOrdersRoutes); // admin
app.use("/api/public/products", productsPublicRoutes);
app.use("/api/orders", ordersRoutes); // kullanıcı siparişleri
app.use("/api/cart", cartRoutes); // kullanıcı sepeti

// 404
app.use((req, res) => res.status(404).json({ message: "Not found" }));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

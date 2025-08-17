require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adminProductsRoutes = require("./routes/admin.products.routes");
const adminOrdersRoutes = require("./routes/admin.orders.routes");

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({ origin: process.env.CORS_ORIGIN.split(","), credentials: true })
);
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// (İstiyorsan) statik servis – 5000’den HTML açmak için:
const webRoot = path.join(__dirname, "..", "..");
app.use(express.static(webRoot));

// API mount'lar — ***/api prefix***
app.use("/api/auth", authRoutes);
app.use("/api/products", adminProductsRoutes);
app.use("/api/orders", adminOrdersRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Not found" }));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

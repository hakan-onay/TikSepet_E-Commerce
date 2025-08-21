// routes/admin.orders.routes.js
const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");

const router = express.Router();

const validStatuses = ["pending", "paid", "shipped", "delivered", "cancelled"];
const statusTransitions = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** GET /api/admin/orders — Tüm siparişleri listele (opsiyonel status filtresi) */
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const status = (req.query.status || "").trim();
    const params = [];
    const where =
      status && validStatuses.includes(status) ? "WHERE o.status = ?" : "";
    if (where) params.push(status);

    const [rows] = await pool.query(
      `SELECT
         o.id, o.user_id,
         u.name AS user_name, u.email AS user_email,
         o.total, o.payment_method, o.address, o.district, o.city,
         o.postal_code, o.phone, o.status, o.created_at
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC`,
      params
    );

    return res.json(rows);
  } catch (error) {
    console.error("Sipariş listeleme hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/** GET /api/admin/orders/:id — Sipariş detayı */
router.get("/:id", auth, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);

    const [orders] = await pool.query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!orders.length) {
      return res.status(404).json({ message: "Sipariş bulunamadı" });
    }

    const [items] = await pool.query(
      `SELECT oi.*, p.title, p.image_path
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const order = orders[0];
    order.items = items;

    return res.json(order);
  } catch (error) {
    console.error("Sipariş detay hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/** PUT /api/admin/orders/:id/status — Sipariş durumu güncelle */
router.put("/:id/status", auth, isAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body || {};

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Geçersiz durum" });
    }

    const [orders] = await pool.query(
      "SELECT status FROM orders WHERE id = ?",
      [orderId]
    );
    if (!orders.length) {
      return res.status(404).json({ message: "Sipariş bulunamadı" });
    }

    const currentStatus = orders[0].status;

    if (!statusTransitions[currentStatus].includes(status)) {
      return res
        .status(400)
        .json({
          message: `Geçersiz durum geçişi: ${currentStatus} -> ${status}`,
        });
    }

    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      orderId,
    ]);

    return res.json({ message: "Sipariş durumu güncellendi" });
  } catch (error) {
    console.error("Durum güncelleme hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

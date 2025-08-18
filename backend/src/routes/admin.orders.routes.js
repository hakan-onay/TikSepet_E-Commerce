const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");

const router = express.Router();

// Durumlar: DB'de İngilizce key tutulur
const validTargets = ["pending", "paid", "shipped", "delivered", "cancelled"];

const ALLOWED = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/* -------------------------------------------------------
   Sipariş listeleme
--------------------------------------------------------*/
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const status = (req.query.status || "").trim();
    const where = status ? "WHERE o.status = ?" : "";
    const params = status ? [status] : [];

    const [rows] = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        u.name  AS user_name,
        u.email AS user_email,
        o.total AS total_amount,
        o.address, o.district, o.city, o.postal_code, o.phone,
        o.status,
        o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.id DESC
      LIMIT 500
      `,
      params
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/* -------------------------------------------------------
   Sipariş detay
--------------------------------------------------------*/
router.get("/:id", auth, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [[order]] = await pool.query(
      `
      SELECT
        o.id, o.user_id,
        u.name  AS user_name,
        u.email AS user_email,
        o.total AS total_amount,
        o.address, o.district, o.city, o.postal_code, o.phone,
        o.status, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      `,
      [id]
    );
    if (!order) return res.status(404).json({ message: "Sipariş bulunamadı" });

    const [items] = await pool.query(
      `
      SELECT
        oi.product_id,
        p.title,
        oi.quantity,
        oi.unit_price
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      `,
      [id]
    );

    res.json({ ...order, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/* -------------------------------------------------------
   Sipariş durum güncelleme
--------------------------------------------------------*/
router.post("/:id/status", auth, isAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = (req.body?.status || "").trim().toLowerCase();

    if (!validTargets.includes(status)) {
      return res.status(400).json({ message: "Geçersiz durum" });
    }

    const [[o]] = await pool.query("SELECT status FROM orders WHERE id = ?", [
      id,
    ]);
    if (!o) return res.status(404).json({ message: "Sipariş bulunamadı" });

    const allowedNext = ALLOWED[o.status] || [];
    if (!allowedNext.includes(status)) {
      return res
        .status(400)
        .json({ message: `Geçiş izinli değil: ${o.status} → ${status}` });
    }

    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    res.json({ message: "Durum güncellendi" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

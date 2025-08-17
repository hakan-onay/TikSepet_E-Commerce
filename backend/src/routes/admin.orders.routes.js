const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");

const router = express.Router();

/** GET /orders?status= */
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const status = (req.query.status || "").trim();
    const where = status ? "WHERE o.status=?" : "";
    const params = status ? [status] : [];

    const [rows] = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        u.name AS user_name,
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

/** POST /orders/:id/status { status } */
router.post("/:id/status", auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ["pending", "paid", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Geçersiz durum" });
    }
    const [r] = await pool.query("UPDATE orders SET status=? WHERE id=?", [status, req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Sipariş bulunamadı" });
    res.json({ message: "Durum güncellendi" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

// routes/orders.routes.js
const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/auth");

const router = express.Router();

/** Kullanıcının sepet kalemlerini okur */
async function readCartItemsForUser(userId, connOrPool) {
  const q = `
    SELECT ci.product_id, ci.quantity, p.price, p.stock
    FROM cart_items ci
    JOIN carts c ON c.id = ci.cart_id
    JOIN products p ON p.id = ci.product_id
    WHERE c.user_id = ?`;
  const executor = connOrPool || pool;
  const [rows] = await executor.query(q, [userId]);
  return rows.map((r) => ({
    product_id: Number(r.product_id),
    quantity: Number(r.quantity),
    price: Number(r.price),
    stock: Number(r.stock),
  }));
}

/** POST /api/orders — Sipariş oluşturma */
router.post("/", auth, async (req, res) => {
  try {
    const { address, district, city, postal_code, phone, payment_method } =
      req.body || {};

    // Payment method kontrolü
    const pm = ["card", "cod"].includes(payment_method)
      ? payment_method
      : "cod";

    // Zorunlu alan kontrolü
    if (!address || !district || !city || !phone) {
      return res
        .status(400)
        .json({ message: "Lütfen tüm zorunlu alanları doldurun" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Sepetten ürünleri al
      const cartRows = await readCartItemsForUser(req.user.id, conn);
      if (!cartRows.length) {
        await conn.rollback();
        return res.status(400).json({ message: "Sepet boş olamaz" });
      }

      // Ürün stok kontrolü ve toplam hesaplama
      let total = 0;
      const itemRows = [];

      for (const item of cartRows) {
        const [product] = await conn.query(
          "SELECT id, price, stock FROM products WHERE id = ?",
          [item.product_id]
        );

        if (!product.length) {
          await conn.rollback();
          return res
            .status(400)
            .json({ message: `Ürün bulunamadı: ${item.product_id}` });
        }

        if (product[0].stock < item.quantity) {
          await conn.rollback();
          return res
            .status(400)
            .json({ message: `Stok yetersiz: ${item.product_id}` });
        }

        total += Number(product[0].price) * item.quantity;
        itemRows.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: Number(product[0].price),
        });
      }

      // Sipariş oluştur
      const [orderResult] = await conn.query(
        `INSERT INTO orders
         (user_id, total, payment_method, address, district, city, postal_code, phone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          req.user.id,
          total,
          pm,
          address,
          district,
          city,
          postal_code || null,
          phone,
        ]
      );

      const orderId = orderResult.insertId;

      // Sipariş öğelerini ekle + stok düş
      for (const item of itemRows) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.unit_price]
        );

        await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [
          item.quantity,
          item.product_id,
        ]);
      }

      // Sepeti temizle
      await conn.query(
        `DELETE ci FROM cart_items ci
         JOIN carts c ON c.id = ci.cart_id
         WHERE c.user_id = ?`,
        [req.user.id]
      );

      await conn.commit();

      return res.status(201).json({
        id: orderId,
        total,
        status: "pending",
        message: "Siparişiniz başarıyla oluşturuldu",
      });
    } catch (error) {
      await conn.rollback();
      console.error("[POST /orders] TX error:", {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        message: error.message,
      });
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("[POST /orders] error:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      detail: error?.sqlMessage || error?.message || "Bilinmeyen hata",
    });
  }
});

/** GET /api/orders/my — Kullanıcının siparişleri */
router.get("/my", auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT id, total, payment_method, address, district, city,
              postal_code, phone, status, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    if (!orders.length) return res.json([]);

    // Sipariş kalemleri
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.product_id, oi.quantity, oi.unit_price,
                p.title, p.image_path
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json(orders);
  } catch (error) {
    console.error("[GET /orders/my] error:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

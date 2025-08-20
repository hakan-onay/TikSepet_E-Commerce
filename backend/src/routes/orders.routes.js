const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/auth");

const router = express.Router();

/**
 * POST /api/orders
 * Body: { address, district, city, postal_code, phone, items: [{product_id, quantity}] }
 */
router.post("/", auth, async (req, res) => {
  try {
    const { address, district, city, postal_code, phone, items } =
      req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Sepet boş olamaz" });
    }

    // ürün id'leri al
    const pids = items.map((i) => Number(i.product_id)).filter(Boolean);
    if (!pids.length)
      return res.status(400).json({ message: "Geçersiz ürün listesi" });

    // ürün bilgilerini DB'den çek
    const [rows] = await pool.query(
      `SELECT id, price, stock FROM products WHERE id IN (${pids
        .map(() => "?")
        .join(",")})`,
      pids
    );

    // Map: id -> { price, stock }
    const productMap = new Map(
      rows.map((r) => [
        Number(r.id),
        { price: Number(r.price), stock: Number(r.stock) },
      ])
    );

    let total = 0;
    const itemRows = [];
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Math.max(1, parseInt(it.quantity || 1, 10));
      const product = productMap.get(pid);

      if (!product)
        return res.status(400).json({ message: `Ürün bulunamadı: ${pid}` });
      if (product.stock < qty) {
        return res.status(400).json({ message: `Stok yetersiz: ${pid}` });
      }

      total += product.price * qty;
      itemRows.push({
        product_id: pid,
        quantity: qty,
        unit_price: product.price,
      });
    }

    // Transaction başlat
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // siparişi ekle
      const [ins] = await conn.query(
        `INSERT INTO orders (user_id, total, address, district, city, postal_code, phone, status)
         VALUES (?,?,?,?,?,?,?, 'pending')`,
        [
          req.user.id,
          total,
          address || null,
          district || null,
          city || null,
          postal_code || null,
          phone || null,
        ]
      );
      const orderId = ins.insertId;

      // sipariş kalemlerini ekle
      const values = itemRows.flatMap((it) => [
        orderId,
        it.product_id,
        it.quantity,
        it.unit_price,
      ]);
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ${itemRows.map(() => "(?,?,?,?)").join(",")}`,
        values
      );

      // stokları düş
      for (const it of itemRows) {
        await conn.query(
          "UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?",
          [it.quantity, it.product_id]
        );
      }

      await conn.commit();
      return res.status(201).json({ id: orderId, total, status: "pending" });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/** GET /api/orders/my  -> kullanıcının kendi siparişleri */
router.get("/my", auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT id, total, address, district, city, postal_code, phone, status, created_at
       FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 200`,
      [req.user.id]
    );

    if (!orders.length) return res.json([]);

    const ids = orders.map((o) => o.id);
    const [items] = await pool.query(
      `SELECT oi.order_id, oi.product_id, oi.quantity, oi.unit_price, p.title, p.image_path
   FROM order_items oi
   LEFT JOIN products p ON p.id = oi.product_id
   WHERE oi.order_id IN (${ids.map(() => "?").join(",")})`,
      ids
    );

    const byOrder = new Map(orders.map((o) => [o.id, { ...o, items: [] }]));
    for (const it of items) {
      byOrder.get(it.order_id)?.items.push(it);
    }

    res.json(Array.from(byOrder.values()));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

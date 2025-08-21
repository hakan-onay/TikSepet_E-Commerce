const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const pool = require("../config/db");

/**
 * GET /api/cart
 * Kullanıcının sepetini getirir
 * Dönen alanlar: id (cart_item id), product_id, quantity, title, price, image_path
 */
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        p.title,
        p.price,
        p.image_path
      FROM cart_items ci
      JOIN carts c      ON c.id = ci.cart_id
      JOIN products p   ON p.id = ci.product_id
      WHERE c.user_id = ?
      ORDER BY ci.id DESC
      `,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[GET /cart] error:", err);
    res.status(500).json({ message: "Sepet alınamadı" });
  }
});

/**
 * POST /api/cart
 * Body: { product_id, quantity }
 * Kullanıcının sepetine ekler (varsa miktarı arttırır)
 */
router.post("/", auth, async (req, res) => {
  try {
    const product_id = Number(req.body?.product_id);
    const quantity = Math.max(1, parseInt(req.body?.quantity || 1, 10));
    if (!product_id)
      return res.status(400).json({ message: "product_id gerekli" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Kullanıcının sepeti var mı?
      const [carts] = await conn.query(
        "SELECT id FROM carts WHERE user_id = ? LIMIT 1",
        [req.user.id]
      );

      let cartId;
      if (carts.length) {
        cartId = carts[0].id;
      } else {
        const [insC] = await conn.query(
          "INSERT INTO carts (user_id) VALUES (?)",
          [req.user.id]
        );
        cartId = insC.insertId;
      }

      // Cart item var mı?
      const [items] = await conn.query(
        "SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1",
        [cartId, product_id]
      );

      if (items.length) {
        await conn.query(
          "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
          [quantity, items[0].id]
        );
      } else {
        await conn.query(
          "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?,?,?)",
          [cartId, product_id, quantity]
        );
      }

      await conn.commit();
      res.json({ message: "Ürün sepete eklendi" });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("[POST /cart] error:", err);
    res.status(500).json({ message: "Sepete eklenemedi" });
  }
});

/**
 * PUT /api/cart/:id
 * Body: { quantity }
 * Sepet kalemi miktarı günceller
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quantity = Math.max(1, parseInt(req.body?.quantity || 1, 10));
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // Kullanıcıya ait olduğundan emin ol
    const [chk] = await pool.query(
      `SELECT ci.id
         FROM cart_items ci
         JOIN carts c ON c.id = ci.cart_id
        WHERE ci.id=? AND c.user_id=?`,
      [id, req.user.id]
    );
    if (!chk.length)
      return res.status(404).json({ message: "Kayıt bulunamadı" });

    await pool.query("UPDATE cart_items SET quantity=? WHERE id=?", [
      quantity,
      id,
    ]);
    res.json({ message: "Miktar güncellendi" });
  } catch (err) {
    console.error("[PUT /cart/:id] error:", err);
    res.status(500).json({ message: "Güncelleme hatası" });
  }
});

/**
 * DELETE /api/cart/:id
 * Sepetten kalemi siler
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // Kullanıcıya ait olduğundan emin ol
    const [chk] = await pool.query(
      `SELECT ci.id
         FROM cart_items ci
         JOIN carts c ON c.id = ci.cart_id
        WHERE ci.id=? AND c.user_id=?`,
      [id, req.user.id]
    );
    if (!chk.length)
      return res.status(404).json({ message: "Kayıt bulunamadı" });

    await pool.query("DELETE FROM cart_items WHERE id=?", [id]);
    res.json({ message: "Ürün sepetten silindi" });
  } catch (err) {
    console.error("[DELETE /cart/:id] error:", err);
    res.status(500).json({ message: "Silme hatası" });
  }
});

/**
 * DELETE /api/cart
 * Kullanıcının sepetini komple boşaltır
 */
router.delete("/", auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE ci FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE c.user_id = ?`,
      [req.user.id]
    );
    res.json({ message: "Sepet temizlendi" });
  } catch (err) {
    console.error("[DELETE /cart] error:", err);
    res.status(500).json({ message: "Sepet temizlenemedi" });
  }
});

module.exports = router;

// backend/src/routes/products.public.routes.js
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/**
 * GET /api/public/products
 * query: q (search), category, page, limit
 */
router.get("/", async (req, res) => {
  try {
    const { q = "", category = "", page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = [];
    const params = [];

    if (q.trim()) {
      where.push("(p.title LIKE ? OR p.description LIKE ?)");
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    if (category.trim()) {
      where.push("c.name = ?");
      params.push(category.trim());
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // toplam kaç ürün var?
    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSQL}
      `,
      params
    );

    // sayfalanmış ürünleri al
    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.description, p.price, p.image_path, 
             p.stock, p.rating, c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSQL}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, Number(limit), offset]
    );

    res.json({
      items: rows,
      page: Number(page),
      limit: Number(limit),
      total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

const express = require("express");
const Joi = require("joi");
const pool = require("../config/db");
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const { ensureCategoryIdByName } = require("../utils/category");

const router = express.Router();

/** GET /products?q=&category= */
router.get("/", auth, isAdmin, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const categoryName = (req.query.category || "").trim();

    let where = [];
    let params = [];

    if (q) {
      where.push("(p.title LIKE ? OR p.description LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (categoryName) {
      where.push("c.name = ?");
      params.push(categoryName);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.description, p.price, p.image_url,
             p.stock, p.rating, c.name AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY p.id DESC
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

const productSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().allow(null, ""),
  price: Joi.number().precision(2).min(0).required(),
  image_url: Joi.string().uri().allow(null, ""),
  stock: Joi.number().integer().min(0).default(0),
  rating: Joi.number().min(0).max(5).precision(1).default(0),
  category: Joi.string().allow(null, ""),
});

/** POST /products */
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const { value, error } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const category_id = await ensureCategoryIdByName(value.category);
    const [r] = await pool.query(
      "INSERT INTO products (title, description, price, image_url, stock, rating, category_id) VALUES (?,?,?,?,?,?,?)",
      [
        value.title,
        value.description || null,
        value.price,
        value.image_url || null,
        value.stock ?? 0,
        value.rating ?? 0,
        category_id,
      ]
    );
    res.status(201).json({ message: "Ürün eklendi", id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/** PUT /products/:id */
router.put("/:id", auth, isAdmin, async (req, res) => {
  try {
    const { value, error } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const category_id = await ensureCategoryIdByName(value.category);
    const [r] = await pool.query(
      "UPDATE products SET title=?, description=?, price=?, image_url=?, stock=?, rating=?, category_id=? WHERE id=?",
      [
        value.title,
        value.description || null,
        value.price,
        value.image_url || null,
        value.stock ?? 0,
        value.rating ?? 0,
        category_id,
        req.params.id,
      ]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "Ürün bulunamadı" });
    res.json({ message: "Ürün güncellendi" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/** DELETE /products/:id */
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    const [r] = await pool.query("DELETE FROM products WHERE id=?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Ürün bulunamadı" });
    res.json({ message: "Ürün silindi" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

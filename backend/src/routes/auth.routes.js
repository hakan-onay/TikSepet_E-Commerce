// routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const pool = require("../config/db");
const auth = require("../middlewares/auth");

const router = express.Router();

/* ======= Schemas ======= */
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow("", null),
  address: Joi.string().allow("", null),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string().required(),
});

const changePassSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required(),
});

/* ======= Routes ======= */

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { value, error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const [exists] = await pool.query("SELECT id FROM users WHERE email=?", [
      value.email,
    ]);
    if (exists.length)
      return res.status(409).json({ message: "Email zaten kayıtlı" });

    const hash = await bcrypt.hash(value.password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone, address) VALUES (?,?,?,?,?)",
      [
        value.name,
        value.email,
        hash,
        value.phone || null,
        value.address || null,
      ]
    );

    // Yeni kullanıcıyı çek
    const userId = result.insertId;
    const [rows] = await pool.query(
      "SELECT id, name, email, role, phone, address FROM users WHERE id=?",
      [userId]
    );
    const user = rows[0];

    // Token üret
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // login ile birebir aynı formatta dön
    return res.status(201).json({
      token,
      user,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [
      value.email,
    ]);
    if (!rows.length)
      return res.status(401).json({ message: "Email veya şifre hatalı" });

    const user = rows[0];
    const ok = await bcrypt.compare(value.password, user.password_hash);
    if (!ok)
      return res.status(401).json({ message: "Email veya şifre hatalı" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, phone, address FROM users WHERE id=?",
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", auth, async (req, res) => {
  try {
    const { value, error } = changePassSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const userId = req.user.id;
    const [rows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id=?",
      [userId]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const user = rows[0];
    const ok = await bcrypt.compare(value.current_password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Mevcut şifre yanlış" });

    // Aynı şifreye izin verme
    const same = await bcrypt.compare(value.new_password, user.password_hash);
    if (same)
      return res
        .status(400)
        .json({ message: "Yeni şifre eski şifre ile aynı olamaz" });

    const newHash = await bcrypt.hash(value.new_password, 10);
    await pool.query("UPDATE users SET password_hash=? WHERE id=?", [
      newHash,
      userId,
    ]);

    return res.json({ message: "Şifre güncellendi" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

// backend/src/routes/products.admin.routes.js
const express = require("express");
const pool = require("../config/db");
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Multer ayarı
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads")); // uploads klasörü
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // benzersiz isim
  }
});
const upload = multer({ storage });

/** POST /api/products (ürün ekleme) */
router.post("/", auth, isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, price, category } = req.body;
    let image = null;

    if (req.file) {
      // Dosya yüklenmişse
      image = "/uploads/" + req.file.filename;
    } else if (req.body.imageUrl) {
      // Eski sistemde URL gönderilirse
      image = req.body.imageUrl;
    }

    const [r] = await pool.query(
      "INSERT INTO products (name, price, category, image) VALUES (?, ?, ?, ?)",
      [name, price, category, image]
    );

    res.json({ message: "Ürün eklendi", id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;

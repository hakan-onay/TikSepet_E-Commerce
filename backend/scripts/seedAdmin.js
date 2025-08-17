require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const email = "admin@tiksepet.local";
  const [ex] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
  if (ex.length) {
    console.log("Admin zaten var.");
    process.exit(0);
  }

  const hash = await bcrypt.hash("admin123", 10);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'admin')",
    ["Admin", email, hash]
  );
  console.log("Admin eklendi:", email, "/ şifre: admin123");
  process.exit(0);
})();

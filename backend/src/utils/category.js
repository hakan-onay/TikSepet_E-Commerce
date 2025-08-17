const pool = require("../config/db");

async function ensureCategoryIdByName(name) {
  if (!name) return null;
  const n = name.trim();
  if (!n) return null;

  const [found] = await pool.query("SELECT id FROM categories WHERE name=?", [n]);
  if (found.length) return found[0].id;

  const [ins] = await pool.query("INSERT INTO categories (name) VALUES (?)", [n]);
  return ins.insertId;
}

module.exports = { ensureCategoryIdByName };

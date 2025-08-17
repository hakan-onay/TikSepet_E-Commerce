const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token gerekli" });

  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: p.id, email: p.email, role: p.role || "user" };
    next();
  } catch {
    return res.status(401).json({ message: "Geçersiz/expired token" });
  }
}

module.exports = auth;

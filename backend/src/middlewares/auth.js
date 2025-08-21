// middlewares/auth.js
const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role || "user",
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Geçersiz/expired token" });
  }
}

module.exports = auth;

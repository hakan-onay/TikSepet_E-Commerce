function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Önce giriş yap" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin gerekli" });
  next();
}
module.exports = isAdmin;

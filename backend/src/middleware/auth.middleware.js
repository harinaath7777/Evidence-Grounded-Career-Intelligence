const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");
const { hashToken } = require("../utils/token");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = bearer || req.cookies?.accessToken;
    if (!token) return res.status(401).json({ message: "Authentication required." });

    if (await TokenBlacklist.exists({ tokenHash: hashToken(token) })) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    req.accessToken = token;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired session. Please sign in again." });
  }
}

module.exports = { requireAuth };
